import type { ReactNode } from 'react';
import type { DiagnosticSummary } from '../../features/models';
import { Badge } from '../ui/Badge';

export function DevtoolsShell({
  summary,
  children,
  nav,
  inspectedTabActive,
  tabId,
}: {
  summary: DiagnosticSummary;
  children: ReactNode;
  nav: ReactNode;
  inspectedTabActive?: boolean;
  tabId: number;
}) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="flex items-center justify-between gap-4 border-b border-[#e4e1dd] border-t-4 border-t-oracle bg-white px-5 py-3 text-ink">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-oracle text-xl font-semibold text-white shadow-sm">
            ∞
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7b7570]">
              Oracle Infinity
            </p>
            <h1 className="text-base font-semibold">Implementation Inspector</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            tone={
              summary.tagStatus === 'detected'
                ? 'success'
                : summary.tagStatus === 'inconclusive'
                  ? 'warning'
                  : 'neutral'
            }
          >
            {summary.tagStatus}
          </Badge>
          <span className="text-xs text-[#6f6964]">
            {summary.collectionEventCount} observed events
          </span>
        </div>
      </header>
      {nav}
      {inspectedTabActive === false && (
        <div className="border-b border-amber-300 bg-amber-50 px-5 py-3 text-sm text-amber-950">
          <strong>This DevTools window is attached to Edge tab #{tabId}.</strong> Edge does not
          reattach DevTools when you switch browser tabs. Return to that tab, or open DevTools on
          the page you want to inspect.
        </div>
      )}
      <main className="mx-auto max-w-[1600px] p-5">{children}</main>
    </div>
  );
}
