import type {
  ObservedParameter,
  QaExpectedEvent,
  QaPlan,
  QaPlanStep,
} from '../../src/features/models';
import {
  buildQaScorecard,
  cancelQaStep,
  completeQaStep,
  createConsentCheckpointStep,
  startQaPlanRun,
  startQaStep,
} from '../../src/features/qa/qaContracts';
import { loaderFixture, networkFixture, sessionFixture } from '../helpers';

function parameter(
  name: string,
  value: string | null,
  sensitivity: ObservedParameter['sensitivity'] = 'none',
): ObservedParameter {
  return {
    id: `parameter:${name}`,
    name,
    value,
    sourceType: 'cx-tag-network',
    eventTimestamp: '2026-01-01T00:00:01.000Z',
    eventId: 'event-1',
    origin: 'query-string',
    classification: 'standard',
    sensitivity,
  };
}

function scenario(expected: QaExpectedEvent): QaPlanStep {
  return {
    id: 'step-1',
    name: 'Product view',
    kind: 'scenario',
    expectedEvents: [expected],
    unexpectedEventPolicy: 'warn',
  };
}

function plan(step: QaPlanStep): QaPlan {
  return {
    id: 'plan-1',
    name: 'Commerce QA',
    platformId: 'oracle-infinity',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    steps: [step],
  };
}

describe('QA contracts', () => {
  it('rejects step operations that are outside the active run state', () => {
    const run = startQaPlanRun(
      plan(
        scenario({
          id: 'expected-1',
          name: 'View product',
          matcher: {},
          minCount: 1,
          parameters: [],
        }),
      ),
    );

    expect(() => startQaStep(run, 'missing-step', sessionFixture())).toThrow(
      'not part of this run',
    );
    expect(() => cancelQaStep(run, 'step-1')).toThrow('Only the active QA step');
  });

  it('passes a scenario when event counts and parameter requirements match', () => {
    const expected: QaExpectedEvent = {
      id: 'expected-1',
      name: 'View product',
      matcher: { eventName: '$ViewProduct', wtDl: '0' },
      minCount: 1,
      maxCount: 1,
      parameters: [
        { name: 'wt.pn_sku', presence: 'required', allowEmpty: false, valuePattern: '^[A-Z]+-' },
      ],
    };
    const startSession = sessionFixture();
    const started = startQaStep(startQaPlanRun(plan(scenario(expected))), 'step-1', startSession);
    const parameters = [parameter('wt.ev', '$ViewProduct'), parameter('wt.pn_sku', 'SKU-123')];
    const completed = completeQaStep(
      started,
      'step-1',
      sessionFixture({
        networkObservations: [networkFixture({ parameters, parameterCount: parameters.length })],
        parameters,
      }),
    );

    expect(completed.status).toBe('pass');
    expect(completed.steps[0].expectationResults[0]).toMatchObject({
      status: 'pass',
      matchedEventIds: ['event-1'],
    });
    expect(buildQaScorecard(completed)?.summary).toEqual({
      total: 1,
      passed: 1,
      warnings: 0,
      failed: 0,
      notRun: 0,
    });
  });

  it('fails missing, empty, forbidden, and excess event contract violations', () => {
    const expected: QaExpectedEvent = {
      id: 'expected-1',
      name: 'Purchase',
      matcher: { eventName: '$Purchase' },
      minCount: 1,
      maxCount: 1,
      parameters: [
        { name: 'wt.tx_id', presence: 'required', allowEmpty: false },
        { name: 'raw.email', presence: 'forbidden', allowEmpty: false },
      ],
    };
    const started = startQaStep(
      startQaPlanRun(plan(scenario(expected))),
      'step-1',
      sessionFixture(),
    );
    const first = [
      parameter('wt.ev', '$Purchase'),
      parameter('wt.tx_id', ''),
      parameter('raw.email', 'person@example.test'),
    ];
    const second = first.map((item) => ({ ...item, id: `${item.id}:2`, eventId: 'event-2' }));
    const completed = completeQaStep(
      started,
      'step-1',
      sessionFixture({
        networkObservations: [
          networkFixture({ id: 'event-1', parameters: first }),
          networkFixture({ id: 'event-2', parameters: second }),
        ],
        parameters: [...first, ...second],
      }),
    );

    expect(completed.status).toBe('fail');
    expect(completed.steps[0].findings.map((item) => item.code)).toEqual(
      expect.arrayContaining([
        'expected-event-maximum',
        'contract-empty-parameter',
        'forbidden-parameter',
      ]),
    );
  });

  it('warns when additional collection events do not match the scenario contract', () => {
    const expected: QaExpectedEvent = {
      id: 'expected-1',
      name: 'View product',
      matcher: { eventName: '$ViewProduct' },
      minCount: 1,
      maxCount: 1,
      parameters: [],
    };
    const started = startQaStep(
      startQaPlanRun(plan(scenario(expected))),
      'step-1',
      sessionFixture(),
    );
    const completed = completeQaStep(
      started,
      'step-1',
      sessionFixture({
        networkObservations: [
          networkFixture({ parameters: [parameter('wt.ev', '$ViewProduct')] }),
          networkFixture({
            id: 'event-2',
            parameters: [{ ...parameter('wt.ev', '$Other'), eventId: 'event-2' }],
          }),
        ],
      }),
    );

    expect(completed.status).toBe('warn');
    expect(completed.steps[0].findings).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'unexpected-events' })]),
    );
  });

  it('evaluates configurable consent checkpoints without assuming one universal policy', () => {
    const rejectedStep = createConsentCheckpointStep('rejected');
    rejectedStep.id = 'consent-rejected';
    const rejectedRun = startQaStep(
      startQaPlanRun(plan(rejectedStep)),
      rejectedStep.id,
      sessionFixture(),
    );
    const identifier = parameter('wt.co_f', 'visitor-id', 'identifier');
    const rejectedResult = completeQaStep(
      rejectedRun,
      rejectedStep.id,
      sessionFixture({
        networkObservations: [networkFixture({ parameters: [identifier] })],
        parameters: [identifier],
      }),
    );
    expect(rejectedResult.status).toBe('fail');
    expect(rejectedResult.steps[0].findings.map((item) => item.code)).toEqual(
      expect.arrayContaining(['consent-collection-blocked', 'consent-identifiers-blocked']),
    );

    const acceptedStep = createConsentCheckpointStep('accepted');
    acceptedStep.id = 'consent-accepted';
    const acceptedRun = startQaStep(
      startQaPlanRun(plan(acceptedStep)),
      acceptedStep.id,
      sessionFixture(),
    );
    const acceptedResult = completeQaStep(
      acceptedRun,
      acceptedStep.id,
      sessionFixture({
        loaders: [loaderFixture()],
        networkObservations: [networkFixture({ parameters: [identifier] })],
        parameters: [identifier],
      }),
    );
    expect(acceptedResult.status).toBe('pass');
    expect(acceptedResult.steps[0].consentSnapshot).toMatchObject({
      state: 'accepted',
      collectionEventCount: 1,
      loaderDetected: true,
      identifierParameterNames: ['wt.co_f'],
    });
  });
});
