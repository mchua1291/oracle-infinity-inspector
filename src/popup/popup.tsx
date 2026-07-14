import { StrictMode, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import type { ExtensionMessage, PopupSummaryResponse } from '../features/chrome/chromeMessageTypes';
import { getPlatformIdentity } from '../features/platform/platformIdentityRegistry';
import '../styles/globals.css';

function Popup() {
  const [data, setData] = useState<PopupSummaryResponse>();
  const [loading, setLoading] = useState(true);
  const platform = getPlatformIdentity(data?.platformId);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.id !== undefined) {
      setData(
        await chrome.runtime.sendMessage({
          type: 'GET_TAB_SUMMARY',
          tabId: tab.id,
        } satisfies ExtensionMessage),
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <main className="w-[22rem] border-t-4 border-t-oracle bg-canvas p-4 text-ink">
      <div className="flex items-center gap-3 rounded-xl border border-[#e4e1dd] bg-white p-4 shadow-panel">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-oracle text-xl font-semibold text-white">
          ∞
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7b7570]">
            {platform.productName}
          </p>
          <h1 className="font-semibold">Inspector quick status</h1>
        </div>
      </div>

      {data?.summary ? (
        <div aria-live="polite" className="mt-3 rounded-xl border border-[#e4e1dd] bg-white p-4">
          <p className="mb-3 truncate font-mono text-[11px] text-[#7b7570]" title={data.pageUrl}>
            {data.pageUrl || 'Current tab'}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{platform.loaderLabel}</span>
            <Badge tone={data.summary.tagStatus === 'detected' ? 'success' : 'neutral'}>
              {data.summary.tagStatus}
            </Badge>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[#f1efed] pt-4 text-sm">
            <div>
              <dt className="text-xs text-[#7b7570]">Observed events</dt>
              <dd className="text-xl font-semibold">{data.summary.collectionEventCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#7b7570]">Warnings</dt>
              <dd className="text-xl font-semibold">{data.summary.warningCount}</dd>
            </div>
          </dl>
          <dl className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-[#f5f4f2] p-3 text-center">
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-[#7b7570]">Standard</dt>
              <dd className="mt-1 font-semibold">{data.summary.standardParameterCount}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-[#7b7570]">Custom</dt>
              <dd className="mt-1 font-semibold">{data.summary.customParameterCount}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-[#7b7570]">Review</dt>
              <dd className="mt-1 font-semibold">{data.summary.unknownParameterCount}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <p className="mt-3 rounded-xl border border-[#e4e1dd] bg-white p-4 text-sm text-[#6f6964]">
          {loading
            ? 'Reading the active tab summary…'
            : 'No active diagnostic session is available for this tab.'}
        </p>
      )}

      <Button className="mt-3 w-full" onClick={() => void refresh()} disabled={loading}>
        {loading ? 'Refreshing…' : 'Refresh quick status'}
      </Button>
      <p className="mt-2 text-xs leading-5 text-[#6f6964]">
        For full request details, open Edge DevTools on this tab and select the {platform.panelName}{' '}
        panel. Chromium does not provide a reliable way for this popup to open that panel directly.
      </p>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Popup />
  </StrictMode>,
);
