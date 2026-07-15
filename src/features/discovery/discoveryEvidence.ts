import type { TagManagerObservation } from '../models';
import type {
  DiscoveryProviderId,
  DiscoveryState,
  DiscoveryTechnologyEvidence,
} from './discoveryModels';

function evidenceKey(evidence: DiscoveryTechnologyEvidence): string {
  return [
    evidence.providerId,
    evidence.technologyKind,
    evidence.identifier ?? evidence.label,
    evidence.source,
  ].join('|');
}

export function mergeDiscoveryEvidence(
  state: DiscoveryState,
  evidence: DiscoveryTechnologyEvidence[],
): DiscoveryState {
  const merged = new Map(state.technologies.map((item) => [evidenceKey(item), item]));
  for (const item of evidence) merged.set(evidenceKey(item), item);
  return { ...state, technologies: [...merged.values()].slice(-200) };
}

export function tagManagerDiscoveryEvidence(
  managers: TagManagerObservation[],
): DiscoveryTechnologyEvidence[] {
  const providerByType: Record<TagManagerObservation['type'], DiscoveryProviderId> = {
    'google-tag-manager': 'google',
    'adobe-tags': 'adobe',
    'tealium-iq': 'tealium',
  };
  return managers.map((manager) => ({
    id: `discovery:dom:${manager.id}`,
    providerId: providerByType[manager.type],
    technologyKind: 'tag-manager',
    label: manager.label,
    identifier: manager.containerId,
    environment: manager.environment,
    source: 'dom',
    confidence: manager.confidence,
    evidence: manager.evidence,
    observedAt: manager.detectedAt,
    requestUrl: manager.sourceUrl,
  }));
}
