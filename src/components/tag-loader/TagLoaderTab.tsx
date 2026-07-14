import { summarizeInfinityLibraries } from '../../features/infinity/librarySummary';
import type { DiagnosticSession } from '../../features/models';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';

export function TagLoaderTab({ session }: { session: DiagnosticSession }) {
  const libraries = summarizeInfinityLibraries(session.networkObservations);
  const tagManagers = session.tagManagers ?? [];
  const collectionObserved = session.networkObservations.some(
    (event) => event.eventKind !== 'loader' && event.eventKind !== 'library',
  );
  if (!session.loaders.length && !libraries.length && !tagManagers.length)
    return (
      <EmptyState
        title="No implementation evidence observed"
        detail="No CX Tag loader, Infinity library, or standard tag-manager snippet was visible. Consent gates, restricted frames, late capture, or self-hosted tooling can limit this evidence."
      />
    );

  return (
    <div className="space-y-6">
      {tagManagers.length > 0 && (
        <section>
          <div className="mb-3">
            <h2 className="text-sm font-semibold">Tag-manager evidence</h2>
            <p className="mt-1 text-xs text-stone-500">
              Standard vendor snippets identify a manager present on the page; they do not prove
              which manager deployed Infinity.
            </p>
          </div>
          {!session.loaders.length && collectionObserved && (
            <div className="mb-3 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-950">
              Infinity collection calls were observed without a DOM-visible CX Tag loader. The tag
              manager evidence below is a plausible implementation path, not proof of attribution.
            </div>
          )}
          <div className="grid gap-3 xl:grid-cols-3">
            {tagManagers.map((manager) => (
              <Card key={manager.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{manager.label}</h3>
                    <p className="mt-1 font-mono text-xs text-stone-600">
                      {manager.containerId ?? 'Container unavailable'}
                    </p>
                  </div>
                  <Badge tone={manager.confidence === 'direct' ? 'success' : 'warning'}>
                    {manager.confidence}
                  </Badge>
                </div>
                {manager.environment && (
                  <p className="mt-3 text-xs">
                    <span className="font-semibold">Environment:</span> {manager.environment}
                  </p>
                )}
                <p className="mt-3 text-xs leading-5 text-stone-600">{manager.evidence}</p>
                {manager.sourceUrl && (
                  <p className="mt-2 break-all font-mono text-[11px] text-stone-500">
                    {manager.sourceUrl}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3">
          <h2 className="text-sm font-semibold">CX Tag loader evidence</h2>
          <p className="mt-1 text-xs text-stone-500">
            DOM and inline-script evidence used for load-mode inference.
          </p>
        </div>
        {session.loaders.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {session.loaders.map((loader) => (
              <Card key={loader.id}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-stone-500">
                      Script #{loader.location.scriptIndex + 1}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold">{loader.loadMode}</h3>
                  </div>
                  <Badge
                    tone={
                      loader.confidence === 'direct'
                        ? 'success'
                        : loader.confidence === 'inferred'
                          ? 'warning'
                          : 'neutral'
                    }
                  >
                    {loader.confidence}
                  </Badge>
                </div>
                <dl className="mt-4 grid grid-cols-[9rem_1fr] gap-x-3 gap-y-2 text-sm">
                  <dt className="text-stone-500">DOM path</dt>
                  <dd className="break-all font-mono text-xs">{loader.location.path}</dd>
                  <dt className="text-stone-500">Source</dt>
                  <dd className="break-all font-mono text-xs">
                    {loader.sourceUrl ?? 'Inline loader evidence'}
                  </dd>
                  <dt className="text-stone-500">Account GUID</dt>
                  <dd className="break-all font-mono">
                    {loader.config.accountGuid || 'Unavailable'}
                  </dd>
                  <dt className="text-stone-500">Tag ID</dt>
                  <dd>{loader.config.tagId ?? 'Unavailable'}</dd>
                  <dt className="text-stone-500">_ora.config</dt>
                  <dd>{loader.config.config ?? 'Not present'}</dd>
                  <dt className="text-stone-500">Environment guess</dt>
                  <dd>{loader.config.environmentGuess}</dd>
                  <dt className="text-stone-500">Attributes</dt>
                  <dd>
                    async={String(loader.async)} · defer={String(loader.defer)}
                  </dd>
                </dl>
                <div className="mt-4 border-t border-stone-100 pt-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Inference evidence
                  </h4>
                  <ul className="mt-2 space-y-2 text-sm text-stone-700">
                    {loader.evidence.map((item, index) => (
                      <li key={`${item.kind}-${index}`}>
                        <span className="font-medium">{item.kind}:</span> {item.description}
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className="rounded-lg bg-stone-50 p-3 text-xs text-stone-500">
            No CX Tag loader remained visible in the DOM.
          </p>
        )}
      </section>

      {libraries.length > 0 && (
        <section>
          <div className="mb-3">
            <h2 className="text-sm font-semibold">Infinity libraries</h2>
            <p className="mt-1 text-xs text-stone-500">
              Static Oracle Infinity resources are summarized separately from data collection calls.
              HTTP 304 means the cached library was still valid.
            </p>
          </div>
          <Card className="overflow-x-auto p-0">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500">
                <tr>
                  {['Library', 'Type', 'State', 'HTTP', 'Requests'].map((label) => (
                    <th key={label} className="px-3 py-2 font-semibold">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {libraries.map((library) => (
                  <tr key={library.url} className="border-t border-stone-100 align-top">
                    <td className="max-w-md px-3 py-3">
                      <p className="font-semibold">{library.name}</p>
                      <p className="mt-1 break-all font-mono text-[11px] text-stone-500">
                        {library.url}
                      </p>
                    </td>
                    <td className="px-3 py-3">{library.resourceType}</td>
                    <td className="px-3 py-3">
                      <Badge
                        tone={
                          library.state === 'failed'
                            ? 'danger'
                            : library.state === 'observed'
                              ? 'neutral'
                              : 'success'
                        }
                      >
                        {library.state === 'cached' ? 'cached / not modified' : library.state}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">{library.statusCodes.join(', ') || 'Unavailable'}</td>
                    <td className="px-3 py-3">{library.requestCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>
      )}
    </div>
  );
}
