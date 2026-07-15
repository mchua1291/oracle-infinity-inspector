import type { DiscoveryProviderId } from './discoveryModels';

export interface RawDiscoveryField {
  path: string;
  value: string | number | boolean | null;
  valueType: string;
  state: string;
  entryIndex?: number;
  truncated: boolean;
}

export interface RawDiscoveryLayer {
  providerId: DiscoveryProviderId;
  objectName: string;
  label: string;
  kind: 'queue' | 'object' | 'runtime';
  totalEntries: number;
  truncated: boolean;
  fields: RawDiscoveryField[];
}

export interface RawDiscoveryTechnology {
  providerId: DiscoveryProviderId;
  technologyKind: 'tag-manager' | 'analytics' | 'data-layer' | 'collector';
  label: string;
  identifier?: string;
  evidence: string;
}

export interface RawDiscoveryProbe {
  capturedAt: string;
  pageUrl: string;
  layers: RawDiscoveryLayer[];
  technologies: RawDiscoveryTechnology[];
}

function pageProbe(): RawDiscoveryProbe {
  const maxDepth = 6;
  const maxFieldsPerLayer = 500;
  const maxQueueEntries = 100;
  const maxStringLength = 2000;
  const layers: RawDiscoveryLayer[] = [];
  const technologies: RawDiscoveryTechnology[] = [];
  const technologyKeys = new Set<string>();

  const addTechnology = (technology: RawDiscoveryTechnology) => {
    const key = `${technology.providerId}|${technology.technologyKind}|${technology.identifier ?? technology.label}`;
    if (technologyKeys.has(key)) return;
    technologyKeys.add(key);
    technologies.push(technology);
  };

  const ownValue = (target: object, property: string): unknown => {
    try {
      const descriptor = Object.getOwnPropertyDescriptor(target, property);
      return descriptor && 'value' in descriptor ? descriptor.value : undefined;
    } catch {
      return undefined;
    }
  };

  const globalValue = (name: string): unknown => ownValue(window, name);
  const googleLayerNames = new Set(['dataLayer']);
  for (const script of Array.from(document.scripts)) {
    const source = script.getAttribute('src') ?? '';
    if (/googletagmanager\.com\/gtm\.js/i.test(source)) {
      try {
        const customName = new URL(source, location.href).searchParams.get('l');
        if (customName && /^[A-Za-z_$][\w$]{0,79}$/.test(customName))
          googleLayerNames.add(customName);
      } catch {
        // A malformed source URL is not useful discovery evidence.
      }
    }
    const inline = (script.textContent ?? '').slice(0, 50_000);
    const inlineLayer = inline.match(
      /["']([A-Za-z_$][\w$]{0,79})["']\s*,\s*["']GTM-[A-Z0-9-]+["']/i,
    )?.[1];
    if (inlineLayer) googleLayerNames.add(inlineLayer);
  }

  const candidates: Array<{
    providerId: DiscoveryProviderId;
    objectName: string;
    label: string;
    kind: 'queue' | 'object' | 'runtime';
    value: unknown;
  }> = [];
  for (const objectName of googleLayerNames) {
    const value = globalValue(objectName);
    if (value !== undefined)
      candidates.push({
        providerId: 'google',
        objectName,
        label:
          objectName === 'dataLayer' ? 'Google dataLayer' : `Google data layer (${objectName})`,
        kind: 'queue',
        value,
      });
  }

  const adobeDataLayer = globalValue('adobeDataLayer');
  if (adobeDataLayer !== undefined)
    candidates.push({
      providerId: 'adobe',
      objectName: 'adobeDataLayer',
      label: 'Adobe Client Data Layer',
      kind: 'queue',
      value: adobeDataLayer,
    });
  const digitalData = globalValue('digitalData');
  const adobeRuntimeDetected =
    globalValue('_satellite') !== undefined ||
    globalValue('AppMeasurement') !== undefined ||
    globalValue('s_gi') !== undefined;
  if (digitalData !== undefined && adobeRuntimeDetected)
    candidates.push({
      providerId: 'adobe',
      objectName: 'digitalData',
      label: 'digitalData object',
      kind: 'object',
      value: digitalData,
    });
  const utagData = globalValue('utag_data');
  if (utagData !== undefined)
    candidates.push({
      providerId: 'tealium',
      objectName: 'utag_data',
      label: 'Tealium Universal Data Object',
      kind: 'object',
      value: utagData,
    });
  const utag = globalValue('utag');
  if (utag && typeof utag === 'object') {
    const runtimeData = ownValue(utag, 'data');
    if (runtimeData !== undefined)
      candidates.push({
        providerId: 'tealium',
        objectName: 'utag.data',
        label: 'Tealium enriched runtime data',
        kind: 'runtime',
        value: runtimeData,
      });
  }

  const globalTechnologyChecks: Array<{
    name: string;
    providerId: DiscoveryProviderId;
    technologyKind: RawDiscoveryTechnology['technologyKind'];
    label: string;
    evidence: string;
  }> = [
    {
      name: 'google_tag_manager',
      providerId: 'google',
      technologyKind: 'tag-manager',
      label: 'Google Tag Manager',
      evidence: 'The google_tag_manager page-context object is present.',
    },
    {
      name: 'gtag',
      providerId: 'google',
      technologyKind: 'analytics',
      label: 'Google tag / Google Analytics',
      evidence: 'The gtag page-context function is present.',
    },
    {
      name: '_satellite',
      providerId: 'adobe',
      technologyKind: 'tag-manager',
      label: 'Adobe Experience Platform Tags',
      evidence: 'The _satellite page-context object is present.',
    },
    {
      name: 'AppMeasurement',
      providerId: 'adobe',
      technologyKind: 'analytics',
      label: 'Adobe Analytics (AppMeasurement)',
      evidence: 'The AppMeasurement page-context constructor is present.',
    },
    {
      name: 's_gi',
      providerId: 'adobe',
      technologyKind: 'analytics',
      label: 'Adobe Analytics (AppMeasurement)',
      evidence: 'The s_gi AppMeasurement factory is present.',
    },
    {
      name: 'alloy',
      providerId: 'adobe',
      technologyKind: 'collector',
      label: 'Adobe Experience Platform Web SDK',
      evidence: 'The default alloy Web SDK instance is present.',
    },
    {
      name: 'utag',
      providerId: 'tealium',
      technologyKind: 'tag-manager',
      label: 'Tealium iQ',
      evidence: 'The utag page-context object is present.',
    },
  ];
  for (const check of globalTechnologyChecks)
    if (globalValue(check.name) !== undefined)
      addTechnology({
        providerId: check.providerId,
        technologyKind: check.technologyKind,
        label: check.label,
        evidence: check.evidence,
      });

  const childPath = (parent: string, key: string, arrayIndex: boolean): string => {
    if (arrayIndex) return `${parent}[${key}]`;
    return /^[A-Za-z_$][\w$]*$/.test(key)
      ? `${parent}.${key}`
      : `${parent}[${JSON.stringify(key)}]`;
  };

  for (const candidate of candidates) {
    const fields: RawDiscoveryField[] = [];
    let layerTruncated = false;
    const addField = (field: RawDiscoveryField) => {
      if (fields.length >= maxFieldsPerLayer) {
        layerTruncated = true;
        return;
      }
      fields.push(field);
    };

    const visit = (
      value: unknown,
      path: string,
      depth: number,
      entryIndex: number | undefined,
      seen: WeakSet<object>,
    ) => {
      if (fields.length >= maxFieldsPerLayer) {
        layerTruncated = true;
        return;
      }
      if (value === null) {
        addField({
          path,
          value: null,
          valueType: 'null',
          state: 'null',
          entryIndex,
          truncated: false,
        });
        return;
      }
      const valueType = typeof value;
      if (valueType === 'string') {
        const stringValue = value as string;
        addField({
          path,
          value: stringValue.slice(0, maxStringLength),
          valueType: 'string',
          state: stringValue === '' ? 'empty-string' : 'populated',
          entryIndex,
          truncated: stringValue.length > maxStringLength,
        });
        return;
      }
      if (valueType === 'number') {
        const numberValue = value as number;
        addField({
          path,
          value: Number.isFinite(numberValue) ? numberValue : String(numberValue),
          valueType: 'number',
          state: 'populated',
          entryIndex,
          truncated: false,
        });
        return;
      }
      if (valueType === 'boolean') {
        addField({
          path,
          value: value as boolean,
          valueType: 'boolean',
          state: 'populated',
          entryIndex,
          truncated: false,
        });
        return;
      }
      if (valueType === 'undefined') {
        addField({
          path,
          value: null,
          valueType: 'undefined',
          state: 'unavailable',
          entryIndex,
          truncated: false,
        });
        return;
      }
      if (valueType === 'bigint' || valueType === 'symbol' || valueType === 'function') {
        addField({
          path,
          value: valueType === 'function' ? '[Function]' : String(value),
          valueType,
          state: 'unsupported',
          entryIndex,
          truncated: false,
        });
        return;
      }
      if (!value || typeof value !== 'object') {
        addField({
          path,
          value: String(value),
          valueType: 'unknown',
          state: 'unsupported',
          entryIndex,
          truncated: false,
        });
        return;
      }
      if (typeof Node !== 'undefined' && value instanceof Node) {
        addField({
          path,
          value: `[${value.nodeName}]`,
          valueType: 'dom-node',
          state: 'unsupported',
          entryIndex,
          truncated: false,
        });
        return;
      }
      if (value instanceof Date) {
        let dateValue = '[Invalid Date]';
        try {
          dateValue = (value as Date).toISOString();
        } catch {
          // Preserve the invalid-date marker.
        }
        addField({
          path,
          value: dateValue,
          valueType: 'date',
          state: 'populated',
          entryIndex,
          truncated: false,
        });
        return;
      }
      if (seen.has(value)) {
        addField({
          path,
          value: '[Circular]',
          valueType: 'object',
          state: 'unsupported',
          entryIndex,
          truncated: false,
        });
        return;
      }
      if (depth >= maxDepth) {
        addField({
          path,
          value: '[Maximum depth]',
          valueType: Array.isArray(value) ? 'array' : 'object',
          state: 'unsupported',
          entryIndex,
          truncated: true,
        });
        return;
      }
      seen.add(value);
      let descriptors: PropertyDescriptorMap;
      try {
        descriptors = Object.getOwnPropertyDescriptors(value);
      } catch {
        addField({
          path,
          value: '[Unreadable object]',
          valueType: 'object',
          state: 'unsupported',
          entryIndex,
          truncated: false,
        });
        return;
      }
      const keys = Object.keys(descriptors).filter((key) => key !== 'length');
      if (!keys.length) {
        addField({
          path,
          value: Array.isArray(value) ? '[]' : '{}',
          valueType: Array.isArray(value) ? 'array' : 'object',
          state: Array.isArray(value) ? 'empty-array' : 'empty-object',
          entryIndex,
          truncated: false,
        });
        return;
      }
      for (const key of keys) {
        const descriptor = descriptors[key];
        const nextPath = childPath(path, key, Array.isArray(value) && /^\d+$/.test(key));
        if (!('value' in descriptor)) {
          addField({
            path: nextPath,
            value: '[Getter]',
            valueType: 'unknown',
            state: 'unsupported',
            entryIndex,
            truncated: false,
          });
          continue;
        }
        visit(descriptor.value, nextPath, depth + 1, entryIndex, seen);
      }
    };

    const queue = Array.isArray(candidate.value) ? candidate.value : undefined;
    const totalEntries = queue ? queue.length : 1;
    if (queue) {
      const start = Math.max(0, queue.length - maxQueueEntries);
      if (start > 0) layerTruncated = true;
      for (let index = start; index < queue.length; index += 1)
        visit(queue[index], `${candidate.objectName}[${index}]`, 0, index, new WeakSet());
      if (!queue.length)
        addField({
          path: candidate.objectName,
          value: '[]',
          valueType: 'array',
          state: 'empty-array',
          truncated: false,
        });
    } else visit(candidate.value, candidate.objectName, 0, undefined, new WeakSet());

    layers.push({
      providerId: candidate.providerId,
      objectName: candidate.objectName,
      label: candidate.label,
      kind: candidate.kind,
      totalEntries,
      truncated: layerTruncated,
      fields,
    });
    addTechnology({
      providerId: candidate.providerId,
      technologyKind: 'data-layer',
      label: candidate.label,
      identifier: candidate.objectName,
      evidence: `The ${candidate.objectName} page-context object is present.`,
    });
  }

  return {
    capturedAt: new Date().toISOString(),
    pageUrl: location.href,
    layers,
    technologies,
  };
}

export function buildDiscoveryPageProbeExpression(): string {
  return `/* __ORACLE_INFINITY_DISCOVERY_PROBE__ */(${pageProbe.toString()})()`;
}
