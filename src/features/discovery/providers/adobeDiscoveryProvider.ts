import type { DiscoveryProvider } from '../discoveryProvider';
import { createNetworkEvidence, parseRequestUrl } from '../discoveryProvider';

export const adobeDiscoveryProvider: DiscoveryProvider = {
  id: 'adobe',
  label: 'Adobe',
  inspectNetwork(entry) {
    const url = parseRequestUrl(entry);
    if (!url) return [];
    const host = url.hostname.toLowerCase();
    const path = url.pathname;
    const evidence = [];

    if (host === 'assets.adobedtm.com') {
      const library = path.split('/').filter(Boolean).at(-1);
      if (library && /^(?:launch-|satelliteLib-)/i.test(library))
        evidence.push(
          createNetworkEvidence(entry, {
            providerId: 'adobe',
            technologyKind: 'tag-manager',
            label: 'Adobe Experience Platform Tags',
            identifier: library,
            environment: /-development\.min\.js$/i.test(library)
              ? 'development'
              : /-staging\.min\.js$/i.test(library)
                ? 'staging'
                : 'production or custom',
            evidence: 'An Adobe Tags library request was observed.',
          }),
        );
    }

    const appMeasurement = path.match(/\/b\/ss\/([^/]+)/i);
    if (appMeasurement)
      evidence.push(
        createNetworkEvidence(entry, {
          providerId: 'adobe',
          technologyKind: 'analytics',
          label: 'Adobe Analytics (AppMeasurement)',
          identifier: decodeURIComponent(appMeasurement[1]),
          evidence: 'An Adobe Analytics /b/ss/ collection request was observed.',
        }),
      );

    const adobeEdgeHost = host === 'edge.adobedc.net' || host.endsWith('.data.adobedc.net');
    if (adobeEdgeHost && (/\/ee\//i.test(path) || /\/v1\/(?:interact|collect)/i.test(path)))
      evidence.push(
        createNetworkEvidence(entry, {
          providerId: 'adobe',
          technologyKind: 'collector',
          label: 'Adobe Experience Platform Web SDK / Edge Network',
          evidence:
            'An Adobe Edge Network collection request was observed. Its downstream Adobe applications are not proven by this request alone.',
        }),
      );

    return evidence;
  },
};
