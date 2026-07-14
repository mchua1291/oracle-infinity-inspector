import type {
  OracleNetworkObservation,
  OracleParameterCatalogEntry,
  ParserResult,
} from '../models';
import {
  matchDcApiUrl,
  matchDcsGifUrl,
  matchInfinityLibraryUrl,
  parseCxTagLoaderUrl,
} from '../infinity/infinityUrlPatterns';
import { createObservedParameter } from '../infinity/parameterClassifier';
import { classifySourceType } from '../infinity/sourceTypeClassifier';
import type { HarEntry } from './harTypes';
import { parseDcApiBody } from './dcapiParser';
import { parseDcsGif } from './dcsGifParser';

function stableHash(value: string): string {
  let hash = 0xcbf29ce484222325n;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= BigInt(value.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, '0');
}

export function networkRequestFingerprint(entry: HarEntry): string {
  return stableHash(
    [
      entry.startedDateTime ?? '',
      entry.request.method?.toUpperCase() ?? 'GET',
      entry.request.url,
      entry.request.postData?.mimeType ?? '',
      entry.request.postData?.text ?? '',
    ].join('\u001f'),
  );
}

function base(entry: HarEntry, sourceType: NonNullable<ReturnType<typeof classifySourceType>>) {
  const timestamp = entry.startedDateTime ?? new Date().toISOString();
  const statusCode = entry.response?.status ?? 0;
  return {
    timestamp,
    requestUrl: entry.request.url,
    requestMethod: entry.request.method ?? 'GET',
    statusCode,
    sourceType,
    responseStatus: statusCode
      ? `${statusCode} ${entry.response?.statusText ?? ''}`.trim()
      : 'Pending or unavailable',
  };
}

export function parseNetworkRequest(
  entry: HarEntry,
  importedCatalog: OracleParameterCatalogEntry[] = [],
): ParserResult<OracleNetworkObservation[]> {
  const sourceType = classifySourceType(entry.request.url);
  if (!sourceType) {
    return {
      status: 'failed',
      reason: 'The request is not recognized as Oracle Infinity network activity.',
      warnings: [],
    };
  }
  const common = base(entry, sourceType);
  const requestId = networkRequestFingerprint(entry);
  const requestFailed =
    common.statusCode >= 400 ? [`Oracle request returned HTTP ${common.statusCode}.`] : [];

  if (sourceType === 'cx-tag-loader') {
    const parsed = parseCxTagLoaderUrl(entry.request.url);
    const id = `network-loader:${requestId}`;
    const observation: OracleNetworkObservation = {
      id,
      ...common,
      accountGuid: parsed.status === 'failed' ? undefined : parsed.data.accountGuid,
      eventKind: 'loader',
      parameterCount: 0,
      requestBodyParseStatus: 'success',
      warnings: requestFailed,
      parameters: [],
    };
    return { status: 'success', data: [observation], warnings: requestFailed };
  }

  if (sourceType === 'infinity-library') {
    const library = matchInfinityLibraryUrl(entry.request.url);
    const id = `library:${requestId}`;
    const observation: OracleNetworkObservation = {
      id,
      ...common,
      libraryName: library?.name,
      libraryType: library?.resourceType,
      eventKind: 'library',
      parameterCount: 0,
      requestBodyParseStatus: 'success',
      warnings: requestFailed,
      parameters: [],
    };
    return { status: 'success', data: [observation], warnings: requestFailed };
  }

  if (sourceType === 'cx-tag-network') {
    const parsed = parseDcsGif(entry.request.url);
    if (parsed.status === 'failed') return parsed;
    const id = `dcs:${requestId}`;
    const accountGuid = matchDcsGifUrl(entry.request.url)?.accountGuid;
    const parameters = Object.entries(parsed.data.parameters).flatMap(([name, values]) =>
      values.map((value, occurrence) =>
        createObservedParameter(
          {
            name,
            value,
            sourceType,
            eventTimestamp: common.timestamp,
            eventId: id,
            eventUrl: entry.request.url,
            origin: 'query-string',
            occurrence,
          },
          importedCatalog,
        ),
      ),
    );
    const observation: OracleNetworkObservation = {
      id,
      ...common,
      accountGuid,
      eventKind: parsed.data.eventKind,
      wtDl: parsed.data.wtDl,
      parameterCount: parameters.length,
      requestBodyParseStatus: 'success',
      warnings: requestFailed,
      parameters,
    };
    return { status: 'success', data: [observation], warnings: requestFailed };
  }

  if (sourceType === 'dcapi-browser-visible') {
    const accountGuid = matchDcApiUrl(entry.request.url)?.accountGuid;
    if ((entry.request.method ?? 'GET').toUpperCase() !== 'POST') {
      const id = `dcapi:${requestId}`;
      const reason = `The documented DC API v3 collection endpoint expects POST, but ${entry.request.method ?? 'GET'} was observed.`;
      return {
        status: 'partial',
        data: [
          {
            id,
            ...common,
            accountGuid,
            eventKind: 'dcapi-batch',
            parameterCount: 0,
            requestBodyParseStatus: 'partial',
            warnings: [...requestFailed, reason],
            parameters: [],
          },
        ],
        reason,
        warnings: [reason],
      };
    }
    const parsed = parseDcApiBody(entry.request.postData?.text);
    if (parsed.status === 'failed') {
      const id = `dcapi:${requestId}`;
      const observation: OracleNetworkObservation = {
        id,
        ...common,
        accountGuid,
        eventKind: 'dcapi-batch',
        parameterCount: 0,
        requestBodyParseStatus: 'failed',
        warnings: [...requestFailed, parsed.reason],
        parameters: [],
      };
      return {
        status: 'partial',
        data: [observation],
        reason: parsed.reason,
        warnings: observation.warnings,
      };
    }
    const observations = parsed.data.events.map((event) => {
      const id = `dcapi:${requestId}:${event.index}`;
      const parameters = Object.entries(event.parameters).map(([name, value], occurrence) =>
        createObservedParameter(
          {
            name,
            value,
            sourceType,
            eventTimestamp: common.timestamp,
            eventId: id,
            eventUrl: entry.request.url,
            origin: event.origins[name],
            occurrence,
          },
          importedCatalog,
        ),
      );
      return {
        id,
        ...common,
        accountGuid,
        eventKind: 'dcapi-batch' as const,
        wtDl: event.parameters['wt.dl'] ?? undefined,
        parameterCount: parameters.length,
        requestBodyParseStatus: parsed.status,
        warnings: [...requestFailed, ...parsed.warnings],
        parameters,
      };
    });
    return parsed.status === 'partial'
      ? { status: 'partial', data: observations, reason: parsed.reason, warnings: parsed.warnings }
      : { status: 'success', data: observations, warnings: requestFailed };
  }

  const id = `unknown:${requestId}`;
  return {
    status: 'success',
    data: [
      {
        id,
        ...common,
        eventKind: 'unknown',
        parameterCount: 0,
        requestBodyParseStatus: 'partial',
        warnings: [
          'Infinity-like request did not match a verified endpoint pattern.',
          ...requestFailed,
        ],
        parameters: [],
      },
    ],
    warnings: ['Infinity-like request did not match a verified endpoint pattern.'],
  };
}
