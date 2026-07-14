import { useState } from 'react';
import { buildPlatformSummary } from '../features/platform/platformDiagnosticsRuntime';
import { platformAdapterForSession } from '../features/platform/platformRegistry';
import { useDiagnosticsStore } from '../store/diagnosticsStore';
import { ExportTab } from './export/ExportTab';
import { DevtoolsShell } from './layout/DevtoolsShell';
import { TabNav, type TabName } from './layout/TabNav';
import { NetworkEventsTab } from './network/NetworkEventsTab';
import { OverviewTab } from './overview/OverviewTab';
import { SettingsTab } from './settings/SettingsTab';
import { TagLoaderTab } from './tag-loader/TagLoaderTab';
import { EventTimelineTab } from './timeline/EventTimelineTab';
import { EmptyState } from './ui/EmptyState';
import { WarningsTab } from './warnings/WarningsTab';

export function App() {
  const { ready, session, settings, inspectedTabActive, error } = useDiagnosticsStore();
  const [active, setActive] = useState<TabName>('Overview');
  const summary = buildPlatformSummary(session);
  const platform = platformAdapterForSession(session).identity;
  if (!ready)
    return (
      <div className="grid min-h-screen place-items-center bg-canvas text-sm text-stone-600">
        Starting passive diagnostics…
      </div>
    );
  if (error)
    return (
      <div className="p-6">
        <EmptyState title="Inspector initialization failed" detail={error} />
      </div>
    );
  const content =
    active === 'Overview' ? (
      <OverviewTab session={session} summary={summary} settings={settings} />
    ) : active === 'Implementation' ? (
      <TagLoaderTab session={session} />
    ) : active === 'Network Events' ? (
      <NetworkEventsTab session={session} />
    ) : active === 'Event Timeline' ? (
      <EventTimelineTab session={session} />
    ) : active === 'Warnings' ? (
      <WarningsTab session={session} />
    ) : active === 'Export' ? (
      <ExportTab session={session} />
    ) : (
      <SettingsTab settings={settings} pageUrl={session.pageUrl} platformId={platform.id} />
    );
  return (
    <DevtoolsShell
      summary={summary}
      nav={<TabNav active={active} onChange={setActive} />}
      inspectedTabActive={inspectedTabActive}
      tabId={session.tabId}
      platform={platform}
    >
      {content}
    </DevtoolsShell>
  );
}
