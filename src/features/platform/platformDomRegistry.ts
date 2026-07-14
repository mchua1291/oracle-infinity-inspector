import { oracleInfinityDomAdapter } from '../infinity/infinityDomAdapter';
import type { PlatformLoaderObservation } from '../models';
import type { PlatformDomAdapter } from './platformDomAdapter';

const domAdapters: readonly PlatformDomAdapter[] = [oracleInfinityDomAdapter];

export function scanDocumentWithPlatformDomAdapters(
  root: ParentNode = document,
): PlatformLoaderObservation[] {
  return domAdapters.flatMap((adapter) => adapter.scanDocument(root));
}

export function scanScriptWithPlatformDomAdapters(
  script: HTMLScriptElement,
  dynamicallyInserted = false,
): PlatformLoaderObservation[] {
  return domAdapters.flatMap((adapter) => {
    const loader = adapter.scanScriptElement(script, dynamicallyInserted);
    return loader ? [loader] : [];
  });
}
