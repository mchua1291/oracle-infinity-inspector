import type {
  DiagnosticSession,
  OracleCxTagLoader,
  OracleNetworkObservation,
} from '../src/features/models';
import type {
  DiscoveryField,
  DiscoverySnapshot,
  DiscoveryState,
} from '../src/features/discovery/discoveryModels';

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

export function discoveryFieldFixture(overrides: Partial<DiscoveryField> = {}): DiscoveryField {
  return {
    id: 'discovery-field-1',
    providerId: 'google',
    sourceObject: 'dataLayer',
    path: 'dataLayer[0].page_name',
    value: 'Product detail',
    valueType: 'string',
    state: 'populated',
    entryIndex: 0,
    truncated: false,
    sensitivity: 'none',
    sensitivityReasons: [],
    ...overrides,
  };
}

export function discoverySnapshotFixture(
  fields: DiscoveryField[] = [discoveryFieldFixture()],
  overrides: Partial<DiscoverySnapshot> = {},
): DiscoverySnapshot {
  return {
    id: 'snapshot-1',
    capturedAt: '2026-01-01T00:00:02.000Z',
    pageUrl: 'https://www.example.test/product',
    layers: [
      {
        providerId: 'google',
        objectName: 'dataLayer',
        label: 'Google dataLayer',
        kind: 'queue',
        totalEntries: 1,
        truncated: false,
        fields,
      },
    ],
    ...overrides,
  };
}

export function discoveryStateFixture(
  snapshot = discoverySnapshotFixture(),
  overrides: Partial<DiscoveryState> = {},
): DiscoveryState {
  return {
    technologies: [
      {
        id: 'technology-1',
        providerId: 'google',
        technologyKind: 'tag-manager',
        label: 'Google Tag Manager',
        identifier: 'GTM-EXAMPLE',
        source: 'network',
        confidence: 'direct',
        evidence: 'A Google Tag Manager container library request was observed.',
        observedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    snapshots: [snapshot],
    baselineSnapshotId: snapshot.id,
    ...overrides,
  };
}
