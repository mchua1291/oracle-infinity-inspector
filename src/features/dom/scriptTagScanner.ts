import type { OracleCxTagLoader } from '../models';
import { parseCxTagLoaderUrl } from '../infinity/infinityUrlPatterns';
import { buildDomPath } from './domPath';
import { classifyScriptLoadMode } from './scriptLoadModeClassifier';

const inlineLoaderPattern =
  /(?:d\.oracleinfinity\.io|oracleinfinity).*?odc\.js|createElement\s*\(\s*['"]script['"]\s*\)[\s\S]{0,1200}odc\.js/i;
const tagManagerPattern =
  /(?:google[-_ ]?tag[-_ ]?manager|gtm[-_]|tealium|utag|adobe[-_ ]?(?:launch|satellite)|tag[-_ ]?manager)/i;

function isTagManagerRelated(script: HTMLScriptElement): boolean {
  let current: Element | null = script;
  while (current) {
    const evidence = `${current.id} ${current.className} ${current.getAttribute('data-name') ?? ''}`;
    if (tagManagerPattern.test(evidence)) return true;
    current = current.parentElement;
  }
  return tagManagerPattern.test(script.src);
}

export function scanScriptTag(
  script: HTMLScriptElement,
  dynamicallyInserted = false,
): OracleCxTagLoader | undefined {
  const urlResult = script.src
    ? parseCxTagLoaderUrl(script.getAttribute('src') ?? script.src)
    : undefined;
  const inlineLoaderEvidence = !script.src && inlineLoaderPattern.test(script.textContent ?? '');
  if ((!urlResult || urlResult.status === 'failed') && !inlineLoaderEvidence) return undefined;

  const index = Array.from(document.scripts).indexOf(script);
  const inHead = script.closest('head') !== null;
  const asyncAttribute =
    script.hasAttribute('async') ||
    (dynamicallyInserted && script.async) ||
    (inlineLoaderEvidence && /\.async\s*=\s*(?:true|!0)/i.test(script.textContent ?? ''));
  const deferAttribute = script.hasAttribute('defer');
  const parserInsertedInference =
    !dynamicallyInserted && inHead && !asyncAttribute && !deferAttribute && !inlineLoaderEvidence;
  const classified = classifyScriptLoadMode({
    async: asyncAttribute,
    defer: deferAttribute,
    inHead,
    dynamicallyInserted,
    parserInsertedInference,
    inlineLoaderEvidence,
    tagManagerContainer: isTagManagerRelated(script),
  });

  return {
    id: `loader:${crypto.randomUUID()}`,
    sourceUrl: script.src || undefined,
    config:
      urlResult && urlResult.status !== 'failed'
        ? urlResult.data
        : {
            environmentGuess: /analytics:test/i.test(script.textContent ?? '') ? 'test' : 'unknown',
          },
    location: {
      path: buildDomPath(script),
      parentElement: script.parentElement?.tagName.toLowerCase() ?? 'unknown',
      scriptIndex: Math.max(index, 0),
      inHead,
    },
    async: asyncAttribute,
    defer: deferAttribute,
    dynamicallyInserted,
    inlineLoaderEvidence,
    parserInsertedInference,
    ...classified,
    detectedAt: new Date().toISOString(),
  };
}

export function scanDocumentForCxTags(root: ParentNode = document): OracleCxTagLoader[] {
  return Array.from(root.querySelectorAll('script')).flatMap((script) => {
    const loader = scanScriptTag(script as HTMLScriptElement, false);
    return loader ? [loader] : [];
  });
}
