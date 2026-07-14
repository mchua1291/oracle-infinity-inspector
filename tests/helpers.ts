import type {
  DiagnosticSession,
  OracleCxTagLoader,
  OracleNetworkObservation,
} from '../src/features/models';

export function loaderFixture(overrides: Partial<OracleCxTagLoader> = {}): OracleCxTagLoader {
  return {
    id: 'loader-1',
    sourceUrl:
      'https://d.oracleinfinity.io/infy/acs/account/example-account-guid/js/example-tag/odc.js?_ora.config=analytics:test',
    config: {
      accountGuid: 'example-account-guid',
      tagId: 'example-tag',
      config: 'analytics:test',
      environmentGuess: 'test',
    },
    location: { path: 'html > head > script', parentElement: 'head', scriptIndex: 0, inHead: true },
    async: false,
    defer: false,
    dynamicallyInserted: false,
    inlineLoaderEvidence: false,
    parserInsertedInference: true,
    loadMode: 'synchronous',
    confidence: 'inferred',
    evidence: [{ kind: 'head-position', description: 'In head.', direct: true }],
    detectedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function networkFixture(
  overrides: Partial<OracleNetworkObservation> = {},
): OracleNetworkObservation {
  return {
    id: 'event-1',
    timestamp: '2026-01-01T00:00:01.000Z',
    requestUrl: 'https://sample.dc.oracleinfinity.io/dcs.gif?wt.dl=0&wt.ti=Example',
    requestMethod: 'GET',
    statusCode: 200,
    sourceType: 'cx-tag-network',
    eventKind: 'page-view',
    wtDl: '0',
    parameterCount: 0,
    requestBodyParseStatus: 'success',
    responseStatus: '200 OK',
    warnings: [],
    parameters: [],
    ...overrides,
  };
}

export function sessionFixture(overrides: Partial<DiagnosticSession> = {}): DiagnosticSession {
  return {
    id: 'session-1',
    tabId: 1,
    pageUrl: 'https://www.example.test/page',
    startedAt: '2026-01-01T00:00:00.000Z',
    scanTimestamp: '2026-01-01T00:00:01.000Z',
    devtoolsOpenedAt: '2026-01-01T00:00:00.000Z',
    loaders: [],
    tagManagers: [],
    networkObservations: [],
    parameters: [],
    warnings: [],
    timeline: [],
    captureMayBeIncomplete: true,
    droppedObservationCount: 0,
    ...overrides,
  };
}
