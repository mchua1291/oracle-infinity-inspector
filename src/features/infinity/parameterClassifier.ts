import type {
  InfinitySourceType,
  ObservedParameter,
  OracleParameterCatalogEntry,
  ParameterClassification,
} from '../models';
import { catalogMap } from './oracleParameterCatalog';
import { scanSensitiveValue } from './sensitiveValueScanner';

interface ParameterInput {
  name: string;
  value: string | null;
  sourceType: InfinitySourceType;
  eventTimestamp: string;
  eventId: string;
  eventUrl?: string;
  origin: ObservedParameter['origin'];
  occurrence?: number;
}

export interface ParameterClassificationResult {
  classification: ParameterClassification;
  catalogEntry?: OracleParameterCatalogEntry;
  namingPattern: string;
}

export function classifyParameterName(
  name: string,
  importedCatalog: OracleParameterCatalogEntry[] = [],
): ParameterClassificationResult {
  const entry = catalogMap(importedCatalog).get(name.toLowerCase());
  if (entry)
    return {
      classification: 'standard',
      catalogEntry: entry,
      namingPattern: 'Oracle catalog match',
    };

  if (/^wt\.[a-z0-9_]+$/i.test(name)) {
    return {
      classification: /^wt\.(?:i_|z_)/i.test(name) ? 'unknown' : 'custom',
      namingPattern: /^wt\.(?:i_|z_)/i.test(name)
        ? 'Oracle-reserved integration namespace without a catalog match'
        : 'Undocumented wt.* implementation parameter',
    };
  }
  if (/^(?:dcs|ext\.|ora\.z_)/i.test(name)) {
    return { classification: 'unknown', namingPattern: 'Oracle-like reserved prefix' };
  }
  if (/^[a-z][a-z0-9_.-]{1,79}$/i.test(name)) {
    return { classification: 'custom', namingPattern: 'implementation-defined parameter' };
  }
  return { classification: 'unknown', namingPattern: 'unrecognized naming pattern' };
}

export function createObservedParameter(
  input: ParameterInput,
  importedCatalog: OracleParameterCatalogEntry[] = [],
): ObservedParameter {
  const { occurrence = 0, ...observed } = input;
  const classification = classifyParameterName(input.name, importedCatalog);
  const sensitive = scanSensitiveValue(input.name, input.value);
  const catalogSensitivity = classification.catalogEntry?.sensitivity;
  const sensitivity =
    sensitive.sensitivity === 'token-or-secret' &&
    catalogSensitivity &&
    catalogSensitivity !== 'none'
      ? catalogSensitivity
      : sensitive.sensitivity === 'none' && catalogSensitivity
        ? catalogSensitivity
        : sensitive.sensitivity;
  return {
    id: `${input.eventId}:${input.origin}:${encodeURIComponent(input.name)}:${occurrence}`,
    ...observed,
    classification: classification.classification,
    sensitivity,
    catalogDisplayName: classification.catalogEntry?.displayName,
    catalogDescription: classification.catalogEntry?.description,
    catalogSourceUrl: classification.catalogEntry?.sourceUrl,
    reportingNameNote: classification.catalogEntry?.reportingNameNote,
    namingPattern: classification.namingPattern,
  };
}
