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
    const duplicateRuns: OracleNetworkObservation[][] = [];
    let currentRun: OracleNetworkObservation[] = [];

    // A signature can recur legitimately later in a session. Build contiguous time-window runs so
    // evidence IDs identify the events that are actually adjacent, not the first event ever seen.
    for (const event of matches) {
      const previous = currentRun.at(-1);
      if (
        previous &&
        Date.parse(event.timestamp) - Date.parse(previous.timestamp) > windowMilliseconds
      ) {
        if (currentRun.length > 1) duplicateRuns.push(currentRun);
        currentRun = [];
      }
      currentRun.push(event);
    }
    if (currentRun.length > 1) duplicateRuns.push(currentRun);

    return duplicateRuns.map((run) => ({
      signature,
      eventIds: run.map((event) => event.id),
    }));
  });
}
