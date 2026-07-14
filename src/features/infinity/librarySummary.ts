import type { InfinityLibrarySummary, OracleNetworkObservation } from '../models';

function canonicalUrl(value: string): string {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return value.split('?')[0];
  }
}

export function summarizeInfinityLibraries(
  observations: OracleNetworkObservation[],
): InfinityLibrarySummary[] {
  const groups = new Map<string, OracleNetworkObservation[]>();
  for (const observation of observations.filter(
    (entry) => entry.sourceType === 'infinity-library' || entry.eventKind === 'library',
  )) {
    const key = canonicalUrl(observation.requestUrl);
    groups.set(key, [...(groups.get(key) ?? []), observation]);
  }

  return [...groups.entries()].map(([url, entries]) => {
    const ordered = [...entries].sort((left, right) =>
      left.timestamp.localeCompare(right.timestamp),
    );
    const statusCodes = [...new Set(entries.map((entry) => entry.statusCode))].sort(
      (left, right) => left - right,
    );
    const failed = statusCodes.some((status) => status >= 400);
    const cached = statusCodes.length > 0 && statusCodes.every((status) => status === 304);
    const loaded = statusCodes.some((status) => status >= 200 && status < 400);
    return {
      name: entries[0].libraryName ?? url.split('/').at(-1) ?? 'Infinity resource',
      url,
      resourceType: entries[0].libraryType ?? 'other',
      state: failed ? 'failed' : cached ? 'cached' : loaded ? 'loaded' : 'observed',
      requestCount: entries.length,
      statusCodes,
      firstObservedAt: ordered[0].timestamp,
      lastObservedAt: ordered.at(-1)!.timestamp,
      issues: [...new Set(entries.flatMap((entry) => entry.warnings))],
    };
  });
}
