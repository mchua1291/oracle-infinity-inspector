import {
  ORACLE_INFINITY_IDENTITY,
  ORACLE_INFINITY_PLATFORM_ID,
} from '../infinity/infinityPlatformIdentity';
import type { PlatformIdentity } from './platformAdapter';

const identities: readonly PlatformIdentity[] = [ORACLE_INFINITY_IDENTITY];

export function getDefaultPlatformIdentity(): PlatformIdentity {
  return ORACLE_INFINITY_IDENTITY;
}

export function getPlatformIdentity(platformId?: string): PlatformIdentity {
  if (!platformId) return getDefaultPlatformIdentity();
  const identity = identities.find((candidate) => candidate.id === platformId);
  if (!identity) throw new Error(`No platform identity is registered for ${platformId}.`);
  return identity;
}

export { ORACLE_INFINITY_PLATFORM_ID };
