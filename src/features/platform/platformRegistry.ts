import { oracleInfinityPlatformAdapter } from '../infinity/infinityPlatformAdapter';
import type { DiagnosticSession, PlatformId } from '../models';
import type { PlatformAdapter } from './platformAdapter';

export interface PlatformRegistry {
  all(): readonly PlatformAdapter[];
  get(platformId?: PlatformId): PlatformAdapter;
  matchingRequest(url: string): readonly PlatformAdapter[];
}

export function createPlatformRegistry(
  initialAdapters: readonly PlatformAdapter[],
): PlatformRegistry {
  if (!initialAdapters.length) throw new Error('At least one platform adapter is required.');
  const byId = new Map<string, PlatformAdapter>();
  for (const adapter of initialAdapters) {
    if (byId.has(adapter.identity.id))
      throw new Error(`Duplicate platform adapter id: ${adapter.identity.id}`);
    byId.set(adapter.identity.id, adapter);
  }
  const registered = [...initialAdapters];
  return {
    all: () => registered,
    get(platformId) {
      if (!platformId) return registered[0];
      const adapter = byId.get(platformId);
      if (!adapter) throw new Error(`No platform adapter is registered for ${platformId}.`);
      return adapter;
    },
    matchingRequest: (url) => registered.filter((adapter) => adapter.matchesRequestUrl(url)),
  };
}

const registry = createPlatformRegistry([oracleInfinityPlatformAdapter]);

export function getPlatformAdapters(): readonly PlatformAdapter[] {
  return registry.all();
}

export function getDefaultPlatformAdapter(): PlatformAdapter {
  return registry.get();
}

export function getPlatformAdapter(platformId?: PlatformId): PlatformAdapter {
  return registry.get(platformId);
}

export function platformAdapterForSession(session: DiagnosticSession): PlatformAdapter {
  const observedPlatformId =
    session.platformId ??
    session.networkObservations.find((event) => event.platformId)?.platformId ??
    session.loaders.find((loader) => loader.platformId)?.platformId;
  return getPlatformAdapter(observedPlatformId);
}

export function platformAdaptersForRequest(url: string): readonly PlatformAdapter[] {
  return registry.matchingRequest(url);
}
