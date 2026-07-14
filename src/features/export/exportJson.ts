import { platformAdapterForSession } from '../platform/platformRegistry';
import { buildPlatformSummary } from '../platform/platformDiagnosticsRuntime';
import type {
  DiagnosticSession,
  DiagnosticWarning,
  ExportedDiagnosticReport,
  ExportedQaEvent,
  PlatformNetworkObservation,
} from '../models';

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
  extensionVersion = '0.3.0',
): ExportedDiagnosticReport {
  const adapter = platformAdapterForSession(session);
  const { identity } = adapter;
  const events = session.networkObservations
    .filter(adapter.isCollectionObservation)
    .map((event, index) =>
      createQaEvent(event, index + 1, findingsForEvent(event, session.warnings)),
    );

  return {
    schemaVersion: 2,
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
    summary: buildPlatformSummary(session),
    loaders: session.loaders,
    tagManagers: session.tagManagers ?? [],
    libraries: adapter.summarizeLibraries(session.networkObservations),
    supportTraffic: adapter.summarizeSupportTraffic(session.networkObservations),
    events,
    warnings: session.warnings,
    notes: adapter.exportNotes(session),
  };
}

export function exportReportJson(session: DiagnosticSession, version?: string): string {
  return JSON.stringify(createExportReport(session, version), null, 2);
}
