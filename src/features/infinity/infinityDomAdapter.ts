import { scanDocumentForCxTags, scanScriptTag } from '../dom/scriptTagScanner';
import type { PlatformDomAdapter } from '../platform/platformDomAdapter';
import { ORACLE_INFINITY_PLATFORM_ID } from './infinityPlatformIdentity';

export const oracleInfinityDomAdapter: PlatformDomAdapter = {
  platformId: ORACLE_INFINITY_PLATFORM_ID,
  scanDocument(root = document) {
    return scanDocumentForCxTags(root).map((loader) => ({
      ...loader,
      platformId: ORACLE_INFINITY_PLATFORM_ID,
    }));
  },
  scanScriptElement(script, dynamicallyInserted = false) {
    const loader = scanScriptTag(script, dynamicallyInserted);
    return loader ? { ...loader, platformId: ORACLE_INFINITY_PLATFORM_ID } : undefined;
  },
};
