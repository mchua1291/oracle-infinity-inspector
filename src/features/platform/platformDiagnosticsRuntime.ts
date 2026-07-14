import { oracleInfinityDiagnosticsAdapter } from '../infinity/infinityDiagnosticsAdapter';
import type {
  DiagnosticSession,
  DiagnosticSummary,
  DiagnosticWarning,
  ExpectedDomainProfile,
} from '../models';
import type { PlatformDiagnosticsAdapter } from './platformDiagnosticsAdapter';

const diagnosticsAdapters: readonly PlatformDiagnosticsAdapter[] = [
  oracleInfinityDiagnosticsAdapter,
];

function adapterForSession(session: DiagnosticSession): PlatformDiagnosticsAdapter {
  const platformId =
    session.platformId ??
    session.networkObservations.find((event) => event.platformId)?.platformId ??
    session.loaders.find((loader) => loader.platformId)?.platformId ??
    diagnosticsAdapters[0].platformId;
  const adapter = diagnosticsAdapters.find((candidate) => candidate.platformId === platformId);
  if (!adapter) throw new Error(`No diagnostics adapter is registered for ${platformId}.`);
  return adapter;
}

export function buildPlatformDiagnostics(
  session: DiagnosticSession,
  profiles: ExpectedDomainProfile[] = [],
): DiagnosticWarning[] {
  const adapter = adapterForSession(session);
  const platformProfiles = profiles.filter(
    (profile) => !profile.platformId || profile.platformId === adapter.platformId,
  );
  return adapter.buildDiagnostics(session, platformProfiles);
}

export function buildPlatformSummary(session: DiagnosticSession): DiagnosticSummary {
  return adapterForSession(session).buildSummary(session);
}

export function withPlatformDiagnostics(
  session: DiagnosticSession,
  profiles: ExpectedDomainProfile[] = [],
): DiagnosticSession {
  const adapter = adapterForSession(session);
  const warnings = buildPlatformDiagnostics(session, profiles);
  const warningTimeline = warnings.map((item) => ({
    id: `timeline:${item.id}`,
    timestamp: session.scanTimestamp,
    type: 'warning' as const,
    title: item.title,
    detail: item.message,
    severity: item.severity,
  }));
  return {
    ...session,
    platformId: adapter.platformId,
    warnings,
    timeline: [...session.timeline.filter((entry) => entry.type !== 'warning'), ...warningTimeline],
  };
}
