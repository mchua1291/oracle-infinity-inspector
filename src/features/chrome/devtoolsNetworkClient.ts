import type { OracleParameterCatalogEntry } from '../models';
import type { HarEntry, HarLog } from '../network/harTypes';
import { parseNetworkRequest } from '../network/networkRequestParser';

export interface NetworkClientHandlers {
  onObservations: (
    entries: ReturnType<typeof parseNetworkRequest> extends infer _
      ? import('../models').OracleNetworkObservation[]
      : never,
  ) => void;
  onNavigated: (url: string) => void;
}

function parseEntry(entry: HarEntry, catalog: OracleParameterCatalogEntry[]) {
  const result = parseNetworkRequest(entry, catalog);
  return result.status === 'failed' ? [] : result.data;
}

export function startDevtoolsNetworkClient(
  handlers: NetworkClientHandlers,
  importedCatalog: OracleParameterCatalogEntry[] = [],
): () => void {
  const finished = (request: chrome.devtools.network.Request) => {
    const observations = parseEntry(request as unknown as HarEntry, importedCatalog);
    if (observations.length) handlers.onObservations(observations);
  };
  const navigated = (url: string) => handlers.onNavigated(url);
  chrome.devtools.network.onRequestFinished.addListener(finished);
  chrome.devtools.network.onNavigated.addListener(navigated);
  chrome.devtools.network.getHAR((har) => {
    const observations = (har as unknown as { log: HarLog }).log.entries.flatMap((entry) =>
      parseEntry(entry, importedCatalog),
    );
    if (observations.length) handlers.onObservations(observations);
  });
  return () => {
    chrome.devtools.network.onRequestFinished.removeListener(finished);
    chrome.devtools.network.onNavigated.removeListener(navigated);
  };
}
