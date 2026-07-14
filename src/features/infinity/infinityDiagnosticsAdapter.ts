import { buildDiagnostics, buildSummary } from '../diagnostics/diagnosticEngine';
import type { PlatformDiagnosticsAdapter } from '../platform/platformDiagnosticsAdapter';
import { ORACLE_INFINITY_PLATFORM_ID } from './infinityPlatformIdentity';

export const oracleInfinityDiagnosticsAdapter: PlatformDiagnosticsAdapter = {
  platformId: ORACLE_INFINITY_PLATFORM_ID,
  buildDiagnostics,
  buildSummary,
};
