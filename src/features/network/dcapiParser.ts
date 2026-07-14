import type { ParsedDcApiRequest, ParserResult } from '../models';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function stringRecord(value: unknown): {
  value: Record<string, string | null>;
  invalidKeys: string[];
} {
  if (!isRecord(value)) return { value: {}, invalidKeys: ['<block>'] };
  const output: Record<string, string | null> = {};
  const invalidKeys: string[] = [];
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string' || entry === null) output[key] = entry;
    else invalidKeys.push(key);
  }
  return { value: output, invalidKeys };
}

export function parseDcApiBody(body: string | undefined): ParserResult<ParsedDcApiRequest> {
  if (body === undefined || body.trim() === '') {
    return {
      status: 'failed',
      reason:
        'The browser did not expose a DC API request body. It may be unavailable or compressed.',
      warnings: [],
    };
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(body);
  } catch {
    return { status: 'failed', reason: 'The DC API request body is not valid JSON.', warnings: [] };
  }
  if (!isRecord(decoded)) {
    return { status: 'failed', reason: 'The DC API payload must be a JSON object.', warnings: [] };
  }
  if (!Array.isArray(decoded.events) || decoded.events.length === 0) {
    return {
      status: 'failed',
      reason: 'The DC API payload must contain a non-empty events array.',
      warnings: [],
    };
  }

  const staticResult =
    decoded.static === undefined ? { value: {}, invalidKeys: [] } : stringRecord(decoded.static);
  const invalid: string[] = staticResult.invalidKeys.map((key) => `static.${key}`);
  const events = decoded.events.flatMap((entry, index) => {
    const eventResult = stringRecord(entry);
    invalid.push(...eventResult.invalidKeys.map((key) => `events[${index}].${key}`));
    if (Object.keys(eventResult.value).length === 0) return [];
    const parameters = { ...staticResult.value, ...eventResult.value };
    const origins = Object.fromEntries(
      Object.keys(parameters).map((key) => [
        key,
        key in eventResult.value ? 'dcapi-event' : 'dcapi-static',
      ]),
    ) as Record<string, 'dcapi-event' | 'dcapi-static'>;
    return [{ index, parameters, origins }];
  });

  if (events.length === 0) {
    return {
      status: 'failed',
      reason: 'No valid non-empty DC API events were found.',
      warnings: invalid,
    };
  }
  const data = { staticParameters: staticResult.value, events };
  return invalid.length
    ? {
        status: 'partial',
        data,
        reason: 'Some DC API values were not strings and were omitted.',
        warnings: invalid,
      }
    : { status: 'success', data, warnings: [] };
}
