import { createExportReport } from '../../src/features/export/exportJson';
import { exportReportMarkdown } from '../../src/features/export/exportMarkdown';
import { ExportedDiagnosticReportSchema } from '../../src/features/models';
import {
  completeQaStep,
  createQaPlan,
  startQaPlanRun,
  startQaStep,
} from '../../src/features/qa/qaContracts';
import { networkFixture, sessionFixture } from '../helpers';

describe('QA report export', () => {
  it('preserves raw values, request metadata, classifications, and null findings', () => {
    const parameters = [
      {
        id: 'standard',
        name: 'wt.ti',
        value: 'Full title',
        sourceType: 'cx-tag-network' as const,
        eventTimestamp: '2026-01-01T00:00:01.000Z',
        eventId: 'event-1',
        origin: 'query-string' as const,
        classification: 'standard' as const,
        sensitivity: 'none' as const,
      },
      {
        id: 'custom',
        name: 'site.section',
        value: null,
        sourceType: 'cx-tag-network' as const,
        eventTimestamp: '2026-01-01T00:00:01.000Z',
        eventId: 'event-1',
        origin: 'query-string' as const,
        classification: 'custom' as const,
        sensitivity: 'none' as const,
      },
    ];
    const event = networkFixture({
      requestUrl: 'https://sample.dc.oracleinfinity.io/dcs.gif?wt.ti=Full%20title',
      accountGuid: 'example-account-guid',
      parameterCount: parameters.length,
      parameters,
    });
    const qaFinding = {
      id: 'commerce:event-1',
      code: 'commerce-test',
      severity: 'medium' as const,
      title: 'Commerce finding',
      message: 'Commerce data needs review.',
      recommendation: 'Correct the payload.',
      evidenceIds: ['event-1'],
      sourceUrl:
        'https://docs.oracle.com/en/cloud/saas/marketing/infinity-quickstart/Data-Collection/Parameter-Reference/Commerce/',
    };
    const report = createExportReport(
      sessionFixture({ networkObservations: [event], parameters, warnings: [qaFinding] }),
    );

    expect(report.schemaVersion).toBe(3);
    expect(report.platform).toEqual({
      id: 'oracle-infinity',
      family: 'Oracle Digital Experience Analytics',
      productName: 'Oracle Infinity',
      generation: 'Infinity / UBI',
    });
    expect(ExportedDiagnosticReportSchema.safeParse(report).success).toBe(true);
    expect(report.events[0].request.url).toContain('wt.ti=Full%20title');
    expect(report.events[0].request.accountGuid).toBe('example-account-guid');
    expect(report.events[0].payload.outOfTheBox[0].value).toBe('Full title');
    expect(report.events[0].payload.custom[0].value).toBeNull();
    expect(report.events[0].payload.emptyValues).toEqual([
      { parameterId: 'custom', name: 'site.section', valueKind: 'null' },
    ]);
    expect(report.events[0].qaFindings).toEqual([qaFinding]);
  });

  it('summarizes Infinity libraries separately from complete collection events', () => {
    const event = networkFixture();
    const library = networkFixture({
      id: 'library',
      requestUrl: 'https://d.oracleinfinity.io/infy/ubi/analytics/ubi.js?v=1',
      sourceType: 'infinity-library',
      eventKind: 'library',
      libraryName: 'ubi.js',
      libraryType: 'javascript',
      statusCode: 304,
      responseStatus: '304 Not Modified',
    });
    const report = createExportReport(sessionFixture({ networkObservations: [event, library] }));
    expect(report.events).toHaveLength(1);
    expect(report.libraries).toEqual([
      expect.objectContaining({ name: 'ubi.js', state: 'cached', statusCodes: [304] }),
    ]);
  });

  it('summarizes unverified Infinity service traffic separately from events', () => {
    const support = networkFixture({
      sourceType: 'unknown-infinity-network',
      eventKind: 'unknown',
      requestUrl: 'https://dc.oracleinfinity.io/v4/account/example/client/id?token=raw',
    });
    const report = createExportReport(sessionFixture({ networkObservations: [support] }));
    expect(report.events).toHaveLength(0);
    expect(report.supportTraffic).toEqual([
      expect.objectContaining({
        url: 'https://dc.oracleinfinity.io/v4/account/example/client/id',
        requestCount: 1,
      }),
    ]);
  });

  it('escapes captured Markdown and HTML control text', () => {
    const value = 'line one\n![remote](https://example.test/image.png)<img src=x>';
    const parameter = {
      id: 'unsafe',
      name: 'site.[unsafe]',
      value,
      sourceType: 'cx-tag-network' as const,
      eventTimestamp: '2026-01-01T00:00:01.000Z',
      eventId: 'event-1',
      origin: 'query-string' as const,
      classification: 'custom' as const,
      sensitivity: 'none' as const,
    };
    const event = networkFixture({ parameters: [parameter], parameterCount: 1 });
    const markdown = exportReportMarkdown(
      sessionFixture({ networkObservations: [event], parameters: [parameter] }),
    );
    expect(markdown).not.toContain('![remote]');
    expect(markdown).not.toContain('<img src=x>');
    expect(markdown).toContain('&lt;img src=x&gt;');
  });

  it('exports a pass/warn/fail scorecard and preserves completed-step evidence', () => {
    const event = networkFixture({ id: 'completed-step-event' });
    const plan = createQaPlan('Checkout QA');
    const runStarted = startQaPlanRun(plan);
    const stepStarted = startQaStep(runStarted, plan.steps[0].id, sessionFixture());
    const runCompleted = completeQaStep(
      stepStarted,
      plan.steps[0].id,
      sessionFixture({ networkObservations: [event] }),
    );
    const currentSession = sessionFixture({ networkObservations: [] });

    const report = createExportReport(currentSession, '0.4.0', runCompleted);
    const markdown = exportReportMarkdown(currentSession, '0.4.0', runCompleted);

    expect(report.qaScorecard).toMatchObject({
      planName: 'Checkout QA',
      status: 'pass',
      summary: { total: 1, passed: 1, warnings: 0, failed: 0, notRun: 0 },
    });
    expect(report.events.map((item) => item.id)).toEqual(['completed-step-event']);
    expect(ExportedDiagnosticReportSchema.safeParse(report).success).toBe(true);
    expect(markdown).toContain('## QA contract scorecard');
    expect(markdown).toContain('Overall result: **PASS**');
    expect(markdown).toContain('Checkout QA');
  });
});
