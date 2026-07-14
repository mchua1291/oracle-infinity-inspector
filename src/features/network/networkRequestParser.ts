import type {
  OracleNetworkObservation,
  OracleParameterCatalogEntry,
  ParserResult,
} from '../models';
import {
  matchDcApiUrl,
  matchInfinityLibraryUrl,
  parseCxTagLoaderUrl,
} from '../infinity/infinityUrlPatterns';
import { createObservedParameter } from '../infinity/parameterClassifier';
import { classifySourceType } from '../infinity/sourceTypeClassifier';
import type { HarEntry } from './harTypes';
import { parseDcApiBody } from './dcapiParser';
import { parseDcsGif } from './dcsGifParser';

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
  const requestFailed =
    common.statusCode >= 400 ? [`Oracle request returned HTTP ${common.statusCode}.`] : [];

  if (sourceType === 'cx-tag-loader') {
    const parsed = parseCxTagLoaderUrl(entry.request.url);
    const id = `network-loader:${crypto.randomUUID()}`;
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
    const id = `library:${crypto.randomUUID()}`;
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
    const id = `dcs:${crypto.randomUUID()}`;
    const parameters = Object.entries(parsed.data.parameters).flatMap(([name, values]) =>
      values.map((value) =>
        createObservedParameter(
          {
            name,
            value,
            sourceType,
            eventTimestamp: common.timestamp,
            eventId: id,
            eventUrl: entry.request.url,
            origin: 'query-string',
          },
          importedCatalog,
        ),
      ),
    );
    const observation: OracleNetworkObservation = {
      id,
      ...common,
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
    const parsed = parseDcApiBody(entry.request.postData?.text);
    if (parsed.status === 'failed') {
      const id = `dcapi:${crypto.randomUUID()}`;
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
      const id = `dcapi:${crypto.randomUUID()}:${event.index}`;
      const parameters = Object.entries(event.parameters).map(([name, value]) =>
        createObservedParameter(
          {
            name,
            value,
            sourceType,
            eventTimestamp: common.timestamp,
            eventId: id,
            eventUrl: entry.request.url,
            origin: event.origins[name],
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

  const id = `unknown:${crypto.randomUUID()}`;
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
