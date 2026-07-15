import type {
  DiagnosticSession,
  DiagnosticSummary,
  ExtensionSettings,
} from '../../features/models';
import { reloadInspectedWindow } from '../../features/chrome/inspectedWindowClient';
import { runExtensionOperation } from '../../features/chrome/extensionLifecycle';
import { platformAdapterForSession } from '../../features/platform/platformRegistry';
import { diagnosticsActions } from '../../store/diagnosticsStore';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Notice } from '../ui/Notice';
import { StatusSummaryCard } from './StatusSummaryCard';

export function OverviewTab({
  session,
  summary,
  settings,
}: {
  session: DiagnosticSession;
  summary: DiagnosticSummary;
  settings: ExtensionSettings;
}) {
  const adapter = platformAdapterForSession(session);
  const { identity } = adapter;
  const debugAction = adapter.debugAction?.(session.pageUrl);
  const noData = session.loaders.length === 0 && session.networkObservations.length === 0;
  return (
    <div className="space-y-4">
      {settings.enableReloadRecommendationBanner && summary.reloadRecommended && (
        <Notice tone="warning">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>
              <strong>Open DevTools before page load for complete network capture.</strong> Earlier
              requests may be absent.
            </span>
            <Button
              onClick={() => {
                runExtensionOperation(() =>
                  diagnosticsActions.reset(false).then(reloadInspectedWindow),
                );
              }}
            >
              Clear session and reload inspected page
            </Button>
          </div>
        </Notice>
      )}
      <CardHeader
        session={session}
        platformName={identity.productName}
        pageContextLabel={identity.pageContextLabel}
      />
      {noData && (
        <EmptyState
          title={`No ${identity.productName} activity observed yet`}
          detail={`The panel may have opened after page load, consent may be pending, or this page may not use ${identity.productName}. Reload with DevTools open before drawing a conclusion.`}
        />
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        {adapter.overviewCards(summary).map((card) => (
          <StatusSummaryCard
            key={card.id}
            label={card.label}
            value={card.tone ? <Badge tone={card.tone}>{card.value}</Badge> : card.value}
            note={card.note}
          />
        ))}
      </div>
      {debugAction && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void navigator.clipboard.writeText(debugAction.url)}>
            {debugAction.label}
          </Button>
          <span className="self-center text-xs text-stone-500">{debugAction.note}</span>
        </div>
      )}
    </div>
  );
}

function CardHeader({
  session,
  platformName,
  pageContextLabel,
}: {
  session: DiagnosticSession;
  platformName: string;
  pageContextLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            Inspected page
          </p>
          <p className="mt-1 break-all font-mono text-sm text-stone-800">
            {session.pageUrl || 'URL unavailable'}
          </p>
        </div>
        <div className="text-right text-xs text-stone-500">
          <p>Attached to Edge tab #{session.tabId} · URL auto-sync enabled</p>
          <p>Event history continues across navigation until cleared</p>
          <p>Scan {new Date(session.scanTimestamp).toLocaleTimeString()}</p>
          <p>
            {pageContextLabel} ({platformName}):{' '}
            {session.pageContextDetected === undefined
              ? 'not checked'
              : session.pageContextDetected
                ? 'observed'
                : 'not observed'}
          </p>
        </div>
      </div>
    </div>
  );
}
