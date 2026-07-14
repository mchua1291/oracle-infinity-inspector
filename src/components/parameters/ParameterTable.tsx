import { useMemo, useState } from 'react';
import type { ObservedParameter } from '../../features/models';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { SearchInput } from '../ui/SearchInput';

export function ParameterTable({
  parameters,
  emptyTitle,
  documentationLabel = 'Platform documentation',
}: {
  parameters: ObservedParameter[];
  emptyTitle: string;
  documentationLabel?: string;
}) {
  const [search, setSearch] = useState('');
  const rows = useMemo(() => {
    const groups = new Map<string, ObservedParameter[]>();
    for (const parameter of parameters) {
      const matches = groups.get(parameter.name);
      if (matches) matches.push(parameter);
      else groups.set(parameter.name, [parameter]);
    }
    return [...groups.entries()]
      .map(([name, matches]) => ({
        name,
        matches,
        latest: matches.reduce((latest, item) =>
          item.eventTimestamp > latest.eventTimestamp ? item : latest,
        ),
        unique: new Set(matches.map((item) => item.value)).size,
      }))
      .filter((row) =>
        `${row.name} ${row.matches.map((item) => item.value).join(' ')}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      );
  }, [parameters, search]);
  if (!parameters.length)
    return (
      <EmptyState
        title={emptyTitle}
        detail="Only observed parameters are reported. Trigger an event or adjust filters after reloading with DevTools open."
      />
    );
  return (
    <div className="space-y-3">
      <SearchInput
        aria-label="Search parameters"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search observed parameter names and values"
      />
      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-stone-50 text-stone-500">
            <tr>
              {[
                'Parameter',
                'Latest observed value',
                'Source / origin',
                'Last seen',
                'Description / naming',
                'Sensitivity',
                'Observations',
              ].map((label) => (
                <th key={label} className="px-3 py-2 font-semibold">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ name, latest, matches, unique }) => (
              <tr key={name} className="border-t border-stone-100 align-top">
                <td className="px-3 py-3 font-mono font-semibold">{name}</td>
                <td className="max-w-xs break-all px-3 py-3">
                  {latest.value === null
                    ? 'null'
                    : latest.value === ''
                      ? 'empty string'
                      : latest.value}
                </td>
                <td className="px-3 py-3">
                  {latest.sourceType}
                  <br />
                  <span className="text-stone-500">{latest.origin}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                  {new Date(latest.eventTimestamp).toLocaleTimeString()}
                </td>
                <td className="max-w-sm px-3 py-3">
                  {latest.catalogDisplayName && (
                    <span className="font-semibold">{latest.catalogDisplayName}: </span>
                  )}
                  {latest.catalogDescription ?? latest.namingPattern}
                  {latest.catalogSourceUrl && (
                    <a
                      href={latest.catalogSourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block font-semibold text-sky-700 underline"
                    >
                      {documentationLabel}
                    </a>
                  )}
                  {latest.reportingNameNote && (
                    <p className="mt-1 text-stone-500">{latest.reportingNameNote}</p>
                  )}
                </td>
                <td className="px-3 py-3">
                  <Badge tone={latest.sensitivity === 'none' ? 'neutral' : 'warning'}>
                    {latest.sensitivity}
                  </Badge>
                </td>
                <td className="px-3 py-3">
                  {matches.length} total
                  <br />
                  <span className="text-stone-500">{unique} unique</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
