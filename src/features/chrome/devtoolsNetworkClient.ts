import type { ParameterCatalogEntry, PlatformNetworkObservation } from '../models';
import type { HarEntry, HarLog } from '../network/harTypes';
import { parseRequestWithPlatformAdapters } from '../platform/platformRuntime';

export interface NetworkClientHandlers {
  onObservations: (entries: PlatformNetworkObservation[]) => void;
  onNavigated: (url: string) => void;
}

function parseEntry(entry: HarEntry, catalog: ParameterCatalogEntry[]) {
  const result = parseRequestWithPlatformAdapters(entry, catalog);
  return result.status === 'failed' ? [] : result.data;
}

export function startDevtoolsNetworkClient(
  handlers: NetworkClientHandlers,
  importedCatalog: ParameterCatalogEntry[] = [],
): () => void {
  const seen = new Set<string>();
  const emitNew = (observations: PlatformNetworkObservation[]) => {
    const fresh = observations.filter((observation) => {
      if (seen.has(observation.id)) return false;
      seen.add(observation.id);
      return true;
    });
    if (fresh.length) handlers.onObservations(fresh);
  };
  const finished = (request: chrome.devtools.network.Request) => {
    const observations = parseEntry(request as unknown as HarEntry, importedCatalog);
    emitNew(observations);
  };
  const navigated = (url: string) => handlers.onNavigated(url);
  chrome.devtools.network.onRequestFinished.addListener(finished);
  chrome.devtools.network.onNavigated.addListener(navigated);
  chrome.devtools.network.getHAR((har) => {
    const observations = (har as unknown as { log: HarLog }).log.entries.flatMap((entry) =>
      parseEntry(entry, importedCatalog),
    );
    emitNew(observations);
  });
  return () => {
    chrome.devtools.network.onRequestFinished.removeListener(finished);
    chrome.devtools.network.onNavigated.removeListener(navigated);
  };
}
