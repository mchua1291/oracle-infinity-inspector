import type { ParsedDcsGifEvent, ParserResult } from '../models';
import { isDcsGifUrl } from '../infinity/infinityUrlPatterns';

export function parseDcsGif(input: string): ParserResult<ParsedDcsGifEvent> {
  if (!isDcsGifUrl(input)) {
    return {
      status: 'failed',
      reason: 'The request is not an Oracle Infinity dcs.gif URL.',
      warnings: [],
    };
  }
  try {
    const url = new URL(input.startsWith('//') ? `https:${input}` : input);
    const parameters: Record<string, string[]> = {};
    url.searchParams.forEach((value, name) => {
      parameters[name] = [...(parameters[name] ?? []), value];
    });
    const wtDl = parameters['wt.dl']?.at(-1);
    const eventKind =
      wtDl === '0'
        ? 'page-view'
        : wtDl === '1'
          ? 'click-event'
          : wtDl
            ? 'event-code-specific'
            : 'unknown';
    return { status: 'success', data: { eventKind, wtDl, parameters }, warnings: [] };
  } catch {
    return {
      status: 'failed',
      reason: 'The dcs.gif request URL could not be parsed safely.',
      warnings: [],
    };
  }
}
