import { useMemo, useState } from 'react';
import type { DiagnosticSession, QaPlanRun } from '../../features/models';
import { createExportReport, exportReportJson } from '../../features/export/exportJson';
import { exportReportMarkdown } from '../../features/export/exportMarkdown';
import { platformAdapterForSession } from '../../features/platform/platformRegistry';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Notice } from '../ui/Notice';

export function ExportTab({ session, qaRun }: { session: DiagnosticSession; qaRun?: QaPlanRun }) {
  const adapter = platformAdapterForSession(session);
  const [copied, setCopied] = useState(false);
  const [clientDataAcknowledged, setClientDataAcknowledged] = useState(false);
  const version = typeof chrome !== 'undefined' ? chrome.runtime.getManifest().version : '0.5.1';
  const report = useMemo(
    () => createExportReport(session, version, qaRun),
    [session, version, qaRun],
  );
  const markdown = useMemo(
    () => exportReportMarkdown(session, version, qaRun),
    [session, version, qaRun],
  );
  const baseName = reportFileName(session.pageUrl, report.platform.id);
  const parameterCount = report.events.reduce(
    (count, event) => count + event.payload.parameterCount,
    0,
  );
  const emptyValueCount = report.events.reduce(
    (count, event) => count + event.payload.emptyValues.length,
    0,
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[24rem_1fr]">
      <div className="space-y-4">
        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            QA report coverage
          </p>
          <h2 className="mt-1 text-lg font-semibold">Complete captured events</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Each event includes its full observed request metadata and raw payload, grouped into
            out-of-the-box, custom, and needs-review parameters. Static libraries and tag managers
            are summarized as implementation evidence.
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Metric label="Events" value={report.events.length} />
            <Metric label="Libraries" value={report.libraries.length} />
            <Metric label="Support traffic" value={report.supportTraffic.length} />
            <Metric label="Tag managers" value={report.tagManagers.length} />
            <Metric label="Parameters" value={parameterCount} />
            <Metric label="Empty / null" value={emptyValueCount} warning={emptyValueCount > 0} />
            <Metric label="Diagnostics" value={report.warnings.length} />
            {report.qaScorecard && (
              <>
                <Metric label="QA steps passed" value={report.qaScorecard.summary.passed} />
                <Metric
                  label="QA steps warned"
                  value={report.qaScorecard.summary.warnings}
                  warning={report.qaScorecard.summary.warnings > 0}
                />
                <Metric
                  label="QA steps failed"
                  value={report.qaScorecard.summary.failed}
                  warning={report.qaScorecard.summary.failed > 0}
                />
              </>
            )}
          </dl>
        </Card>
        <Card>
          <h2 className="font-semibold">Export QA report</h2>
          <p className="mt-1 text-xs leading-5 text-stone-500">
            Reports are generated and downloaded locally. They contain unmodified observed values,
            request URLs, and account identifiers.
          </p>
          <label className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">
            <input
              type="checkbox"
              className="mt-1"
              checked={clientDataAcknowledged}
              onChange={(event) => setClientDataAcknowledged(event.target.checked)}
            />
            <span>
              I understand this report contains raw client data and will handle it under the
              approved QA evidence and retention process.
            </span>
          </label>
          <div className="mt-4 grid gap-2">
            <Button
              disabled={!clientDataAcknowledged}
              onClick={() =>
                download(
                  `${baseName}.json`,
                  exportReportJson(session, version, qaRun),
                  'application/json',
                )
              }
            >
              Export complete QA report (JSON)
            </Button>
            <Button
              disabled={!clientDataAcknowledged}
              onClick={() => download(`${baseName}.md`, markdown, 'text/markdown')}
              className="bg-[#514c47] hover:bg-[#312d2a]"
            >
              Export readable QA report (Markdown)
            </Button>
            <Button
              disabled={!clientDataAcknowledged}
              className="border-stone-300 bg-white text-ink hover:bg-stone-100"
              onClick={() =>
                void navigator.clipboard.writeText(markdown).then(() => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 2000);
                })
              }
            >
              {copied ? 'Copied report' : 'Copy readable QA report'}
            </Button>
          </div>
        </Card>
      </div>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Readable report preview</h2>
            <p className="mt-1 text-xs text-stone-500">Exact machine-readable data is in JSON.</p>
          </div>
          <Badge tone="info">v{version}</Badge>
        </div>
        <Notice>
          Empty strings and explicit nulls remain in the report and are highlighted as potential QA
          issues. Browser-visible traffic only; backend {adapter.identity.shortName} calls cannot be
          captured here.
        </Notice>
        <pre className="mt-4 max-h-[72vh] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-ink p-4 text-xs leading-6 text-stone-100">
          {markdown}
        </pre>
      </Card>
    </div>
  );
}

function Metric({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: number;
  warning?: boolean;
}) {
  return (
    <div className={`rounded-lg p-3 ${warning ? 'bg-amber-50 text-amber-950' : 'bg-stone-50'}`}>
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className="mt-1 text-xl font-semibold">{value}</dd>
    </div>
  );
}

function reportFileName(pageUrl: string, platformId: string): string {
  let host = 'inspected-page';
  try {
    host = new URL(pageUrl).hostname || host;
  } catch {
    // Keep the stable fallback for pages without an HTTP(S) URL.
  }
  const date = new Date().toISOString().slice(0, 10);
  return `${platformId}-qa-${host.replace(/[^a-z0-9.-]+/gi, '-')}-${date}`;
}

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}
