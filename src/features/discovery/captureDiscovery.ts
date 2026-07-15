import { evaluateInspectedValue } from '../chrome/inspectedWindowClient';
import { scanSensitiveValue } from '../infinity/sensitiveValueScanner';
import {
  DiscoverySnapshotSchema,
  type DiscoveryField,
  type DiscoveryLayer,
  type DiscoveryProviderId,
  type DiscoverySnapshot,
  type DiscoveryTechnologyEvidence,
} from './discoveryModels';
import {
  buildDiscoveryPageProbeExpression,
  type RawDiscoveryField,
  type RawDiscoveryProbe,
} from './pageProbe';

export interface DiscoveryCaptureResult {
  snapshot: DiscoverySnapshot;
  technologies: DiscoveryTechnologyEvidence[];
}

const providers = new Set<DiscoveryProviderId>(['google', 'adobe', 'tealium']);
const states = new Set([
  'populated',
  'empty-string',
  'null',
  'empty-array',
  'empty-object',
  'unavailable',
  'unsupported',
]);
const valueTypes = new Set([
  'string',
  'number',
  'boolean',
  'null',
  'undefined',
  'array',
  'object',
  'bigint',
  'function',
  'symbol',
  'date',
  'dom-node',
  'unknown',
]);

function providerId(value: unknown): DiscoveryProviderId | undefined {
  return typeof value === 'string' && providers.has(value as DiscoveryProviderId)
    ? (value as DiscoveryProviderId)
    : undefined;
}

function fieldName(path: string): string {
  return path.match(/\.([A-Za-z_$][\w$]*)$/)?.[1] ?? path.match(/\["([^"]+)"\]$/)?.[1] ?? path;
}

function sensitivityFor(field: RawDiscoveryField) {
  const name = fieldName(field.path);
  const scanValue =
    field.value === null || typeof field.value === 'object' ? null : String(field.value);
  if (scanValue && /(?:time|timestamp|date)$/i.test(name) && /^\d{10}(?:\d{3})?$/.test(scanValue))
    return { sensitivity: 'none' as const, reasons: [] };
  return scanSensitiveValue(name, scanValue);
}

function normalizeField(
  raw: RawDiscoveryField,
  snapshotId: string,
  layerIndex: number,
  fieldIndex: number,
  provider: DiscoveryProviderId,
  sourceObject: string,
): DiscoveryField {
  const sensitivity = sensitivityFor(raw);
  const value =
    raw.value === null ||
    typeof raw.value === 'string' ||
    typeof raw.value === 'number' ||
    typeof raw.value === 'boolean'
      ? raw.value
      : String(raw.value).slice(0, 2000);
  return {
    id: `${snapshotId}:layer-${layerIndex}:field-${fieldIndex}`,
    providerId: provider,
    sourceObject,
    path: typeof raw.path === 'string' ? raw.path.slice(0, 1000) : sourceObject,
    value,
    valueType: valueTypes.has(raw.valueType)
      ? (raw.valueType as DiscoveryField['valueType'])
      : 'unknown',
    state: states.has(raw.state) ? (raw.state as DiscoveryField['state']) : 'unsupported',
    entryIndex:
      Number.isInteger(raw.entryIndex) && Number(raw.entryIndex) >= 0
        ? Number(raw.entryIndex)
        : undefined,
    truncated: raw.truncated === true,
    sensitivity: sensitivity.sensitivity,
    sensitivityReasons: sensitivity.reasons,
  };
}

function normalizeProbe(raw: RawDiscoveryProbe): DiscoveryCaptureResult {
  const capturedAt = typeof raw.capturedAt === 'string' ? raw.capturedAt : new Date().toISOString();
  const snapshotId = `discovery-snapshot:${capturedAt}:${crypto.randomUUID()}`;
  const layers: DiscoveryLayer[] = (Array.isArray(raw.layers) ? raw.layers : [])
    .slice(0, 12)
    .flatMap((layer, layerIndex) => {
      const provider = providerId(layer.providerId);
      if (!provider || typeof layer.objectName !== 'string') return [];
      const fields = (Array.isArray(layer.fields) ? layer.fields : [])
        .slice(0, 500)
        .map((field, fieldIndex) =>
          normalizeField(field, snapshotId, layerIndex, fieldIndex, provider, layer.objectName),
        );
      return [
        {
          providerId: provider,
          objectName: layer.objectName.slice(0, 100),
          label: typeof layer.label === 'string' ? layer.label.slice(0, 200) : layer.objectName,
          kind:
            layer.kind === 'queue' || layer.kind === 'runtime' ? layer.kind : ('object' as const),
          totalEntries:
            Number.isInteger(layer.totalEntries) && layer.totalEntries >= 0
              ? layer.totalEntries
              : 0,
          truncated: layer.truncated === true,
          fields,
        },
      ];
    });
  const snapshot = DiscoverySnapshotSchema.parse({
    id: snapshotId,
    capturedAt,
    pageUrl: typeof raw.pageUrl === 'string' ? raw.pageUrl : '',
    layers,
  });
  const technologies: DiscoveryTechnologyEvidence[] = (
    Array.isArray(raw.technologies) ? raw.technologies : []
  ).flatMap((technology) => {
    const provider = providerId(technology.providerId);
    if (!provider || typeof technology.label !== 'string') return [];
    const technologyKind =
      technology.technologyKind === 'tag-manager' ||
      technology.technologyKind === 'analytics' ||
      technology.technologyKind === 'collector'
        ? technology.technologyKind
        : ('data-layer' as const);
    return [
      {
        id: `discovery:${provider}:${technologyKind}:${technology.identifier ?? technology.label}`,
        providerId: provider,
        technologyKind,
        label: technology.label.slice(0, 200),
        identifier:
          typeof technology.identifier === 'string'
            ? technology.identifier.slice(0, 200)
            : undefined,
        source: 'page-context' as const,
        confidence: 'direct' as const,
        evidence:
          typeof technology.evidence === 'string'
            ? technology.evidence.slice(0, 1000)
            : 'A supported page-context object was observed.',
        observedAt: capturedAt,
      },
    ];
  });
  return { snapshot, technologies };
}

export async function captureDiscoverySnapshot(): Promise<DiscoveryCaptureResult> {
  const raw = await evaluateInspectedValue<RawDiscoveryProbe>(buildDiscoveryPageProbeExpression());
  if (!raw || typeof raw !== 'object')
    throw new Error('The inspected page did not return a discovery snapshot.');
  return normalizeProbe(raw);
}
