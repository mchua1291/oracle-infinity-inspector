import { useMemo, useState } from 'react';
import type {
  DiagnosticSession,
  DiagnosticSeverity,
  DiagnosticWarning,
  ObservedParameter,
  PlatformEventKind,
  PlatformNetworkObservation,
  PlatformSourceType,
} from '../../features/models';
import type { PlatformAdapter } from '../../features/platform/platformAdapter';
import { platformAdapterForSession } from '../../features/platform/platformRegistry';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { SearchInput } from '../ui/SearchInput';

function isEmpty(parameter: ObservedParameter): boolean {
  return parameter.value === '' || parameter.value === null;
}

function severityTone(severity: DiagnosticSeverity): 'danger' | 'warning' | 'neutral' | 'info' {
  if (severity === 'high') return 'danger';
  if (severity === 'medium') return 'warning';
  if (severity === 'info') return 'info';
  return 'neutral';
}

export function NetworkEventsTab({ session }: { session: DiagnosticSession }) {
  const adapter = platformAdapterForSession(session);
  const [search, setSearch] = useState('');
  const [source, setSource] = useState<'all' | PlatformSourceType>('all');
  const [kind, setKind] = useState<'all' | PlatformEventKind>('all');
  const [warningOnly, setWarningOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const collectionEvents = useMemo(
    () => session.networkObservations.filter(adapter.isCollectionObservation),
    [adapter, session.networkObservations],
  );
  const sourceOptions = useMemo(
    () => ['all', ...new Set(collectionEvents.map((event) => event.sourceType))],
    [collectionEvents],
  );
  const kindOptions = useMemo(
    () => ['all', ...new Set(collectionEvents.map((event) => event.eventKind))],
    [collectionEvents],
  );
  const findingsByEvent = useMemo(() => {
    const byEvidence = new Map<string, DiagnosticWarning[]>();
    for (const warning of session.warnings) {
      for (const evidenceId of warning.evidenceIds) {
        const findings = byEvidence.get(evidenceId);
        if (findings) findings.push(warning);
        else byEvidence.set(evidenceId, [warning]);
      }
    }
    return new Map(
      collectionEvents.map((event) => {
        const findings = new Map<string, DiagnosticWarning>();
        for (const evidenceId of [event.id, ...event.parameters.map((parameter) => parameter.id)])
          for (const warning of byEvidence.get(evidenceId) ?? []) findings.set(warning.id, warning);
        return [event.id, [...findings.values()]];
      }),
    );
  }, [collectionEvents, session.warnings]);
  const eventSequence = useMemo(
    () => new Map(collectionEvents.map((event, index) => [event.id, index + 1])),
    [collectionEvents],
  );
  const filtered = useMemo(
    () =>
      collectionEvents.filter(
        (event) =>
          (source === 'all' || event.sourceType === source) &&
          (kind === 'all' || event.eventKind === kind) &&
          (!warningOnly ||
            event.warnings.length > 0 ||
            (findingsByEvent.get(event.id)?.length ?? 0) > 0) &&
          `${event.requestUrl} ${event.parameters.map((item) => `${item.name} ${item.value ?? 'null'}`).join(' ')}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [collectionEvents, findingsByEvent, source, kind, warningOnly, search],
  );
  const selected = filtered.find((event) => event.id === selectedId) ?? filtered[0];
  const selectedFindings = selected ? (findingsByEvent.get(selected.id) ?? []) : [];

  if (!collectionEvents.length)
    return (
      <EmptyState
        title={`No browser-visible ${adapter.identity.shortName} events`}
        detail={`Open DevTools before navigation, reload the page, and trigger the expected interactions. Backend ${adapter.identity.shortName} calls cannot appear here.`}
      />
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Captured events</h2>
          <p className="mt-1 text-sm text-stone-500">
            Select an event to review its complete raw payload and QA findings.
          </p>
        </div>
        <Badge tone="info">{collectionEvents.length} complete events</Badge>
      </div>

      <div className="grid gap-2 rounded-xl border border-stone-200 bg-white p-3 md:grid-cols-[1fr_auto_auto_auto]">
        <SearchInput
          aria-label="Search network events"
          placeholder="Search request, parameter, or observed value"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Filter
          label="Source filter"
          value={source}
          onChange={(value) => setSource(value as typeof source)}
          options={sourceOptions}
        />
        <Filter
          label="Event type filter"
          value={kind}
          onChange={(value) => setKind(value as typeof kind)}
          options={kindOptions}
        />
        <label className="flex items-center gap-2 px-2 text-xs">
          <input
            type="checkbox"
            checked={warningOnly}
            onChange={(event) => setWarningOnly(event.target.checked)}
          />
          Issues only
        </label>
      </div>

      <div className="grid items-start gap-4 2xl:grid-cols-[minmax(34rem,1fr)_minmax(32rem,44rem)]">
        <Card className="overflow-x-auto p-0">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-500">
              <tr>
                {['# / time', 'Event', 'Source', 'Response', 'Payload', 'Issues'].map((label) => (
                  <th key={label} className="px-3 py-2 font-semibold">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((event) => {
                const sequence = eventSequence.get(event.id) ?? 0;
                const issueCount =
                  event.warnings.length + (findingsByEvent.get(event.id)?.length ?? 0);
                const active = event.id === selected?.id;
                return (
                  <tr
                    key={event.id}
                    aria-selected={active}
                    tabIndex={0}
                    onClick={() => setSelectedId(event.id)}
                    onKeyDown={(keyEvent) => {
                      if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
                        keyEvent.preventDefault();
                        setSelectedId(event.id);
                      }
                    }}
                    className={`cursor-pointer border-t border-stone-100 align-top outline-none transition hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-oracle ${active ? 'bg-[#f7ebe8]' : ''}`}
                  >
                    <td className="whitespace-nowrap px-3 py-3">
                      <span className="font-semibold">#{sequence}</span>
                      <br />
                      <span className="text-stone-500">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </td>
                    <td className="max-w-xs px-3 py-3 font-medium">
                      {adapter.eventDisplayName(event)}
                    </td>
                    <td className="px-3 py-3">
                      <Badge
                        tone={event.sourceType === 'dcapi-browser-visible' ? 'info' : 'neutral'}
                      >
                        {event.sourceType}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {event.requestMethod} · {event.statusCode || '—'}
                    </td>
                    <td className="px-3 py-3">{event.parameters.length} parameters</td>
                    <td className="px-3 py-3">
                      <Badge tone={issueCount ? 'warning' : 'success'}>
                        {issueCount ? `${issueCount} issue${issueCount === 1 ? '' : 's'}` : 'Clear'}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filtered.length && (
            <div className="p-8 text-center text-sm text-stone-500">
              No events match the current filters.
            </div>
          )}
        </Card>
        <EventDetails
          event={selected}
          sequence={selected ? (eventSequence.get(selected.id) ?? 0) : 0}
          findings={selectedFindings}
          adapter={adapter}
        />
      </div>
    </div>
  );
}

function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-lg border border-stone-300 bg-white px-2 py-2 text-xs"
    >
      {options.map((option) => (
        <option key={option}>{option}</option>
      ))}
    </select>
  );
}

function EventDetails({
  event,
  sequence,
  findings,
  adapter,
}: {
  event?: PlatformNetworkObservation;
  sequence: number;
  findings: DiagnosticWarning[];
  adapter: PlatformAdapter;
}) {
  if (!event)
    return (
      <Card>
        <p className="text-sm text-stone-500">Select an event to inspect its complete payload.</p>
      </Card>
    );

  const groups = [
    {
      key: 'standard',
      title: 'Out-of-the-box parameters',
      description: `Matched to the verified ${adapter.identity.productName} parameter catalog.`,
      parameters: event.parameters.filter((parameter) => parameter.classification === 'standard'),
    },
    {
      key: 'custom',
      title: 'Custom parameters',
      description: `Implementation-defined parameters not reserved by the ${adapter.identity.productName} catalog.`,
      parameters: event.parameters.filter((parameter) => parameter.classification === 'custom'),
    },
    {
      key: 'unknown',
      title: 'Needs review',
      description: `Parameters without a match in the bundled ${adapter.identity.documentationLabel.toLowerCase()} catalog.`,
      parameters: event.parameters.filter((parameter) => parameter.classification === 'unknown'),
    },
  ];
  const emptyParameters = event.parameters.filter(isEmpty);

  return (
    <Card className="2xl:sticky 2xl:top-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            Event #{sequence}
          </p>
          <h3 className="mt-1 text-lg font-semibold">{adapter.eventDisplayName(event)}</h3>
        </div>
        <Badge tone={event.warnings.length || findings.length ? 'warning' : 'success'}>
          {event.requestBodyParseStatus}
        </Badge>
      </div>

      <dl className="mt-4 grid grid-cols-[8rem_1fr] gap-x-3 gap-y-2 text-xs">
        <dt className="text-stone-500">Timestamp</dt>
        <dd>{new Date(event.timestamp).toLocaleString()}</dd>
        <dt className="text-stone-500">Request</dt>
        <dd>{event.requestMethod}</dd>
        <dt className="text-stone-500">Response</dt>
        <dd>{event.responseStatus}</dd>
        {adapter.networkEventDetails(event).map((detail) => (
          <div className="contents" key={detail.label}>
            <dt className="text-stone-500">{detail.label}</dt>
            <dd className="break-all font-mono">{detail.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
          Full request URL
        </p>
        <p className="mt-1 max-h-28 overflow-auto break-all rounded-lg bg-stone-50 p-3 font-mono text-xs leading-5 text-stone-700">
          {event.requestUrl}
        </p>
      </div>

      {emptyParameters.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
          <p className="font-semibold">
            {emptyParameters.length} potential empty-value issue
            {emptyParameters.length === 1 ? '' : 's'}
          </p>
          <p className="mt-1">
            Empty strings and nulls are retained below so QA can confirm whether they should be
            populated or omitted.
          </p>
        </div>
      )}

      {event.warnings.length > 0 && (
        <ul className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
          {event.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}

      {findings.length > 0 && (
        <section className="mt-4 space-y-2" aria-label="QA findings">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold">QA findings</h4>
            <Badge tone="warning">{findings.length}</Badge>
          </div>
          {findings.map((finding) => (
            <div
              key={finding.id}
              className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-xs"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={severityTone(finding.severity)}>{finding.severity}</Badge>
                <p className="font-semibold">{finding.title}</p>
              </div>
              <p className="mt-2 leading-5 text-stone-700">{finding.message}</p>
              <p className="mt-2 leading-5">
                <span className="font-semibold">Investigate:</span> {finding.recommendation}
              </p>
              {finding.sourceUrl && (
                <a
                  href={finding.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block font-semibold text-sky-700 underline decoration-sky-300 underline-offset-2"
                >
                  {adapter.identity.guidanceLabel}
                </a>
              )}
            </div>
          ))}
        </section>
      )}

      <div className="mt-5 max-h-[55vh] space-y-5 overflow-auto pr-1">
        {groups.map(({ key, ...group }) => (
          <ParameterGroup key={key} {...group} adapter={adapter} />
        ))}
      </div>
    </Card>
  );
}

function ParameterGroup({
  title,
  description,
  parameters,
  adapter,
}: {
  title: string;
  description: string;
  parameters: ObservedParameter[];
  adapter: PlatformAdapter;
}) {
  return (
    <section>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold">{title}</h4>
          <p className="mt-0.5 text-xs text-stone-500">{description}</p>
        </div>
        <Badge>{parameters.length}</Badge>
      </div>
      {parameters.length ? (
        <div className="mt-2 overflow-x-auto rounded-lg border border-stone-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Parameter</th>
                <th className="px-3 py-2 font-semibold">Observed value</th>
                <th className="px-3 py-2 font-semibold">
                  Origin / {adapter.identity.productName} definition
                </th>
              </tr>
            </thead>
            <tbody>
              {parameters.map((parameter) => {
                const empty = isEmpty(parameter);
                return (
                  <tr
                    key={parameter.id}
                    className={`border-t border-stone-100 align-top ${empty ? 'bg-amber-50' : ''}`}
                  >
                    <td className="px-3 py-2 font-mono font-semibold">{parameter.name}</td>
                    <td className="max-w-xs break-all px-3 py-2">
                      {parameter.value === null ? (
                        <Badge tone="danger">null</Badge>
                      ) : parameter.value === '' ? (
                        <Badge tone="warning">empty string</Badge>
                      ) : (
                        parameter.value
                      )}
                    </td>
                    <td className="max-w-xs px-3 py-2">
                      <span className="text-stone-500">{parameter.origin}</span>
                      <br />
                      {parameter.catalogDisplayName && (
                        <span className="font-semibold">{parameter.catalogDisplayName}: </span>
                      )}
                      {parameter.catalogDescription ?? parameter.namingPattern}
                      {parameter.catalogSourceUrl && (
                        <a
                          href={parameter.catalogSourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 block font-semibold text-sky-700 underline decoration-sky-300 underline-offset-2"
                        >
                          {adapter.identity.documentationLabel}
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-2 rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-500">
          None observed in this event.
        </p>
      )}
    </section>
  );
}
