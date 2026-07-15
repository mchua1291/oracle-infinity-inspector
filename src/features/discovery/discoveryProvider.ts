import type { HarEntry } from '../network/harTypes';
import type { DiscoveryProviderId, DiscoveryTechnologyEvidence } from './discoveryModels';

export interface DiscoveryProvider {
  id: DiscoveryProviderId;
  label: string;
  inspectNetwork(entry: HarEntry): DiscoveryTechnologyEvidence[];
}

export function createNetworkEvidence(
  entry: HarEntry,
  evidence: Omit<
    DiscoveryTechnologyEvidence,
    'id' | 'source' | 'confidence' | 'observedAt' | 'requestUrl'
  > &
    Pick<Partial<DiscoveryTechnologyEvidence>, 'confidence'>,
): DiscoveryTechnologyEvidence {
  const requestUrl = entry.request.url;
  const observedAt = entry.startedDateTime ?? new Date().toISOString();
  const { confidence = 'direct', ...details } = evidence;
  return {
    ...details,
    id: `discovery:${evidence.providerId}:${evidence.technologyKind}:${evidence.identifier ?? requestUrl}`,
    source: 'network',
    confidence,
    observedAt,
    requestUrl,
  };
}

export function parseRequestUrl(entry: HarEntry): URL | undefined {
  try {
    return new URL(entry.request.url);
  } catch {
    return undefined;
  }
}
