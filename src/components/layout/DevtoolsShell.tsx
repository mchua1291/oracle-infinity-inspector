import type { ReactNode } from 'react';
import { runExtensionOperation } from '../../features/chrome/extensionLifecycle';
import type { DiagnosticSummary } from '../../features/models';
import type { PlatformIdentity } from '../../features/platform/platformAdapter';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export function DevtoolsShell({
  summary,
  children,
  nav,
  inspectedTabActive,
  tabId,
  platform,
  recording,
  hasRecordedEvents,
  onToggleRecording,
  onClearEvents,
}: {
  summary: DiagnosticSummary;
  children: ReactNode;
  nav: ReactNode;
  inspectedTabActive?: boolean;
  tabId: number;
  platform: PlatformIdentity;
  recording: boolean;
  hasRecordedEvents: boolean;
  onToggleRecording: () => void;
  onClearEvents: () => void | Promise<void>;
}) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e4e1dd] border-t-4 border-t-oracle bg-white px-5 py-3 text-ink">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-oracle text-xl font-semibold text-white shadow-sm">
            ∞
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7b7570]">
              {platform.productName}
            </p>
            <h1 className="text-base font-semibold">Implementation Inspector</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
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
          <span className="mx-1 h-5 w-px bg-stone-200" aria-hidden="true" />
          <Badge tone={recording ? 'success' : 'neutral'}>
            {recording ? 'recording' : 'paused'}
          </Badge>
          <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={onToggleRecording}>
            {recording ? 'Pause events' : 'Resume events'}
          </Button>
          <Button
            variant="secondary"
            className="px-3 py-1.5 text-xs text-red-700"
            disabled={!hasRecordedEvents}
            onClick={() => {
              if (
                window.confirm(
                  'Clear live event history for this tab? Completed QA-step evidence is retained.',
                )
              )
                runExtensionOperation(onClearEvents);
            }}
          >
            Clear events
          </Button>
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
