import { createExportReport, exportReportJson } from '../../src/features/export/exportJson';
import { exportReportMarkdown } from '../../src/features/export/exportMarkdown';
import {
  ExportedDiagnosticReportSchema,
  QaPlanRunSchema,
  type ObservedParameter,
  type QaPlan,
} from '../../src/features/models';
import {
  buildQaScorecard,
  completeQaStep,
  startQaPlanRun,
  startQaStep,
} from '../../src/features/qa/qaContracts';
import { networkFixture, sessionFixture } from '../helpers';

function parameter(
  eventId: string,
  index: number,
  name: string,
  value: string | null,
  sensitivity: ObservedParameter['sensitivity'] = 'none',
): ObservedParameter {
  return {
    id: `${eventId}:parameter:${index}`,
    name,
    value,
    sourceType: 'cx-tag-network',
    eventTimestamp: '2026-01-01T00:00:01.000Z',
    eventId,
    origin: 'query-string',
    classification: 'standard',
    sensitivity,
  };
}

describe('multi-step QA scenario acceptance', () => {
  it('completes pass, warn, and fail steps across navigation and exports all evidence', () => {
    const plan: QaPlan = {
      id: 'acceptance-plan',
      name: 'Synthetic product journey',
      platformId: 'oracle-infinity',
      domain: 'shop.example.test',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      steps: [
        {
          id: 'view-step',
          name: 'View product',
          kind: 'scenario',
          expectedEvents: [
            {
              id: 'view-expectation',
              name: 'Product view event',
              matcher: { eventName: '$ViewProduct', wtDl: '0' },
              minCount: 1,
              maxCount: 1,
              parameters: [
                {
                  name: 'wt.pn_sku',
                  presence: 'required',
                  allowEmpty: false,
                  valuePattern: '^SKU-[0-9]+$',
                },
              ],
            },
          ],
          unexpectedEventPolicy: 'warn',
        },
        {
          id: 'cart-step',
          name: 'Add to cart',
          kind: 'scenario',
          expectedEvents: [
            {
              id: 'cart-expectation',
              name: 'Add-to-cart event',
              matcher: { eventName: '$AddToCart', wtDl: '25' },
              minCount: 1,
              maxCount: 1,
              parameters: [],
            },
          ],
          unexpectedEventPolicy: 'warn',
        },
        {
          id: 'rejected-step',
          name: 'Consent rejected checkpoint',
          kind: 'consent-checkpoint',
          expectedEvents: [],
          unexpectedEventPolicy: 'ignore',
          consent: {
            state: 'rejected',
            collection: 'blocked',
            loader: 'allowed',
            identifiers: 'blocked',
          },
        },
      ],
    };

    const viewParameters = [
      parameter('view-event', 0, 'wt.ev', '$ViewProduct'),
      parameter('view-event', 1, 'wt.pn_sku', 'SKU-1001'),
    ];
    const viewEvent = networkFixture({
      id: 'view-event',
      timestamp: '2026-01-01T00:00:01.000Z',
      wtDl: '0',
      parameters: viewParameters,
      parameterCount: viewParameters.length,
    });
    const cartParameters = [parameter('cart-event', 0, 'wt.ev', '$AddToCart')];
    const cartEvent = networkFixture({
      id: 'cart-event',
      timestamp: '2026-01-01T00:00:02.000Z',
      wtDl: '25',
      eventKind: 'click-event',
      parameters: cartParameters,
      parameterCount: cartParameters.length,
    });
    const unexpectedParameters = [parameter('unexpected-event', 0, 'wt.ev', '$Recommendation')];
    const unexpectedEvent = networkFixture({
      id: 'unexpected-event',
      timestamp: '2026-01-01T00:00:03.000Z',
      wtDl: '25',
      eventKind: 'click-event',
      parameters: unexpectedParameters,
      parameterCount: unexpectedParameters.length,
    });
    const rejectedParameters = [
      parameter('rejected-event', 0, 'wt.co_f', 'synthetic-visitor-id', 'identifier'),
    ];
    const rejectedEvent = networkFixture({
      id: 'rejected-event',
      timestamp: '2026-01-01T00:00:04.000Z',
      parameters: rejectedParameters,
      parameterCount: rejectedParameters.length,
    });

    let run = startQaPlanRun(plan);
    run = startQaStep(run, 'view-step', sessionFixture());
    run = completeQaStep(
      run,
      'view-step',
      sessionFixture({ networkObservations: [viewEvent], parameters: viewParameters }),
    );
    expect(run.steps[0].status).toBe('pass');

    const firstPageSession = sessionFixture({
      networkObservations: [viewEvent],
      parameters: viewParameters,
    });
    run = startQaStep(run, 'cart-step', firstPageSession);
    run = completeQaStep(
      run,
      'cart-step',
      sessionFixture({
        networkObservations: [viewEvent, cartEvent, unexpectedEvent],
        parameters: [...viewParameters, ...cartParameters, ...unexpectedParameters],
      }),
    );
    expect(run.steps[1]).toMatchObject({
      status: 'warn',
      findings: [expect.objectContaining({ code: 'unexpected-events', outcome: 'warn' })],
    });

    run = QaPlanRunSchema.parse(JSON.parse(JSON.stringify(run)));
    const navigatedSession = sessionFixture({
      pageUrl: 'https://shop.example.test/checkout',
      networkObservations: [],
      parameters: [],
    });
    expect(run.steps.map((step) => step.status)).toEqual(['pass', 'warn', 'not-run']);

    run = startQaStep(run, 'rejected-step', navigatedSession);
    run = completeQaStep(
      run,
      'rejected-step',
      sessionFixture({
        pageUrl: navigatedSession.pageUrl,
        networkObservations: [rejectedEvent],
        parameters: rejectedParameters,
      }),
    );

    expect(run.status).toBe('fail');
    expect(run.steps[2]).toMatchObject({
      status: 'fail',
      consentSnapshot: {
        state: 'rejected',
        collectionEventCount: 1,
        identifierParameterNames: ['wt.co_f'],
      },
    });
    expect(run.steps[2].findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining(['consent-collection-blocked', 'consent-identifiers-blocked']),
    );
    expect(buildQaScorecard(run)?.summary).toEqual({
      total: 3,
      passed: 1,
      warnings: 1,
      failed: 1,
      notRun: 0,
    });

    const postNavigationSession = sessionFixture({
      pageUrl: 'https://shop.example.test/confirmation',
      networkObservations: [],
      parameters: [],
    });
    const report = createExportReport(postNavigationSession, '0.5.1', run);
    const jsonReport = JSON.parse(exportReportJson(postNavigationSession, '0.5.1', run));
    const markdownReport = exportReportMarkdown(postNavigationSession, '0.5.1', run);

    expect(ExportedDiagnosticReportSchema.safeParse(report).success).toBe(true);
    expect(report.events.map((event) => event.id)).toEqual([
      'view-event',
      'cart-event',
      'unexpected-event',
      'rejected-event',
    ]);
    expect(jsonReport.qaScorecard).toMatchObject({
      status: 'fail',
      summary: { total: 3, passed: 1, warnings: 1, failed: 1, notRun: 0 },
    });
    expect(markdownReport).toContain('Overall result: **FAIL**');
    expect(markdownReport).toContain('### Step 1: View product - PASS');
    expect(markdownReport).toContain('### Step 2: Add to cart - WARN');
    expect(markdownReport).toContain('### Step 3: Consent rejected checkpoint - FAIL');
  });
});
