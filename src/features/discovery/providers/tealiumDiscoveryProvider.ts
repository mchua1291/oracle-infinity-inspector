import type { DiscoveryProvider } from '../discoveryProvider';
import { createNetworkEvidence, parseRequestUrl } from '../discoveryProvider';

export const tealiumDiscoveryProvider: DiscoveryProvider = {
  id: 'tealium',
  label: 'Tealium',
  inspectNetwork(entry) {
    const url = parseRequestUrl(entry);
    if (!url) return [];
    const host = url.hostname.toLowerCase();
    const match = url.pathname.match(/\/utag\/([^/]+)\/([^/]+)\/([^/]+)\/utag\.js$/i);
    const evidence = [];

    if (host === 'tags.tiqcdn.com' && match)
      evidence.push(
        createNetworkEvidence(entry, {
          providerId: 'tealium',
          technologyKind: 'tag-manager',
          label: 'Tealium iQ',
          identifier: `${match[1]}/${match[2]}`,
          environment: match[3],
          evidence: 'A Tealium iQ utag.js library request was observed.',
        }),
      );

    if (host === 'collect.tealiumiq.com' || host === 'datacloud.tealiumiq.com')
      evidence.push(
        createNetworkEvidence(entry, {
          providerId: 'tealium',
          technologyKind: 'collector',
          label: 'Tealium Collect',
          evidence: 'A Tealium collection endpoint request was observed.',
        }),
      );

    return evidence;
  },
};
