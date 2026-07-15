import type { DiscoveryProvider } from '../discoveryProvider';
import { createNetworkEvidence, parseRequestUrl } from '../discoveryProvider';

export const googleDiscoveryProvider: DiscoveryProvider = {
  id: 'google',
  label: 'Google',
  inspectNetwork(entry) {
    const url = parseRequestUrl(entry);
    if (!url) return [];
    const host = url.hostname.toLowerCase();
    const path = url.pathname.toLowerCase();
    const evidence = [];

    if (host === 'www.googletagmanager.com' && path.endsWith('/gtm.js')) {
      const containerId = url.searchParams.get('id') ?? undefined;
      evidence.push(
        createNetworkEvidence(entry, {
          providerId: 'google',
          technologyKind: 'tag-manager',
          label: 'Google Tag Manager',
          identifier: containerId,
          evidence: 'A Google Tag Manager container library request was observed.',
        }),
      );
    }

    if (host === 'www.googletagmanager.com' && path.endsWith('/gtag/js')) {
      const measurementId = url.searchParams.get('id') ?? undefined;
      evidence.push(
        createNetworkEvidence(entry, {
          providerId: 'google',
          technologyKind: 'analytics',
          label: 'Google tag / Google Analytics',
          identifier: measurementId,
          evidence: 'A Google tag library request was observed.',
        }),
      );
    }

    const measurementId = url.searchParams.get('tid') ?? undefined;
    const googleAnalyticsHost =
      host === 'www.google-analytics.com' ||
      host === 'analytics.google.com' ||
      host === 'stats.g.doubleclick.net' ||
      /^region\d+\.google-analytics\.com$/.test(host);
    const collectionPath = path.endsWith('/collect') || path.endsWith('/g/collect');
    const recognizedMeasurement = /^(?:G-|UA-)/i.test(measurementId ?? '');
    if (collectionPath && (googleAnalyticsHost || recognizedMeasurement)) {
      evidence.push(
        createNetworkEvidence(entry, {
          providerId: 'google',
          technologyKind: 'analytics',
          label: 'Google Analytics',
          identifier: measurementId,
          confidence: googleAnalyticsHost ? 'direct' : 'inferred',
          evidence: googleAnalyticsHost
            ? 'A Google Analytics collection request was observed on a known Google endpoint.'
            : 'A first-party collect-shaped request with a Google measurement identifier was observed.',
        }),
      );
    }

    return evidence;
  },
};
