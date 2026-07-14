import type { OracleNetworkObservation } from '../models';

export interface DuplicateGroup {
  signature: string;
  eventIds: string[];
}

function value(event: OracleNetworkObservation, name: string): string {
  return event.parameters.find((parameter) => parameter.name.toLowerCase() === name)?.value ?? '';
}

export function detectDuplicatePageViews(
  events: OracleNetworkObservation[],
  windowMilliseconds = 5000,
): DuplicateGroup[] {
  const views = events
    .filter(
      (event) =>
        event.eventKind === 'page-view' ||
        (event.sourceType === 'dcapi-browser-visible' && event.wtDl === '0'),
    )
    .sort((left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp));
  const groups = new Map<string, OracleNetworkObservation[]>();
  for (const event of views) {
    const signature = [
      value(event, 'wt.es'),
      value(event, 'dcssip'),
      value(event, 'dcsuri'),
      value(event, 'wt.ti'),
    ].join('|');
    if (!signature.replace(/\|/g, '')) continue;
    groups.set(signature, [...(groups.get(signature) ?? []), event]);
  }
  return [...groups.entries()].flatMap(([signature, matches]) => {
    const duplicateIds = matches.filter((event, index) => {
      if (index === 0) return true;
      return (
        Date.parse(event.timestamp) - Date.parse(matches[index - 1].timestamp) <= windowMilliseconds
      );
    });
    return duplicateIds.length > 1
      ? [{ signature, eventIds: duplicateIds.map((event) => event.id) }]
      : [];
  });
}
