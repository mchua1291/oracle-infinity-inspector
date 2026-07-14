import type {
  DiagnosticSession,
  DiagnosticSummary,
  DiagnosticWarning,
  ExpectedDomainProfile,
} from '../models';

export interface PlatformDiagnosticsAdapter {
  platformId: string;
  buildDiagnostics(
    session: DiagnosticSession,
    profiles?: ExpectedDomainProfile[],
  ): DiagnosticWarning[];
  buildSummary(session: DiagnosticSession): DiagnosticSummary;
}
