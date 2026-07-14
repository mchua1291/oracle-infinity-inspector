import type { InfinitySupportTrafficSummary, OracleNetworkObservation } from '../models';
import { isSupportObservation } from '../network/observationCollection';

function canonicalUrl(value: string): string {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return value.split('?')[0];
  }
}

export function summarizeInfinitySupportTraffic(
  observations: OracleNetworkObservation[],
): InfinitySupportTrafficSummary[] {
  const groups = new Map<string, OracleNetworkObservation[]>();
  for (const observation of observations.filter(isSupportObservation)) {
    const key = canonicalUrl(observation.requestUrl);
    const entries = groups.get(key);
    if (entries) entries.push(observation);
    else groups.set(key, [observation]);
  }

  return [...groups.entries()].map(([url, entries]) => {
    const ordered = [...entries].sort((left, right) =>
      left.timestamp.localeCompare(right.timestamp),
    );
    const statusCodes = [...new Set(entries.map((entry) => entry.statusCode))].sort(
      (left, right) => left - right,
    );
    const failed = statusCodes.some((status) => status >= 400);
    const successful = statusCodes.some((status) => status >= 200 && status < 400);
    return {
      url,
      methods: [...new Set(entries.map((entry) => entry.requestMethod))].sort(),
      state: failed ? 'failed' : successful ? 'successful' : 'observed',
      requestCount: entries.length,
      statusCodes,
      firstObservedAt: ordered[0].timestamp,
      lastObservedAt: ordered.at(-1)!.timestamp,
      issues: [...new Set(entries.flatMap((entry) => entry.warnings))],
    };
  });
}
