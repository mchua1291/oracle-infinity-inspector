import type { OracleCxTagConfig, ParserResult } from '../models';

export const CX_TAG_HOST = 'd.oracleinfinity.io';
export const DC_API_HOST = 'dc.oracleinfinity.io';

function absoluteUrl(input: string): URL | undefined {
  try {
    return new URL(input.startsWith('//') ? `https:${input}` : input, 'https://inspected.invalid');
  } catch {
    return undefined;
  }
}

export function parseCxTagLoaderUrl(input: string): ParserResult<OracleCxTagConfig> {
  const url = absoluteUrl(input);
  if (!url) return { status: 'failed', reason: 'The loader URL is not valid.', warnings: [] };
  const path = url.pathname.match(/\/infy\/acs\/account\/([^/]+)\/js\/([^/]+)\/odc\.js$/i);
  if (url.hostname.toLowerCase() !== CX_TAG_HOST || !path) {
    return {
      status: 'failed',
      reason: 'The URL does not match the documented Oracle CX Tag loader pattern.',
      warnings: [],
    };
  }
  const config = url.searchParams.get('_ora.config') ?? undefined;
  const normalized = config?.toLowerCase() ?? '';
  const environmentGuess = normalized.includes('test')
    ? 'test'
    : normalized.includes('prod') || normalized.includes('production')
      ? 'production'
      : 'unknown';
  return {
    status: 'success',
    data: {
      accountGuid: decodeURIComponent(path[1]),
      tagId: decodeURIComponent(path[2]),
      config,
      environmentGuess,
    },
    warnings: [],
  };
}

export function matchDcApiUrl(input: string): { accountGuid: string } | undefined {
  const url = absoluteUrl(input);
  if (!url || url.protocol !== 'https:' || url.hostname.toLowerCase() !== DC_API_HOST)
    return undefined;
  const match = url.pathname.match(/^\/v3\/([^/]+)\/?$/i);
  return match ? { accountGuid: decodeURIComponent(match[1]) } : undefined;
}

export function isDcsGifUrl(input: string): boolean {
  const url = absoluteUrl(input);
  return Boolean(
    url && /(^|\/)dcs\.gif$/i.test(url.pathname) && /oracleinfinity\.io$/i.test(url.hostname),
  );
}

export function matchInfinityLibraryUrl(
  input: string,
): { name: string; resourceType: 'javascript' | 'stylesheet' | 'other' } | undefined {
  const url = absoluteUrl(input);
  if (!url || !/oracleinfinity\.io$/i.test(url.hostname)) return undefined;
  const fileName = decodeURIComponent(url.pathname.split('/').filter(Boolean).at(-1) ?? '');
  const extension = fileName.match(/\.([a-z0-9]+)$/i)?.[1].toLowerCase();
  const resourceType =
    extension === 'js' || extension === 'mjs'
      ? 'javascript'
      : extension === 'css'
        ? 'stylesheet'
        : 'other';
  const isStaticResource = ['js', 'mjs', 'css', 'map', 'wasm'].includes(extension ?? '');
  const isUbiResource = /(?:^|\/)ubi(?:[./_-]|\/)/i.test(url.pathname);
  return isStaticResource || isUbiResource
    ? { name: fileName || 'Infinity resource', resourceType }
    : undefined;
}

export function isInfinityLikeUrl(input: string): boolean {
  const url = absoluteUrl(input);
  return Boolean(url && /oracleinfinity\.io$/i.test(url.hostname));
}
