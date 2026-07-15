import type {
  DiscoveryComparisonEntry,
  DiscoveryField,
  DiscoverySnapshot,
} from './discoveryModels';

function fieldKey(field: DiscoveryField): string {
  return `${field.providerId}|${field.sourceObject}|${field.path}`;
}

function valueKey(field: DiscoveryField): string {
  return `${field.state}|${field.valueType}|${JSON.stringify(field.value)}`;
}

export function compareDiscoverySnapshots(
  before: DiscoverySnapshot,
  after: DiscoverySnapshot,
): DiscoveryComparisonEntry[] {
  const beforeFields = new Map(
    before.layers.flatMap((layer) => layer.fields).map((field) => [fieldKey(field), field]),
  );
  const afterFields = new Map(
    after.layers.flatMap((layer) => layer.fields).map((field) => [fieldKey(field), field]),
  );
  const keys = new Set([...beforeFields.keys(), ...afterFields.keys()]);
  return [...keys]
    .map((key): DiscoveryComparisonEntry => {
      const previous = beforeFields.get(key);
      const current = afterFields.get(key);
      const status = !previous
        ? 'added'
        : !current
          ? 'removed'
          : valueKey(previous) === valueKey(current)
            ? 'unchanged'
            : 'changed';
      return { key, status, before: previous, after: current };
    })
    .sort((left, right) => left.key.localeCompare(right.key));
}
