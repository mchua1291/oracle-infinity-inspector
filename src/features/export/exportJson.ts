import { platformAdapterForSession } from '../platform/platformRegistry';
import { buildPlatformSummary } from '../platform/platformDiagnosticsRuntime';
import type {
  DiagnosticSession,
  DiagnosticWarning,
  ExportedDiagnosticReport,
  ExportedQaEvent,
  PlatformNetworkObservation,
  QaPlanRun,
} from '../models';
import { buildQaScorecard } from '../qa/qaContracts';
import { compareDiscoverySnapshots } from '../discovery/discoveryComparison';
import type { DiscoveryState, ExportedDiscovery } from '../discovery/discoveryModels';
import { analyzeDiscoveryReuse } from '../discovery/reuseAnalyzer';

function findingsForEvent(
  event: PlatformNetworkObservation,
  warnings: DiagnosticWarning[],
): DiagnosticWarning[] {
  const evidenceIds = new Set([event.id, ...event.parameters.map((parameter) => parameter.id)]);
  return warnings.filter((warning) => warning.evidenceIds.some((id) => evidenceIds.has(id)));
}

function createQaEvent(
  event: PlatformNetworkObservation,
  sequence: number,
  qaFindings: DiagnosticWarning[],
): ExportedQaEvent {
  return {
    id: event.id,
    sequence,
    timestamp: event.timestamp,
    eventKind: event.eventKind,
    sourceType: event.sourceType,
    request: {
      url: event.requestUrl,
      method: event.requestMethod,
      statusCode: event.statusCode,
      responseStatus: event.responseStatus,
      accountGuid: event.accountGuid,
    },
    wtDl: event.wtDl,
    parseStatus: event.requestBodyParseStatus,
    payload: {
      parameterCount: event.parameters.length,
      outOfTheBox: event.parameters.filter((parameter) => parameter.classification === 'standard'),
      custom: event.parameters.filter((parameter) => parameter.classification === 'custom'),
      needsReview: event.parameters.filter((parameter) => parameter.classification === 'unknown'),
      emptyValues: event.parameters
        .filter((parameter) => parameter.value === '' || parameter.value === null)
        .map((parameter) => ({
          parameterId: parameter.id,
          name: parameter.name,
          valueKind: parameter.value === null ? ('null' as const) : ('empty-string' as const),
        })),
    },
    warnings: event.warnings,
    qaFindings,
  };
}

export function createExportReport(
  session: DiagnosticSession,
  extensionVersion = '0.6.0',
  qaRun?: QaPlanRun,
  discovery?: DiscoveryState,
): ExportedDiagnosticReport {
  const adapter = platformAdapterForSession(session);
  const { identity } = adapter;
  const collectionEvents = [
    ...new Map(
      [
        ...(qaRun?.steps.flatMap((step) => step.observedEvents) ?? []),
        ...session.networkObservations.filter(adapter.isCollectionObservation),
      ].map((event) => [event.id, event]),
    ).values(),
  ].sort((left, right) => left.timestamp.localeCompare(right.timestamp));
  const events = collectionEvents.map((event, index) =>
    createQaEvent(event, index + 1, findingsForEvent(event, session.warnings)),
  );
  const reportSession = {
    ...session,
    networkObservations: [
      ...session.networkObservations.filter((event) => !adapter.isCollectionObservation(event)),
      ...collectionEvents,
    ],
    parameters: collectionEvents.flatMap((event) => event.parameters),
  };
  const latestDiscoverySnapshot = discovery?.snapshots.at(-1);
  const baselineDiscoverySnapshot = discovery?.snapshots.find(
    (snapshot) => snapshot.id === discovery.baselineSnapshotId,
  );
  const exportedDiscovery: ExportedDiscovery | undefined = discovery
    ? {
        ...discovery,
        reuseAssessments: latestDiscoverySnapshot
          ? analyzeDiscoveryReuse(latestDiscoverySnapshot, session)
          : [],
        comparison:
          baselineDiscoverySnapshot &&
          latestDiscoverySnapshot &&
          baselineDiscoverySnapshot.id !== latestDiscoverySnapshot.id
            ? compareDiscoverySnapshots(baselineDiscoverySnapshot, latestDiscoverySnapshot)
            : [],
      }
    : undefined;

  return {
    schemaVersion: 4,
    reportType: identity.reportType,
    platform: {
      id: identity.id,
      family: identity.family,
      productName: identity.productName,
      generation: identity.generation,
    },
    generatedAt: new Date().toISOString(),
    extensionVersion,
    catalogVersion: adapter.catalogVersion,
    page: {
      url: session.pageUrl,
      captureStartedAt: session.startedAt,
      lastScanAt: session.scanTimestamp,
      captureMayBeIncomplete: session.captureMayBeIncomplete,
    },
    summary: buildPlatformSummary(reportSession),
    loaders: session.loaders,
    tagManagers: session.tagManagers ?? [],
    libraries: adapter.summarizeLibraries(session.networkObservations),
    supportTraffic: adapter.summarizeSupportTraffic(session.networkObservations),
    events,
    warnings: session.warnings,
    qaScorecard: buildQaScorecard(qaRun),
    discovery: exportedDiscovery,
    notes: adapter.exportNotes(session),
  };
}

export function exportReportJson(
  session: DiagnosticSession,
  version?: string,
  qaRun?: QaPlanRun,
  discovery?: DiscoveryState,
): string {
  return JSON.stringify(createExportReport(session, version, qaRun, discovery), null, 2);
}
