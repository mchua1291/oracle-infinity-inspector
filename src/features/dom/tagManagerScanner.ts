import type { TagManagerObservation } from '../models';
import { buildDomPath } from './domPath';

function location(element: Element) {
  const index = Array.from(document.querySelectorAll('script, iframe')).indexOf(element);
  return {
    path: buildDomPath(element),
    parentElement: element.parentElement?.tagName.toLowerCase() ?? 'unknown',
    scriptIndex: Math.max(index, 0),
    inHead: element.closest('head') !== null,
  };
}

function source(element: Element): string {
  return element.getAttribute('src') ?? '';
}

function inlineText(element: Element): string {
  return element instanceof HTMLScriptElement ? (element.textContent ?? '') : '';
}

function observation(
  element: Element,
  match: Omit<TagManagerObservation, 'id' | 'location' | 'detectedAt'>,
): TagManagerObservation {
  return {
    id: `tag-manager:${crypto.randomUUID()}`,
    ...match,
    location: location(element),
    detectedAt: new Date().toISOString(),
  };
}

export function scanTagManagerElement(element: Element): TagManagerObservation | undefined {
  const src = source(element);
  const text = inlineText(element);
  const combined = `${src} ${text}`;

  const googleUrl = src.match(
    /(?:https?:)?\/\/www\.googletagmanager\.com\/(?:gtm\.js|ns\.html)\?[^\s"']*id=(GTM-[A-Z0-9-]+)/i,
  );
  const googleInline = combined.match(
    /googletagmanager\.com\/gtm\.js[\s\S]{0,600}?(GTM-[A-Z0-9-]+)|(?:GTM-[A-Z0-9-]+)[\s\S]{0,600}?googletagmanager\.com\/gtm\.js/i,
  );
  const googleId = googleUrl?.[1] ?? googleInline?.[1] ?? combined.match(/GTM-[A-Z0-9-]+/i)?.[0];
  if (googleUrl || (googleId && /googletagmanager\.com\/gtm\.js/i.test(combined)))
    return observation(element, {
      type: 'google-tag-manager',
      label: 'Google Tag Manager',
      containerId: googleId?.toUpperCase(),
      sourceUrl: src || undefined,
      confidence: src ? 'direct' : 'inferred',
      evidence: src
        ? 'A standard Google Tag Manager gtm.js or noscript URL was observed.'
        : 'An inline standard Google Tag Manager bootstrap snippet was observed.',
    });

  const tealium = combined.match(
    /tags\.tiqcdn\.com\/utag\/([^/\s"']+)\/([^/\s"']+)\/([^/\s"']+)\/utag\.js/i,
  );
  if (tealium)
    return observation(element, {
      type: 'tealium-iq',
      label: 'Tealium iQ',
      containerId: `${tealium[1]}/${tealium[2]}`,
      environment: tealium[3],
      sourceUrl: src || undefined,
      confidence: src ? 'direct' : 'inferred',
      evidence: src
        ? 'A standard Tealium tags.tiqcdn.com utag.js URL was observed.'
        : 'An inline standard Tealium utag.js bootstrap snippet was observed.',
    });

  const adobe = combined.match(
    /assets\.adobedtm\.com\/[^\s"']*?(launch-[^/\s"']+?\.min\.js|satelliteLib-[^/\s"']+?\.js)/i,
  );
  if (adobe)
    return observation(element, {
      type: 'adobe-tags',
      label: 'Adobe Experience Platform Tags',
      containerId: adobe[1],
      environment: /-development\.min\.js$/i.test(adobe[1])
        ? 'development'
        : /-staging\.min\.js$/i.test(adobe[1])
          ? 'staging'
          : 'production or custom',
      sourceUrl: src || undefined,
      confidence: src ? 'direct' : 'inferred',
      evidence: src
        ? 'A standard assets.adobedtm.com tag library URL was observed.'
        : 'An inline Adobe Tags library bootstrap reference was observed.',
    });

  return undefined;
}

export function scanDocumentForTagManagers(root: ParentNode = document): TagManagerObservation[] {
  return Array.from(root.querySelectorAll('script, iframe')).flatMap((element) => {
    const result = scanTagManagerElement(element);
    return result ? [result] : [];
  });
}
