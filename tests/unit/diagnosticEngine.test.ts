import { buildDiagnostics, buildSummary } from '../../src/features/diagnostics/diagnosticEngine';
import { loaderFixture, networkFixture, sessionFixture } from '../helpers';

describe('diagnostic engine', () => {
  it('warns when a loader exists without collection calls', () =>
    expect(
      buildDiagnostics(
        sessionFixture({ loaders: [loaderFixture()], captureMayBeIncomplete: false }),
      ).some((item) => item.code === 'tag-no-collection'),
    ).toBe(true));
  it('warns on multiple account GUIDs', () =>
    expect(
      buildDiagnostics(
        sessionFixture({
          loaders: [
            loaderFixture(),
            loaderFixture({
              id: 'loader-2',
              config: { accountGuid: 'second-example', environmentGuess: 'unknown' },
            }),
          ],
        }),
      ).some((item) => item.code === 'multiple-account-guids'),
    ).toBe(true));
  it('warns on duplicate page views close together', () => {
    const parameter = (eventId: string) => ({
      id: `${eventId}:url`,
      name: 'wt.es',
      value: 'https://example.test/page',
      sourceType: 'cx-tag-network' as const,
      eventTimestamp: '2026-01-01T00:00:01.000Z',
      eventId,
      origin: 'query-string' as const,
      classification: 'standard' as const,
      sensitivity: 'none' as const,
    });
    const first = networkFixture({ id: 'one', parameters: [parameter('one')] });
    const second = networkFixture({
      id: 'two',
      timestamp: '2026-01-01T00:00:02.000Z',
      parameters: [parameter('two')],
    });
    expect(
      buildDiagnostics(
        sessionFixture({
          networkObservations: [first, second],
          parameters: [...first.parameters, ...second.parameters],
        }),
      ).some((item) => item.code === 'duplicate-page-view'),
    ).toBe(true);
  });

  it('flags empty and null payload values as potential QA issues', () => {
    const parameter = {
      id: 'empty',
      name: 'site.section',
      value: null,
      sourceType: 'dcapi-browser-visible' as const,
      eventTimestamp: '2026-01-01T00:00:01.000Z',
      eventId: 'event-1',
      origin: 'dcapi-event' as const,
      classification: 'custom' as const,
      sensitivity: 'none' as const,
    };
    expect(
      buildDiagnostics(sessionFixture({ parameters: [parameter] })).some(
        (item) => item.code === 'empty-parameter-value',
      ),
    ).toBe(true);
  });

  it('does not count cache-validated libraries as collection calls or failures', () => {
    const library = networkFixture({
      id: 'library',
      requestUrl: 'https://d.oracleinfinity.io/infy/ubi/analytics/ubi.js',
      sourceType: 'infinity-library',
      eventKind: 'library',
      libraryName: 'ubi.js',
      libraryType: 'javascript',
      statusCode: 304,
      responseStatus: '304 Not Modified',
    });
    const session = sessionFixture({ networkObservations: [library] });
    expect(buildSummary(session)).toMatchObject({
      collectionEventCount: 0,
      libraryCount: 1,
      libraryIssueCount: 0,
    });
    expect(buildDiagnostics(session).some((item) => item.code === 'failed-oracle-request')).toBe(
      false,
    );
  });

  it('validates account, tag ID, config, and load mode against the domain profile', () => {
    const warnings = buildDiagnostics(
      sessionFixture({ loaders: [loaderFixture()], captureMayBeIncomplete: false }),
      [
        {
          domain: 'www.example.test',
          environment: 'test',
          accountGuids: ['different-account'],
          tagId: 'different-tag',
          config: 'analytics:production',
          loadMode: 'asynchronous',
        },
      ],
    );
    expect(warnings.map((item) => item.code)).toEqual(
      expect.arrayContaining([
        'account-guid-profile-mismatch',
        'tag-id-profile-mismatch',
        'config-profile-mismatch',
        'load-mode-mismatch',
      ]),
    );
  });

  it('does not count unverified Infinity service traffic as collection', () => {
    const support = networkFixture({
      sourceType: 'unknown-infinity-network',
      eventKind: 'unknown',
      requestUrl: 'https://dc.oracleinfinity.io/v4/account/example/client/id',
    });
    expect(buildSummary(sessionFixture({ networkObservations: [support] }))).toMatchObject({
      collectionEventCount: 0,
      supportTrafficCount: 1,
    });
  });

  it.each([
    ['payment-card', 'suspected-payment-card'],
    ['phone', 'suspected-phone'],
  ] as const)('turns %s sensitivity into a diagnostic', (sensitivity, code) => {
    const parameter = {
      id: sensitivity,
      name: `site.${sensitivity}`,
      value: 'synthetic',
      sourceType: 'cx-tag-network' as const,
      eventTimestamp: '2026-01-01T00:00:00.000Z',
      eventId: 'event-1',
      origin: 'query-string' as const,
      classification: 'custom' as const,
      sensitivity,
    };
    expect(
      buildDiagnostics(sessionFixture({ parameters: [parameter] })).some(
        (warning) => warning.code === code,
      ),
    ).toBe(true);
  });
});
