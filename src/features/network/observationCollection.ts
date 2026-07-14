import type { PlatformNetworkObservation } from '../models';

export const MAX_SESSION_OBSERVATIONS = 1000;

export function isCollectionObservation(event: PlatformNetworkObservation): boolean {
  return event.sourceType === 'cx-tag-network' || event.sourceType === 'dcapi-browser-visible';
}

export function isSupportObservation(event: PlatformNetworkObservation): boolean {
  return event.sourceType === 'unknown-infinity-network';
}

export function mergeObservations(
  current: PlatformNetworkObservation[],
  incoming: PlatformNetworkObservation[],
  limit = MAX_SESSION_OBSERVATIONS,
): { observations: PlatformNetworkObservation[]; dropped: number } {
  const merged = new Map(current.map((event) => [event.id, event]));
  for (const event of incoming) merged.set(event.id, event);
  const observations = [...merged.values()];
  const dropped = Math.max(0, observations.length - limit);
  return {
    observations: dropped ? observations.slice(dropped) : observations,
    dropped,
  };
}
