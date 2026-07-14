import type { DiagnosticSession, DiagnosticSeverity } from '../../features/models';
import { platformAdapterForSession } from '../../features/platform/platformRegistry';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';

const severities: DiagnosticSeverity[] = ['high', 'medium', 'low', 'info'];
export function WarningsTab({ session }: { session: DiagnosticSession }) {
  const adapter = platformAdapterForSession(session);
  if (!session.warnings.length)
    return (
      <EmptyState
        title="No warnings generated"
        detail="Diagnostics are heuristic and cover observed browser activity only."
      />
    );
  return (
    <div className="space-y-6">
      {severities.map((severity) => {
        const matches = session.warnings.filter((warning) => warning.severity === severity);
        if (!matches.length) return null;
        return (
          <section key={severity}>
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider">{severity}</h2>
              <Badge
                tone={
                  severity === 'high'
                    ? 'danger'
                    : severity === 'medium'
                      ? 'warning'
                      : severity === 'info'
                        ? 'info'
                        : 'neutral'
                }
              >
                {matches.length}
              </Badge>
            </div>
            <div className="grid gap-3 xl:grid-cols-2">
              {matches.map((warning) => (
                <Card key={warning.id}>
                  <h3 className="font-semibold">{warning.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-600">{warning.message}</p>
                  <p className="mt-3 text-sm">
                    <span className="font-semibold">Investigate:</span> {warning.recommendation}
                  </p>
                  {warning.sourceUrl && (
                    <a
                      href={warning.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-block text-sm font-semibold text-sky-700 underline decoration-sky-300 underline-offset-2"
                    >
                      {adapter.identity.warningGuidanceLabel}
                    </a>
                  )}
                </Card>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
