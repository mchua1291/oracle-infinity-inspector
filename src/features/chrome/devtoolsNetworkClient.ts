import type { ParameterCatalogEntry, PlatformNetworkObservation } from '../models';
import type { DiscoveryTechnologyEvidence } from '../discovery/discoveryModels';
import { inspectNetworkForDiscovery } from '../discovery/discoveryRegistry';
import type { HarEntry, HarLog } from '../network/harTypes';
import { parseRequestWithPlatformAdapters } from '../platform/platformRuntime';
import { runExtensionOperation } from './extensionLifecycle';

export interface NetworkClientHandlers {
  onObservations: (entries: PlatformNetworkObservation[]) => void;
  onDiscoveryEvidence?: (evidence: DiscoveryTechnologyEvidence[]) => void;
  onNavigated: (url: string) => void | Promise<void>;
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
    const entry = request as unknown as HarEntry;
    const observations = parseEntry(entry, importedCatalog);
    emitNew(observations);
    const discoveryEvidence = inspectNetworkForDiscovery(entry);
    if (discoveryEvidence.length) handlers.onDiscoveryEvidence?.(discoveryEvidence);
  };
  const navigated = (url: string) => runExtensionOperation(() => handlers.onNavigated(url));
  chrome.devtools.network.onRequestFinished.addListener(finished);
  chrome.devtools.network.onNavigated.addListener(navigated);
  chrome.devtools.network.getHAR((har) => {
    const log = har as unknown as Partial<HarLog> | undefined;
    const entries = Array.isArray(log?.entries) ? log.entries : [];
    const observations = entries.flatMap((entry) => parseEntry(entry, importedCatalog));
    emitNew(observations);
    const discoveryEvidence = entries.flatMap(inspectNetworkForDiscovery);
    if (discoveryEvidence.length) handlers.onDiscoveryEvidence?.(discoveryEvidence);
  });
  return () => {
    chrome.devtools.network.onRequestFinished.removeListener(finished);
    chrome.devtools.network.onNavigated.removeListener(navigated);
  };
}
