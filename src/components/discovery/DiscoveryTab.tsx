import { useMemo, useState } from 'react';
import type { DiagnosticSession } from '../../features/models';
import { compareDiscoverySnapshots } from '../../features/discovery/discoveryComparison';
import type {
  DiscoveryField,
  DiscoverySnapshot,
  DiscoveryState,
  DiscoveryTechnologyEvidence,
} from '../../features/discovery/discoveryModels';
import { analyzeDiscoveryReuse } from '../../features/discovery/reuseAnalyzer';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Notice } from '../ui/Notice';
import { SearchInput } from '../ui/SearchInput';

type WorkspaceView = 'reuse' | 'changes' | 'layers';

interface AggregatedTechnology {
  key: string;
  providerId: DiscoveryTechnologyEvidence['providerId'];
  technologyKind: DiscoveryTechnologyEvidence['technologyKind'];
  label: string;
  identifier?: string;
  environment?: string;
  confidence: DiscoveryTechnologyEvidence['confidence'];
  sources: DiscoveryTechnologyEvidence['source'][];
  evidence: string[];
}

export function DiscoveryTab({
  session,
  discovery,
  onCapture,
  onSetBaseline,
  onClearSnapshots,
}: {
  session: DiagnosticSession;
  discovery: DiscoveryState;
  onCapture: () => Promise<DiscoverySnapshot>;
  onSetBaseline: (snapshotId: string) => void;
  onClearSnapshots: () => void;
}) {
  const [view, setView] = useState<WorkspaceView>('reuse');
  const [query, setQuery] = useState('');
  const [provider, setProvider] = useState<'all' | 'google' | 'adobe' | 'tealium'>('all');
  const [capturing, setCapturing] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const latest = discovery.snapshots.at(-1);
  const baseline =
    discovery.snapshots.find((snapshot) => snapshot.id === discovery.baselineSnapshotId) ??
    discovery.snapshots[0];
  const comparison = useMemo(
    () =>
      baseline && latest && baseline.id !== latest.id
        ? compareDiscoverySnapshots(baseline, latest)
        : [],
    [baseline, latest],
  );
  const changed = comparison.filter((entry) => entry.status !== 'unchanged');
  const reuse = useMemo(
    () => (latest ? analyzeDiscoveryReuse(latest, session) : []),
    [latest, session],
  );
  const technologies = useMemo(
    () => aggregateTechnologies(discovery.technologies),
    [discovery.technologies],
  );
  const search = query.trim().toLowerCase();
  const filteredReuse = reuse.filter(
    (assessment) =>
      (provider === 'all' || assessment.field.providerId === provider) &&
      (!search ||
        `${assessment.field.sourceObject} ${assessment.canonicalPath} ${formatValue(assessment.field)} ${assessment.matchingParameterNames.join(' ')}`
          .toLowerCase()
          .includes(search)),
  );

  const capture = async () => {
    setCapturing(true);
    setError(undefined);
    try {
      const snapshot = await onCapture();
      setMessage(
        discovery.snapshots.length
          ? `Comparison captured from ${host(snapshot.pageUrl)}.`
          : `Baseline captured from ${host(snapshot.pageUrl)}. Perform the approved interaction, then capture again.`,
      );
    } catch (captureError) {
      setError(
        captureError instanceof Error
          ? captureError.message
          : 'Unable to inspect the supported page-context data objects.',
      );
    } finally {
      setCapturing(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              Existing implementation discovery
            </p>
            <h2 className="mt-1 text-lg font-semibold">Technology and reusable data workspace</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Identify supported tag managers and analytics platforms, inspect their browser-visible
              data objects, and compare those fields with observed Oracle Infinity payloads.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {discovery.snapshots.length > 0 && (
              <Button
                variant="secondary"
                onClick={() => {
                  onClearSnapshots();
                  setMessage('Discovery snapshots cleared. Technology evidence remains available.');
                }}
              >
                Clear snapshots
              </Button>
            )}
            <Button disabled={capturing} onClick={() => void capture()}>
              {capturing
                ? 'Capturing…'
                : discovery.snapshots.length
                  ? 'Capture comparison'
                  : 'Capture baseline'}
            </Button>
          </div>
        </div>
        <div className="mt-4">
          <Notice>
            Capture is read-only and on demand. It does not replace data-layer push functions or
            invoke client tracking APIs. Raw values remain local unless you explicitly export them.
          </Notice>
        </div>
        {message && <p className="mt-3 text-xs text-emerald-800">{message}</p>}
        {error && <p className="mt-3 text-xs text-red-700">{error}</p>}
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Technologies" value={technologies.length} />
          <Metric label="Data objects" value={latest?.layers.length ?? 0} />
          <Metric
            label="Observed fields"
            value={latest?.layers.reduce((count, layer) => count + layer.fields.length, 0) ?? 0}
          />
          <Metric
            label="Reuse candidates"
            value={reuse.filter((item) => item.status === 'available-not-collected').length}
            tone="info"
          />
          <Metric
            label="Changed fields"
            value={changed.length}
            tone={changed.length ? 'warning' : 'neutral'}
          />
        </dl>
      </Card>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Detected technology evidence</h2>
            <p className="mt-1 text-xs text-stone-500">
              DOM, network, and page-context evidence are combined without claiming which manager
              deployed Infinity.
            </p>
          </div>
          <Badge tone={technologies.length ? 'success' : 'neutral'}>
            {technologies.length ? `${technologies.length} detected` : 'none detected'}
          </Badge>
        </div>
        {technologies.length ? (
          <div className="grid gap-3 xl:grid-cols-3">
            {technologies.map((technology) => (
              <Card key={technology.key}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                      {providerLabel(technology.providerId)} · {technology.technologyKind}
                    </p>
                    <h3 className="mt-1 font-semibold">{technology.label}</h3>
                    {technology.identifier && (
                      <p className="mt-1 break-all font-mono text-xs text-stone-600">
                        {technology.identifier}
                      </p>
                    )}
                  </div>
                  <Badge tone={technology.confidence === 'direct' ? 'success' : 'warning'}>
                    {technology.confidence}
                  </Badge>
                </div>
                {technology.environment && (
                  <p className="mt-3 text-xs">
                    <span className="font-semibold">Environment:</span> {technology.environment}
                  </p>
                )}
                <p className="mt-3 text-xs text-stone-500">
                  Evidence: {technology.sources.join(', ')}
                </p>
                <ul className="mt-2 space-y-1 text-xs leading-5 text-stone-600">
                  {technology.evidence.slice(0, 3).map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <p className="text-sm text-stone-500">
              No supported Google, Adobe, or Tealium evidence has been observed yet. Reload once
              with DevTools open, then capture a baseline.
            </p>
          </Card>
        )}
      </section>

      {discovery.snapshots.length > 0 && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Snapshot sequence</h2>
              <p className="mt-1 text-xs text-stone-500">
                Select the approved before-state used by the comparison view.
              </p>
            </div>
            <Badge tone="info">{discovery.snapshots.length} captured</Badge>
          </div>
          <div className="mt-4 grid gap-2 xl:grid-cols-3">
            {discovery.snapshots.map((snapshot, index) => (
              <button
                key={snapshot.id}
                className={`rounded-lg border p-3 text-left text-xs transition ${snapshot.id === baseline?.id ? 'border-sky-300 bg-sky-50' : 'border-stone-200 hover:bg-stone-50'}`}
                onClick={() => onSetBaseline(snapshot.id)}
              >
                <span className="font-semibold">
                  {snapshot.id === baseline?.id ? 'Baseline' : `Snapshot ${index + 1}`}
                </span>
                {snapshot.id === latest?.id && <span className="ml-2 text-stone-500">latest</span>}
                <span className="mt-1 block text-stone-500">
                  {new Date(snapshot.capturedAt).toLocaleTimeString()} · {host(snapshot.pageUrl)}
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-0">
        <div className="border-b border-stone-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Discovery results</h2>
              <p className="mt-1 text-xs text-stone-500">
                Candidate mappings require client confirmation; name matching is intentionally
                conservative.
              </p>
            </div>
            <div className="flex flex-wrap gap-1 rounded-lg bg-stone-100 p-1">
              {(
                [
                  ['reuse', 'Infinity reuse'],
                  ['changes', 'Changes'],
                  ['layers', 'Data layers'],
                ] as const
              ).map(([name, label]) => (
                <button
                  key={name}
                  onClick={() => setView(name)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold ${view === name ? 'bg-white text-ink shadow-sm' : 'text-stone-600 hover:text-ink'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-[1fr_12rem]">
            <SearchInput
              aria-label="Search discovery fields"
              placeholder="Search object, path, value, or Infinity match"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <select
              aria-label="Filter discovery provider"
              value={provider}
              onChange={(event) => setProvider(event.target.value as typeof provider)}
              className="rounded-md border border-[#bcb6b1] bg-white px-3 py-2 text-sm"
            >
              <option value="all">All providers</option>
              <option value="google">Google</option>
              <option value="adobe">Adobe</option>
              <option value="tealium">Tealium</option>
            </select>
          </div>
        </div>

        {view === 'reuse' ? (
          <ReuseResults assessments={filteredReuse} hasSnapshot={Boolean(latest)} />
        ) : view === 'changes' ? (
          <ChangeResults
            entries={changed}
            hasComparison={comparison.length > 0}
            search={search}
            provider={provider}
          />
        ) : (
          <LayerResults snapshot={latest} search={search} provider={provider} />
        )}
      </Card>
    </div>
  );
}

function ReuseResults({
  assessments,
  hasSnapshot,
}: {
  assessments: ReturnType<typeof analyzeDiscoveryReuse>;
  hasSnapshot: boolean;
}) {
  if (!hasSnapshot)
    return <EmptyDetail>Capture a baseline to inspect reusable page-context data.</EmptyDetail>;
  if (!assessments.length)
    return <EmptyDetail>No supported fields match the current filters.</EmptyDetail>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-xs">
        <thead className="bg-stone-50 text-stone-500">
          <tr>
            {['Source field', 'Current value', 'Assessment', 'Infinity match'].map((label) => (
              <th key={label} className="px-4 py-3 font-semibold">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {assessments.map((assessment) => (
            <tr key={assessment.id} className="border-t border-stone-100 align-top">
              <td className="max-w-md px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{providerLabel(assessment.field.providerId)}</Badge>
                  <span className="font-semibold">{assessment.field.sourceObject}</span>
                  {assessment.field.sensitivity !== 'none' && (
                    <Badge tone="danger">{assessment.field.sensitivity}</Badge>
                  )}
                </div>
                <p className="mt-1 break-all font-mono text-[11px] text-stone-600">
                  {assessment.canonicalPath}
                </p>
              </td>
              <td className="max-w-sm px-4 py-3">
                <p className="break-all font-mono text-[11px]">{formatValue(assessment.field)}</p>
                <p className="mt-1 text-stone-500">
                  {assessment.field.valueType} · {assessment.field.state}
                </p>
              </td>
              <td className="max-w-sm px-4 py-3">
                <Badge tone={reuseTone(assessment.status)}>{reuseLabel(assessment.status)}</Badge>
                <p className="mt-2 leading-5 text-stone-600">{assessment.rationale}</p>
              </td>
              <td className="px-4 py-3">
                {assessment.matchingParameterNames.length
                  ? assessment.matchingParameterNames.join(', ')
                  : 'No exact name match'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChangeResults({
  entries,
  hasComparison,
  search,
  provider,
}: {
  entries: ReturnType<typeof compareDiscoverySnapshots>;
  hasComparison: boolean;
  search: string;
  provider: 'all' | 'google' | 'adobe' | 'tealium';
}) {
  if (!hasComparison)
    return (
      <EmptyDetail>
        Capture another snapshot after an approved interaction to see changes.
      </EmptyDetail>
    );
  const filtered = entries.filter((entry) => {
    const field = entry.after ?? entry.before;
    return (
      field &&
      (provider === 'all' || field.providerId === provider) &&
      (!search ||
        `${field.sourceObject} ${field.path} ${formatValue(field)}`.toLowerCase().includes(search))
    );
  });
  if (!filtered.length)
    return <EmptyDetail>No changed fields match the current filters.</EmptyDetail>;
  return (
    <div className="divide-y divide-stone-100">
      {filtered.map((entry) => {
        const field = entry.after ?? entry.before!;
        return (
          <div key={entry.key} className="grid gap-3 p-4 text-xs lg:grid-cols-[12rem_1fr_1fr]">
            <div>
              <Badge
                tone={
                  entry.status === 'changed'
                    ? 'warning'
                    : entry.status === 'added'
                      ? 'success'
                      : 'danger'
                }
              >
                {entry.status}
              </Badge>
              <p className="mt-2 font-semibold">{field.sourceObject}</p>
              <p className="mt-1 break-all font-mono text-[11px] text-stone-500">{field.path}</p>
            </div>
            <ValueBlock label="Before" field={entry.before} />
            <ValueBlock label="After" field={entry.after} />
          </div>
        );
      })}
    </div>
  );
}

function LayerResults({
  snapshot,
  search,
  provider,
}: {
  snapshot?: DiscoverySnapshot;
  search: string;
  provider: 'all' | 'google' | 'adobe' | 'tealium';
}) {
  if (!snapshot)
    return <EmptyDetail>Capture a baseline to open the data-layer explorer.</EmptyDetail>;
  const layers = snapshot.layers.filter(
    (layer) => provider === 'all' || layer.providerId === provider,
  );
  if (!layers.length)
    return <EmptyDetail>No supported data objects match the current filters.</EmptyDetail>;
  return (
    <div className="space-y-4 p-4">
      {layers.map((layer) => {
        const fields = layer.fields.filter(
          (field) =>
            !search || `${field.path} ${formatValue(field)}`.toLowerCase().includes(search),
        );
        return (
          <section
            key={`${layer.providerId}:${layer.objectName}`}
            className="rounded-xl border border-stone-200"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-50 px-4 py-3">
              <div>
                <h3 className="font-semibold">{layer.label}</h3>
                <p className="mt-1 font-mono text-[11px] text-stone-500">
                  window.{layer.objectName}
                </p>
              </div>
              <div className="flex gap-2">
                <Badge>{layer.kind}</Badge>
                <Badge tone={layer.truncated ? 'warning' : 'info'}>{fields.length} fields</Badge>
              </div>
            </div>
            {fields.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="text-stone-500">
                    <tr>
                      {['Path', 'Value', 'Type / state'].map((label) => (
                        <th key={label} className="px-4 py-2 font-semibold">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field) => (
                      <tr key={field.id} className="border-t border-stone-100 align-top">
                        <td className="max-w-xl break-all px-4 py-2 font-mono text-[11px]">
                          {field.path}
                        </td>
                        <td className="max-w-md break-all px-4 py-2 font-mono text-[11px]">
                          {formatValue(field)}
                        </td>
                        <td className="px-4 py-2">
                          {field.valueType} · {field.state}
                          {field.sensitivity !== 'none' && (
                            <span className="ml-2 text-red-700">{field.sensitivity}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="p-4 text-xs text-stone-500">No fields match this search.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

function ValueBlock({ label, field }: { label: string; field?: DiscoveryField }) {
  return (
    <div className="rounded-lg bg-stone-50 p-3">
      <p className="font-semibold text-stone-500">{label}</p>
      <p className="mt-2 break-all font-mono text-[11px]">
        {field ? formatValue(field) : 'Not present'}
      </p>
    </div>
  );
}

function EmptyDetail({ children }: { children: string }) {
  return <p className="p-6 text-sm text-stone-500">{children}</p>;
}

function Metric({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  tone?: 'neutral' | 'info' | 'warning';
}) {
  return (
    <div
      className={
        tone === 'warning'
          ? 'rounded-lg bg-amber-50 p-3'
          : tone === 'info'
            ? 'rounded-lg bg-sky-50 p-3'
            : 'rounded-lg bg-stone-50 p-3'
      }
    >
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className="mt-1 text-xl font-semibold">{value}</dd>
    </div>
  );
}

function aggregateTechnologies(evidence: DiscoveryTechnologyEvidence[]): AggregatedTechnology[] {
  const grouped = new Map<string, AggregatedTechnology>();
  for (const item of evidence) {
    const key = `${item.providerId}|${item.technologyKind}|${item.identifier ?? item.label}`;
    const current = grouped.get(key);
    if (current) {
      if (!current.sources.includes(item.source)) current.sources.push(item.source);
      if (!current.evidence.includes(item.evidence)) current.evidence.push(item.evidence);
      if (!current.environment && item.environment) current.environment = item.environment;
      if (item.confidence === 'direct') current.confidence = 'direct';
    } else {
      grouped.set(key, {
        key,
        providerId: item.providerId,
        technologyKind: item.technologyKind,
        label: item.label,
        identifier: item.identifier,
        environment: item.environment,
        confidence: item.confidence,
        sources: [item.source],
        evidence: [item.evidence],
      });
    }
  }
  return [...grouped.values()].sort(
    (left, right) =>
      left.providerId.localeCompare(right.providerId) || left.label.localeCompare(right.label),
  );
}

function providerLabel(provider: 'google' | 'adobe' | 'tealium'): string {
  return provider === 'google' ? 'Google' : provider === 'adobe' ? 'Adobe' : 'Tealium';
}

function formatValue(field: DiscoveryField): string {
  if (field.state === 'empty-string') return '[empty string]';
  if (field.state === 'null') return '[null]';
  if (field.value === null) return `[${field.state}]`;
  return String(field.value);
}

function reuseLabel(status: ReturnType<typeof analyzeDiscoveryReuse>[number]['status']): string {
  return status === 'already-collected'
    ? 'already collected'
    : status === 'available-not-collected'
      ? 'candidate to map'
      : status === 'different-value'
        ? 'different value'
        : 'empty / null';
}

function reuseTone(
  status: ReturnType<typeof analyzeDiscoveryReuse>[number]['status'],
): 'success' | 'info' | 'warning' | 'danger' {
  return status === 'already-collected'
    ? 'success'
    : status === 'available-not-collected'
      ? 'info'
      : status === 'different-value'
        ? 'warning'
        : 'danger';
}

function host(url: string): string {
  try {
    return new URL(url).hostname || url;
  } catch {
    return url || 'inspected page';
  }
}
