import type { PlatformLoaderObservation } from '../models';

export interface PlatformDomAdapter {
  platformId: string;
  scanDocument(root?: ParentNode): PlatformLoaderObservation[];
  scanScriptElement(
    script: HTMLScriptElement,
    dynamicallyInserted?: boolean,
  ): PlatformLoaderObservation | undefined;
}
