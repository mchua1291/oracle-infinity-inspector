import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import type { ExtensionMessage, PopupSummaryResponse } from '../features/chrome/chromeMessageTypes';
import type { DiagnosticSeverity } from '../features/models';
import { getPlatformIdentity } from '../features/platform/platformIdentityRegistry';

const severityTone: Record<DiagnosticSeverity, 'neutral' | 'warning' | 'danger' | 'info'> = {
  info: 'info',
  low: 'neutral',
  medium: 'warning',
  high: 'danger',
};

function hostLabel(pageUrl?: string): string {
  if (!pageUrl) return 'Current tab';
  try {
    return new URL(pageUrl).hostname;
  } catch {
    return pageUrl;
  }
}

function timeLabel(timestamp?: string): string | undefined {
  if (!timestamp) return undefined;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? undefined : date.toLocaleTimeString();
}

export function Popup() {
  const [data, setData] = useState<PopupSummaryResponse>();
  const [tabId, setTabId] = useState<number>();
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [feedback, setFeedback] = useState<string>();
  const platform = getPlatformIdentity(data?.platformId);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      setTabId(tab.id);
      if (tab.id === undefined) {
        setData(undefined);
        setFeedback('The active browser tab could not be inspected.');
        return;
      }
      setData(
        await chrome.runtime.sendMessage({
          type: 'GET_TAB_SUMMARY',
          tabId: tab.id,
        } satisfies ExtensionMessage),
      );
    } catch {
      setFeedback('The current tab status could not be read.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const listener = (message: ExtensionMessage) => {
      if (message.type === 'SESSION_UPDATED' && message.tabId === tabId) void refresh();
      return false;
    };
    const runtimeMessages = chrome.runtime.onMessage;
    runtimeMessages.addListener(listener);
    return () => runtimeMessages.removeListener(listener);
  }, [refresh, tabId]);

  const scan = async () => {
    setScanning(true);
    setFeedback(undefined);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id === undefined) throw new Error('missing tab');
      setTabId(tab.id);
      const result = (await chrome.runtime.sendMessage({
        type: 'SCAN_TAB_DOM_ONCE',
        tabId: tab.id,
      } satisfies ExtensionMessage)) as { ok?: boolean } | undefined;
      setFeedback(
        result?.ok
          ? 'Page implementation evidence refreshed.'
          : 'This page cannot be scanned. Open a normal HTTP(S) page and try again.',
      );
      await new Promise((resolve) => globalThis.setTimeout(resolve, 150));
      await refresh();
    } catch {
      setFeedback('This page cannot be scanned. Open a normal HTTP(S) page and try again.');
    } finally {
      setScanning(false);
    }
  };

  const copyStatus = async () => {
    if (!data?.summary) return;
    const lines = [
      `${platform.productName} QA status`,
      `Page: ${data.pageUrl || 'Current tab'}`,
      `${platform.loaderLabel}: ${data.summary.tagStatus}`,
      `Collection events: ${data.summary.collectionEventCount}`,
      `Warnings: ${data.summary.warningCount}`,
      `Parameters: ${data.summary.standardParameterCount} standard, ${data.summary.customParameterCount} custom, ${data.summary.unknownParameterCount} review`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setFeedback('Status summary copied. No payload values were included.');
    } catch {
      setFeedback('The status summary could not be copied.');
    }
  };

  const statusMessage = useMemo(() => {
    if (!data?.summary) return undefined;
    if (data.summary.tagStatus !== 'detected')
      return {
        tone: 'warning' as const,
        text: `${platform.loaderLabel} evidence has not been detected on this page.`,
      };
    if (data.warnings?.some((warning) => warning.severity === 'high'))
      return { tone: 'danger' as const, text: 'High-priority QA findings need review.' };
    if (data.summary.warningCount)
      return { tone: 'warning' as const, text: 'QA findings are available in the DevTools panel.' };
    return { tone: 'success' as const, text: 'No diagnostic findings in the captured evidence.' };
  }, [data, platform.loaderLabel]);

  return (
    <main className="w-96 border-t-4 border-t-oracle bg-canvas p-4 text-ink">
      <header className="flex items-center gap-3 rounded-xl border border-[#e4e1dd] bg-white p-4 shadow-panel">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-oracle text-xl font-semibold text-white">
          ∞
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7b7570]">
            {platform.productName}
          </p>
          <h1 className="font-semibold">Page QA companion</h1>
        </div>
        {data?.summary && (
          <Badge tone={data.summary.tagStatus === 'detected' ? 'success' : 'neutral'}>
            {data.summary.tagStatus}
          </Badge>
        )}
      </header>

      {data?.summary ? (
        <section
          aria-live="polite"
          className="mt-3 rounded-xl border border-[#e4e1dd] bg-white p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold" title={data.pageUrl}>
                {hostLabel(data.pageUrl)}
              </p>
              <p className="mt-1 text-[11px] text-[#7b7570]">
                {timeLabel(data.scannedAt)
                  ? `Last page scan ${timeLabel(data.scannedAt)}`
                  : 'Cached session'}
              </p>
            </div>
            <span className="text-xs text-[#7b7570]">Evidence: {data.summary.confidence}</span>
          </div>

          {statusMessage && (
            <div
              className={`mt-3 rounded-lg border px-3 py-2 text-xs leading-5 ${
                statusMessage.tone === 'danger'
                  ? 'border-red-200 bg-red-50 text-red-900'
                  : statusMessage.tone === 'warning'
                    ? 'border-amber-200 bg-amber-50 text-amber-950'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-900'
              }`}
            >
              {statusMessage.text}
            </div>
          )}

          <dl className="mt-4 grid grid-cols-4 gap-2 border-t border-[#f1efed] pt-4 text-center">
            {[
              ['Events', data.summary.collectionEventCount],
              ['Warnings', data.summary.warningCount],
              ['Libraries', data.summary.libraryCount],
              ['Tag managers', data.summary.tagManagerCount],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[9px] uppercase tracking-wide text-[#7b7570]">{label}</dt>
                <dd className="mt-1 text-lg font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          <dl className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-[#f5f4f2] p-3 text-center">
            {[
              ['Standard', data.summary.standardParameterCount],
              ['Custom', data.summary.customParameterCount],
              ['Review', data.summary.unknownParameterCount],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[9px] uppercase tracking-wide text-[#7b7570]">{label}</dt>
                <dd className="mt-1 font-semibold">{value}</dd>
              </div>
            ))}
          </dl>

          {!!data.warnings?.length && (
            <div className="mt-4 border-t border-[#f1efed] pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#7b7570]">
                Highest-priority findings
              </p>
              <ul className="mt-2 space-y-2">
                {data.warnings.map((warning, index) => (
                  <li key={`${warning.title}:${index}`} className="flex items-center gap-2 text-xs">
                    <Badge tone={severityTone[warning.severity]}>{warning.severity}</Badge>
                    <span className="min-w-0 truncate" title={warning.title}>
                      {warning.title}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ) : (
        <section className="mt-3 rounded-xl border border-[#e4e1dd] bg-white p-4 text-sm text-[#6f6964]">
          <p className="font-semibold text-ink">No cached QA session for this tab</p>
          <p className="mt-2 leading-5">
            Scan the page for loader and tag-manager evidence, or open DevTools for complete event
            capture.
          </p>
        </section>
      )}

      {feedback && (
        <p className="mt-3 rounded-lg bg-[#f1efed] px-3 py-2 text-xs leading-5">{feedback}</p>
      )}

      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <Button onClick={() => void scan()} disabled={scanning || loading}>
          {scanning ? 'Scanning…' : 'Scan current page'}
        </Button>
        <button
          className="rounded-md border border-[#bcb6b1] bg-white px-3 py-2 text-sm font-semibold text-ink hover:bg-[#f1efed] disabled:opacity-40"
          onClick={() => void refresh()}
          disabled={loading}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      {data?.summary && (
        <button
          className="mt-2 w-full py-1 text-xs font-semibold text-[#6f6964] hover:text-ink"
          onClick={() => void copyStatus()}
        >
          Copy status summary without payload values
        </button>
      )}
      <p className="mt-2 border-t border-[#e4e1dd] pt-3 text-xs leading-5 text-[#6f6964]">
        For complete request payloads and reports, press <strong>F12</strong> on this tab and select
        the <strong>{platform.panelName}</strong> panel. Reload once with DevTools open.
      </p>
    </main>
  );
}
