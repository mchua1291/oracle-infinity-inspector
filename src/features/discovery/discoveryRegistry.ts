import type { HarEntry } from '../network/harTypes';
import type { DiscoveryTechnologyEvidence } from './discoveryModels';
import type { DiscoveryProvider } from './discoveryProvider';
import { adobeDiscoveryProvider } from './providers/adobeDiscoveryProvider';
import { googleDiscoveryProvider } from './providers/googleDiscoveryProvider';
import { tealiumDiscoveryProvider } from './providers/tealiumDiscoveryProvider';

const providers: readonly DiscoveryProvider[] = [
  googleDiscoveryProvider,
  adobeDiscoveryProvider,
  tealiumDiscoveryProvider,
];

export function inspectNetworkForDiscovery(entry: HarEntry): DiscoveryTechnologyEvidence[] {
  return providers.flatMap((provider) => provider.inspectNetwork(entry));
}
