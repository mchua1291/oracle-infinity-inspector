import type { DiagnosticSession, TimelineEntry } from '../../features/models';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';

export function EventTimelineTab({ session }: { session: DiagnosticSession }) {
  const loaderEntries: TimelineEntry[] = session.loaders.map((loader) => ({
    id: `loader:${loader.id}`,
    timestamp: loader.detectedAt,
    type: 'dom-loader',
    title: 'DOM loader detection',
    detail: `${loader.loadMode} · ${loader.location.path}`,
  }));
  const entries = [...session.timeline, ...loaderEntries].sort(
    (left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp),
  );
  if (!entries.length)
    return (
      <EmptyState
        title="No timeline entries"
        detail="Loader observations, network events, inferred route changes, and warnings will appear chronologically."
      />
    );
  return (
    <ol className="relative ml-3 border-l border-stone-300">
      {entries.map((entry) => (
        <li key={entry.id} className="relative mb-5 ml-6">
          <span className="absolute -left-[30px] top-1 h-3 w-3 rounded-full border-2 border-white bg-oracle" />
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{entry.title}</h3>
                <Badge
                  tone={
                    entry.severity === 'high'
                      ? 'danger'
                      : entry.severity === 'medium'
                        ? 'warning'
                        : 'neutral'
                  }
                >
                  {entry.type}
                </Badge>
              </div>
              <time className="text-xs text-stone-500">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </time>
            </div>
            <p className="mt-2 break-all text-sm text-stone-600">{entry.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
