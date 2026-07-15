import type { DiagnosticSession, ObservedParameter } from '../models';
import type {
  DiscoveryField,
  DiscoveryReuseAssessment,
  DiscoverySnapshot,
} from './discoveryModels';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function canonicalDiscoveryPath(field: DiscoveryField): string {
  return (
    field.path.replace(new RegExp(`^${escapeRegExp(field.sourceObject)}(?:\\[\\d+\\])?\\.?`), '') ||
    field.sourceObject
  );
}

export function discoveryFieldName(field: DiscoveryField): string {
  const canonical = canonicalDiscoveryPath(field);
  return (
    canonical.match(/\.([A-Za-z_$][\w$]*)$/)?.[1] ??
    canonical.match(/\["([^"]+)"\]$/)?.[1] ??
    canonical
  );
}

function comparableValue(value: DiscoveryField['value'] | ObservedParameter['value']): string {
  return value === null ? 'null' : String(value);
}

export function analyzeDiscoveryReuse(
  snapshot: DiscoverySnapshot,
  session: DiagnosticSession,
): DiscoveryReuseAssessment[] {
  const parameters = session.networkObservations.flatMap((event) => event.parameters);
  const latestFields = new Map<string, DiscoveryField>();
  for (const field of snapshot.layers.flatMap((layer) => layer.fields)) {
    if (field.state === 'unsupported' || field.state === 'unavailable') continue;
    latestFields.set(
      `${field.providerId}|${field.sourceObject}|${canonicalDiscoveryPath(field)}`,
      field,
    );
  }

  return [...latestFields.values()]
    .map((field): DiscoveryReuseAssessment => {
      const canonicalPath = canonicalDiscoveryPath(field);
      const name = discoveryFieldName(field);
      const candidateNames = new Set([canonicalPath.toLowerCase(), name.toLowerCase()]);
      const matching = parameters.filter((parameter) =>
        candidateNames.has(parameter.name.toLowerCase()),
      );
      const matchingParameterNames = [...new Set(matching.map((parameter) => parameter.name))];
      const empty = ['empty-string', 'null', 'empty-array', 'empty-object'].includes(field.state);
      if (empty)
        return {
          id: `reuse:${field.id}`,
          field,
          canonicalPath,
          fieldName: name,
          status: 'empty-or-null',
          matchingParameterNames,
          rationale: 'The discovered source is present but currently has no usable value.',
        };
      if (!matching.length)
        return {
          id: `reuse:${field.id}`,
          field,
          canonicalPath,
          fieldName: name,
          status: 'available-not-collected',
          matchingParameterNames,
          rationale:
            'A populated source value is available, but no observed Infinity parameter has the same field name.',
        };
      const valueMatches = matching.some(
        (parameter) => comparableValue(parameter.value) === comparableValue(field.value),
      );
      return valueMatches
        ? {
            id: `reuse:${field.id}`,
            field,
            canonicalPath,
            fieldName: name,
            status: 'already-collected',
            matchingParameterNames,
            rationale: 'An observed Infinity parameter has the same name and value.',
          }
        : {
            id: `reuse:${field.id}`,
            field,
            canonicalPath,
            fieldName: name,
            status: 'different-value',
            matchingParameterNames,
            rationale: 'Infinity uses the same field name but the observed value differs.',
          };
    })
    .sort((left, right) => {
      const priority = {
        'available-not-collected': 0,
        'empty-or-null': 1,
        'different-value': 2,
        'already-collected': 3,
      };
      return (
        priority[left.status] - priority[right.status] ||
        left.canonicalPath.localeCompare(right.canonicalPath)
      );
    });
}
