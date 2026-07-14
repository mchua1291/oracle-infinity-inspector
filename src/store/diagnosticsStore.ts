import { useSyncExternalStore } from 'react';
import type { BackgroundTabSession, ExtensionMessage } from '../features/chrome/chromeMessageTypes';
import {
  detectInspectedExpression,
  getInspectedPageUrl,
} from '../features/chrome/inspectedWindowClient';
import { withPlatformDiagnostics } from '../features/platform/platformDiagnosticsRuntime';
import { platformAdapterForSession } from '../features/platform/platformRegistry';
import {
  DEFAULT_SETTINGS,
  type DiagnosticSession,
  type ExtensionSettings,
  type PlatformNetworkObservation,
} from '../features/models';
import { loadSettings, saveSettings } from '../features/settings/settingsStore';
import { mergeObservations } from '../features/network/observationCollection';

const MAX_TIMELINE_ENTRIES = 1500;

interface DiagnosticsState {
  ready: boolean;
  session: DiagnosticSession;
  settings: ExtensionSettings;
  inspectedTabActive?: boolean;
  error?: string;
}

const tabId =
  typeof chrome !== 'undefined' && chrome.devtools ? chrome.devtools.inspectedWindow.tabId : 0;
function blankSession(pageUrl = '', captureMayBeIncomplete = true): DiagnosticSession {
  const now = new Date().toISOString();
  return {
    id: `session:${tabId}:${crypto.randomUUID()}`,
    tabId,
    pageUrl,
    startedAt: now,
    scanTimestamp: now,
    devtoolsOpenedAt: now,
    loaders: [],
    tagManagers: [],
    networkObservations: [],
    parameters: [],
    warnings: [],
    timeline: [],
    captureMayBeIncomplete,
    droppedObservationCount: 0,
  };
}

let state: DiagnosticsState = { ready: false, session: blankSession(), settings: DEFAULT_SETTINGS };
let refreshSequence = 0;
const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((listener) => listener());
}
function setState(next: DiagnosticsState) {
  state = next;
  emit();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function detectPageContext(session: DiagnosticSession): Promise<boolean | undefined> {
  return detectInspectedExpression(
    platformAdapterForSession(session).identity.pageContextExpression,
  );
}

function hydrate(source: BackgroundTabSession, current: DiagnosticSession): DiagnosticSession {
  const merged = mergeObservations(current.networkObservations, source.observations);
  const networkObservations = merged.observations;
  const routeTimeline = [...source.timeline, ...current.timeline].filter(
    (entry) => entry.type === 'route-change',
  );
  const timeline = new Map(
    [
      ...routeTimeline,
      ...networkObservations
        .filter((event) => event.eventKind !== 'library')
        .map((event) => ({
          id: `timeline:${event.id}`,
          timestamp: event.timestamp,
          type: 'network' as const,
          title: `${event.eventKind} · ${event.sourceType}`,
          detail: event.requestUrl,
        })),
    ].map((entry) => [entry.id, entry]),
  );
  return withPlatformDiagnostics(
    {
      ...current,
      pageUrl: source.pageUrl || current.pageUrl,
      scanTimestamp: source.scannedAt,
      loaders: source.loaders,
      tagManagers: source.tagManagers ?? [],
      networkObservations,
      parameters: networkObservations.flatMap((event) => event.parameters),
      timeline: [...timeline.values()].slice(-MAX_TIMELINE_ENTRIES),
      droppedObservationCount:
        Math.max(current.droppedObservationCount, source.droppedObservationCount) + merged.dropped,
    },
    state.settings.expectedProfiles,
  );
}

async function refreshFromBackground() {
  const sequence = ++refreshSequence;
  const source = (await chrome.runtime.sendMessage({
    type: 'GET_TAB_SESSION',
    tabId,
  } satisfies ExtensionMessage)) as BackgroundTabSession;
  if (sequence !== refreshSequence) return;
  setState({ ...state, session: hydrate(source, state.session) });
}

export const diagnosticsActions = {
  async initialize() {
    try {
      const [settings, inspectedPageUrl, activeTab] = await Promise.all([
        loadSettings(),
        getInspectedPageUrl(),
        chrome.runtime.sendMessage({
          type: 'GET_ACTIVE_TAB_ID',
        } satisfies ExtensionMessage) as Promise<{
          tabId?: number;
        }>,
      ]);
      state = {
        ...state,
        settings,
        session: blankSession(inspectedPageUrl, true),
        inspectedTabActive: activeTab.tabId === tabId,
      };
      await chrome.runtime.sendMessage({
        type: 'REQUEST_DOM_SCAN',
        tabId,
        monitorMutations: settings.enableDomMutationMonitoring,
      } satisfies ExtensionMessage);
      await refreshFromBackground();
      if (settings.enablePageContextDetection)
        state.session.pageContextDetected = await detectPageContext(state.session);
      setState({ ...state, ready: true });
    } catch (error) {
      setState({
        ...state,
        ready: true,
        error:
          error instanceof Error ? error.message : 'Unable to initialize the diagnostic session.',
      });
    }
  },
  addObservations(observations: PlatformNetworkObservation[]) {
    const source: BackgroundTabSession = {
      schemaVersion: 1,
      pageUrl: state.session.pageUrl,
      loaders: state.session.loaders,
      tagManagers: state.session.tagManagers,
      observations,
      scannedAt: new Date().toISOString(),
      timeline: state.session.timeline.filter((entry) => entry.type === 'route-change'),
      droppedObservationCount: state.session.droppedObservationCount,
    };
    setState({ ...state, session: hydrate(source, state.session) });
    void chrome.runtime.sendMessage({
      type: 'NETWORK_OBSERVATIONS',
      tabId,
      observations,
    } satisfies ExtensionMessage);
  },
  async navigation(url: string) {
    const inspectedPageUrl = (await getInspectedPageUrl()) ?? url;
    setState({
      ...state,
      session: withPlatformDiagnostics(
        blankSession(inspectedPageUrl, false),
        state.settings.expectedProfiles,
      ),
    });
    await chrome.runtime.sendMessage({
      type: 'CLEAR_SESSION',
      tabId,
      pageUrl: inspectedPageUrl,
    } satisfies ExtensionMessage);
    await chrome.runtime
      .sendMessage({
        type: 'REQUEST_DOM_SCAN',
        tabId,
        monitorMutations: state.settings.enableDomMutationMonitoring,
      } satisfies ExtensionMessage)
      .catch(() => undefined);
  },
  updateInspectedPageUrl(pageUrl: string) {
    if (!pageUrl || pageUrl === state.session.pageUrl) return;
    const timestamp = new Date().toISOString();
    const entry = state.session.pageUrl
      ? {
          id: `route:panel:${crypto.randomUUID()}`,
          timestamp,
          type: 'route-change' as const,
          title: 'Inspected page URL changed',
          detail: `${state.session.pageUrl} → ${pageUrl}`,
        }
      : undefined;
    const session = withPlatformDiagnostics(
      {
        ...state.session,
        pageUrl,
        scanTimestamp: timestamp,
        timeline: entry ? [...state.session.timeline, entry] : state.session.timeline,
      },
      state.settings.expectedProfiles,
    );
    setState({ ...state, session });
    void chrome.runtime.sendMessage({
      type: 'PANEL_PAGE_URL_UPDATED',
      tabId,
      pageUrl,
      entry,
    } satisfies ExtensionMessage);
  },
  async syncInspectedPageUrl() {
    const pageUrl = await getInspectedPageUrl();
    if (pageUrl) diagnosticsActions.updateInspectedPageUrl(pageUrl);
  },
  async reset(captureMayBeIncomplete = false) {
    await chrome.runtime.sendMessage({ type: 'CLEAR_SESSION', tabId } satisfies ExtensionMessage);
    setState({
      ...state,
      session: withPlatformDiagnostics(
        blankSession(state.session.pageUrl, captureMayBeIncomplete),
        state.settings.expectedProfiles,
      ),
    });
  },
  async updateSettings(settings: ExtensionSettings) {
    await saveSettings(settings);
    await chrome.runtime.sendMessage({
      type: 'SET_TAB_MUTATION_MONITORING',
      tabId,
      enabled: settings.enableDomMutationMonitoring,
    } satisfies ExtensionMessage);
    const session = withPlatformDiagnostics(state.session, settings.expectedProfiles);
    if (settings.enablePageContextDetection)
      session.pageContextDetected = await detectPageContext(session);
    else session.pageContextDetected = undefined;
    setState({ ...state, settings, session });
  },
  refreshFromBackground,
};

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
    if (message.type === 'SESSION_UPDATED' && message.tabId === tabId) void refreshFromBackground();
    if (message.type === 'ACTIVE_TAB_CHANGED')
      setState({ ...state, inspectedTabActive: message.tabId === tabId });
    return false;
  });
}

export function useDiagnosticsStore() {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}

export function getDiagnosticsState() {
  return state;
}
