import { buildSummary } from '../diagnostics/diagnosticEngine';
import { ORACLE_PARAMETER_CATALOG } from '../infinity/oracleParameterCatalog';
import { summarizeInfinityLibraries } from '../infinity/librarySummary';
import { summarizeInfinitySupportTraffic } from '../infinity/supportTrafficSummary';
import { isCollectionObservation } from '../network/observationCollection';
import type {
  DiagnosticSession,
  DiagnosticWarning,
  ExportedDiagnosticReport,
  ExportedQaEvent,
  OracleNetworkObservation,
} from '../models';

function findingsForEvent(
  event: OracleNetworkObservation,
  warnings: DiagnosticWarning[],
): DiagnosticWarning[] {
  const evidenceIds = new Set([event.id, ...event.parameters.map((parameter) => parameter.id)]);
  return warnings.filter((warning) => warning.evidenceIds.some((id) => evidenceIds.has(id)));
}

function createQaEvent(
  event: OracleNetworkObservation,
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
  extensionVersion = '0.1.0',
): ExportedDiagnosticReport {
  const events = session.networkObservations
    .filter(isCollectionObservation)
    .map((event, index) =>
      createQaEvent(event, index + 1, findingsForEvent(event, session.warnings)),
    );

  return {
    reportType: 'oracle-infinity-qa-report',
    generatedAt: new Date().toISOString(),
    extensionVersion,
    catalogVersion: ORACLE_PARAMETER_CATALOG.version,
    page: {
      url: session.pageUrl,
      captureStartedAt: session.startedAt,
      lastScanAt: session.scanTimestamp,
      captureMayBeIncomplete: session.captureMayBeIncomplete,
    },
    summary: buildSummary(session),
    loaders: session.loaders,
    tagManagers: session.tagManagers ?? [],
    libraries: summarizeInfinityLibraries(session.networkObservations),
    supportTraffic: summarizeInfinitySupportTraffic(session.networkObservations),
    events,
    warnings: session.warnings,
    notes: [
      'Payload values, account GUIDs, and request URLs are exported exactly as observed.',
      'Only browser-visible Oracle Infinity traffic is included; server-side DC API calls are outside extension scope.',
      'DC API static parameters are inherited into each logical event and retain their origin metadata.',
      'Static Infinity libraries are summarized separately and are not counted as data collection events.',
      'Unverified Infinity support and service traffic is summarized separately and is not counted as data collection events.',
      'Tag-manager evidence identifies standard page-level snippets but does not prove which manager deployed Infinity.',
      ...(session.droppedObservationCount > 0
        ? [
            `${session.droppedObservationCount} older observations were removed after the session limit was reached.`,
          ]
        : []),
    ],
  };
}

export function exportReportJson(session: DiagnosticSession, version?: string): string {
  return JSON.stringify(createExportReport(session, version), null, 2);
}
