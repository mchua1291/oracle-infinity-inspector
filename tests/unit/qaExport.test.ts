import { createExportReport } from '../../src/features/export/exportJson';
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
});
