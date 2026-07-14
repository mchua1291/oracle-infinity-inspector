import type { InfinitySourceType } from '../models';
import {
  isDcsGifUrl,
  isInfinityLikeUrl,
  matchInfinityLibraryUrl,
  matchDcApiUrl,
  parseCxTagLoaderUrl,
} from './infinityUrlPatterns';

export function classifySourceType(url: string): InfinitySourceType | undefined {
  if (parseCxTagLoaderUrl(url).status !== 'failed') return 'cx-tag-loader';
  if (isDcsGifUrl(url)) return 'cx-tag-network';
  if (matchDcApiUrl(url)) return 'dcapi-browser-visible';
  if (matchInfinityLibraryUrl(url)) return 'infinity-library';
  if (isInfinityLikeUrl(url)) return 'unknown-infinity-network';
  return undefined;
}
