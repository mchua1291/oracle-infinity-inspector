import type { ParameterCatalogEntry, ParserResult, PlatformNetworkObservation } from '../models';
import type { HarEntry } from '../network/harTypes';
import { platformAdaptersForRequest } from './platformRegistry';

export function parseRequestWithPlatformAdapters(
  entry: HarEntry,
  importedCatalog: ParameterCatalogEntry[] = [],
): ParserResult<PlatformNetworkObservation[]> {
  const matches = platformAdaptersForRequest(entry.request.url);
  if (matches.length > 1)
    return {
      status: 'failed',
      reason: `Multiple platform adapters matched this request: ${matches.map((adapter) => adapter.identity.id).join(', ')}.`,
      warnings: [],
    };
  const adapter = matches[0];
  if (!adapter)
    return {
      status: 'failed',
      reason: 'No registered platform adapter matched this request.',
      warnings: [],
    };
  return adapter.parseNetworkRequest(entry, importedCatalog);
}
