import type {
  DiagnosticSession,
  DiagnosticSummary,
  ExtensionSettings,
} from '../../features/models';
import {
  copyOracleDebugUrl,
  reloadInspectedWindow,
} from '../../features/chrome/inspectedWindowClient';
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
                void diagnosticsActions.reset(false).then(reloadInspectedWindow);
              }}
            >
              Clear session and reload inspected page
            </Button>
          </div>
        </Notice>
      )}
      <CardHeader session={session} />
      {noData && (
        <EmptyState
          title="No Oracle Infinity activity observed yet"
          detail="The panel may have opened after page load, consent may be pending, or this page may not use Oracle Infinity. Reload with DevTools open before drawing a conclusion."
        />
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <StatusSummaryCard
          label="CX Tag"
          value={
            <Badge tone={summary.tagStatus === 'detected' ? 'success' : 'neutral'}>
              {summary.tagStatus}
            </Badge>
          }
          note={`${summary.loaderCount} DOM loader(s)`}
        />
        <StatusSummaryCard
          label="Observed calls"
          value={summary.collectionEventCount}
          note={`${summary.cxTagEventCount} CX Tag · ${summary.dcApiEventCount} browser-visible DC API`}
        />
        <StatusSummaryCard
          label="Libraries"
          value={summary.libraryCount}
          note={
            summary.libraryIssueCount
              ? `${summary.libraryIssueCount} load issue(s)`
              : 'Loaded or cache-validated'
          }
        />
        <StatusSummaryCard
          label="Support traffic"
          value={summary.supportTrafficCount}
          note="Not counted as events"
        />
        <StatusSummaryCard
          label="Tag managers"
          value={summary.tagManagerCount}
          note="Implementation clues"
        />
        <StatusSummaryCard
          label="Standard"
          value={summary.standardParameterCount}
          note="Observed parameter rows"
        />
        <StatusSummaryCard
          label="Custom"
          value={summary.customParameterCount}
          note="Catalog-safe classification"
        />
        <StatusSummaryCard
          label="Needs review"
          value={summary.unknownParameterCount}
          note="No Oracle documentation match"
        />
        <StatusSummaryCard
          label="Warnings"
          value={summary.warningCount}
          note={`Confidence: ${summary.confidence}`}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => void copyOracleDebugUrl(session.pageUrl)}
          disabled={!session.pageUrl}
        >
          Copy URL with _ora.debug=vvvv
        </Button>
        <span className="self-center text-xs text-stone-500">
          Copy only; the page is not reloaded or modified.
        </span>
      </div>
    </div>
  );
}

function CardHeader({ session }: { session: DiagnosticSession }) {
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
          <p>Scan {new Date(session.scanTimestamp).toLocaleTimeString()}</p>
          <p>
            window.ORA:{' '}
            {session.oraGlobalDetected === undefined
              ? 'not checked'
              : session.oraGlobalDetected
                ? 'observed'
                : 'not observed'}
          </p>
        </div>
      </div>
    </div>
  );
}
