import type { BackgroundTabSession, ExtensionMessage } from '../features/chrome/chromeMessageTypes';
import { QaPlanRunSchema, type DiagnosticSession } from '../features/models';
import { mergeObservations } from '../features/network/observationCollection';
import {
  buildPlatformSummary,
  withPlatformDiagnostics,
} from '../features/platform/platformDiagnosticsRuntime';
import { getPlatformIdentity } from '../features/platform/platformIdentityRegistry';

const SESSION_KEY_PREFIX = 'oracleImplementationInspector.tabSession.';
const MAX_BACKGROUND_TIMELINE = 500;
const sessions = new Map<number, BackgroundTabSession>();
// MV3 may restart this worker repeatedly. Each tab is restored from storage.session at most once per
// worker lifetime so an older persisted copy cannot overwrite newer in-memory messages.
const loadedTabs = new Set<number>();

function storageKey(tabId: number): string {
  return `${SESSION_KEY_PREFIX}${tabId}`;
}

function emptySession(pageUrl = ''): BackgroundTabSession {
  return {
    schemaVersion: 1,
    pageUrl,
    loaders: [],
    tagManagers: [],
    observations: [],
    scannedAt: new Date().toISOString(),
    timeline: [],
    droppedObservationCount: 0,
  };
}

function isStoredSession(value: unknown): value is BackgroundTabSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<BackgroundTabSession>;
  return (
    session.schemaVersion === 1 &&
    typeof session.pageUrl === 'string' &&
    typeof session.scannedAt === 'string' &&
    Array.isArray(session.loaders) &&
    Array.isArray(session.tagManagers) &&
    Array.isArray(session.observations) &&
    Array.isArray(session.timeline) &&
    Number.isInteger(session.droppedObservationCount) &&
    (session.droppedObservationCount ?? -1) >= 0 &&
    (session.qaRun === undefined || QaPlanRunSchema.safeParse(session.qaRun).success)
  );
}

async function getSession(tabId: number, pageUrl = ''): Promise<BackgroundTabSession> {
  const current = sessions.get(tabId);
  if (current) return current;
  if (!loadedTabs.has(tabId)) {
    loadedTabs.add(tabId);
    try {
      const stored = await chrome.storage.session.get(storageKey(tabId));
      const candidate = stored[storageKey(tabId)];
      if (isStoredSession(candidate)) {
        sessions.set(tabId, candidate);
        return candidate;
      }
    } catch {
      // The in-memory session remains available if session storage is unavailable or over quota.
    }
  }
  const created = emptySession(pageUrl);
  sessions.set(tabId, created);
  return created;
}

async function saveSession(tabId: number, session: BackgroundTabSession): Promise<void> {
  // Memory is the live source of truth. storage.session is a resilience mirror that lets an MV3
  // worker be suspended and restarted without losing the inspected tab's bounded evidence.
  sessions.set(tabId, session);
  loadedTabs.add(tabId);
  try {
    await chrome.storage.session.set({ [storageKey(tabId)]: session });
  } catch {
    // Keep the active in-memory copy; storage.session is resilience, not the source of truth.
  }
}

async function deleteSession(tabId: number): Promise<void> {
  sessions.delete(tabId);
  loadedTabs.delete(tabId);
  try {
    await chrome.storage.session.remove(storageKey(tabId));
  } catch {
    // The browser will clear session storage when the extension session ends.
  }
}

function notify(tabId: number) {
  const message: ExtensionMessage = { type: 'SESSION_UPDATED', tabId };
  void chrome.runtime.sendMessage(message).catch(() => undefined);
}

async function activateDomInspection(tabId: number, monitorMutations: boolean): Promise<unknown> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await chrome.tabs.sendMessage(tabId, {
        type: 'ACTIVATE_DOM_INSPECTION',
        monitorMutations,
      } satisfies ExtensionMessage);
    } catch {
      if (attempt < 2)
        await new Promise((resolveRetry) =>
          globalThis.setTimeout(resolveRetry, 100 * (attempt + 1)),
        );
    }
  }
  return undefined;
}

async function scanTabDomOnce(tabId: number): Promise<{ ok: boolean }> {
  try {
    const result = (await chrome.tabs.sendMessage(tabId, {
      type: 'GET_DOM_SCAN',
    } satisfies ExtensionMessage)) as
      | {
          pageUrl: string;
          loaders: BackgroundTabSession['loaders'];
          tagManagers: BackgroundTabSession['tagManagers'];
          scannedAt: string;
        }
      | undefined;
    if (!result) return { ok: false };
    const current = await getSession(tabId, result.pageUrl);
    await saveSession(tabId, {
      ...current,
      pageUrl: result.pageUrl,
      loaders: result.loaders,
      tagManagers: result.tagManagers,
      scannedAt: result.scannedAt,
    });
    notify(tabId);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

function diagnosticSession(tabId: number, source: BackgroundTabSession): DiagnosticSession {
  const now = new Date().toISOString();
  const session: DiagnosticSession = {
    id: `background:${tabId}`,
    tabId,
    pageUrl: source.pageUrl,
    startedAt: source.scannedAt,
    scanTimestamp: source.scannedAt,
    devtoolsOpenedAt: now,
    loaders: source.loaders,
    tagManagers: source.tagManagers,
    networkObservations: source.observations,
    parameters: source.observations.flatMap((event) => event.parameters),
    warnings: [],
    timeline: source.timeline,
    captureMayBeIncomplete: true,
    droppedObservationCount: source.droppedObservationCount,
  };
  return withPlatformDiagnostics(session);
}

async function handleMessage(
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender,
): Promise<unknown> {
  if (message.type === 'DOM_SCAN' && sender.tab?.id !== undefined) {
    const tabId = sender.tab.id;
    const current = await getSession(tabId, message.pageUrl);
    const pageChanged = Boolean(current.pageUrl && current.pageUrl !== message.pageUrl);
    const routeEntry = pageChanged
      ? {
          id: `route:dom:${crypto.randomUUID()}`,
          timestamp: message.scannedAt,
          type: 'route-change' as const,
          title: 'Inspected page URL changed',
          detail: `${current.pageUrl} → ${message.pageUrl}`,
        }
      : undefined;
    await saveSession(tabId, {
      ...current,
      pageUrl: message.pageUrl,
      loaders: message.loaders,
      tagManagers: message.tagManagers,
      scannedAt: message.scannedAt,
      // A new content-script instance is the most reliable full-navigation signal. The panel and
      // DOM paths race by design, so append a marker only when this message changes the cached URL.
      timeline: routeEntry
        ? [...current.timeline, routeEntry].slice(-MAX_BACKGROUND_TIMELINE)
        : current.timeline,
    });
    notify(tabId);
    return { ok: true };
  }
  if (message.type === 'ROUTE_CHANGE' && sender.tab?.id !== undefined) {
    const tabId = sender.tab.id;
    const current = await getSession(tabId, message.pageUrl);
    await saveSession(tabId, {
      ...current,
      pageUrl: message.pageUrl,
      timeline: [...current.timeline, message.entry].slice(-MAX_BACKGROUND_TIMELINE),
    });
    notify(tabId);
    return { ok: true };
  }
  if (message.type === 'NETWORK_OBSERVATIONS') {
    const current = await getSession(message.tabId);
    const merged = mergeObservations(current.observations, message.observations);
    await saveSession(message.tabId, {
      ...current,
      observations: merged.observations,
      droppedObservationCount: current.droppedObservationCount + merged.dropped,
    });
    notify(message.tabId);
    return { ok: true };
  }
  if (message.type === 'CLEAR_NETWORK_OBSERVATIONS') {
    const current = await getSession(message.tabId);
    await saveSession(message.tabId, {
      ...current,
      observations: [],
      timeline: current.timeline.filter((entry) => entry.type === 'route-change'),
      scannedAt: new Date().toISOString(),
      droppedObservationCount: 0,
    });
    notify(message.tabId);
    return { ok: true };
  }
  if (message.type === 'SET_QA_RUN') {
    const current = await getSession(message.tabId);
    await saveSession(message.tabId, { ...current, qaRun: message.qaRun });
    notify(message.tabId);
    return { ok: true };
  }
  if (message.type === 'GET_TAB_SESSION') return getSession(message.tabId);
  if (message.type === 'GET_TAB_SUMMARY') {
    const current = await getSession(message.tabId);
    if (!current.observations.length && !current.loaders.length && !current.tagManagers.length)
      return {};
    const session = diagnosticSession(message.tabId, current);
    return {
      pageUrl: current.pageUrl,
      platformId: getPlatformIdentity(session.platformId).id,
      summary: buildPlatformSummary(session),
      scannedAt: current.scannedAt,
      warnings: [...session.warnings]
        .sort(
          (left, right) =>
            ['info', 'low', 'medium', 'high'].indexOf(right.severity) -
            ['info', 'low', 'medium', 'high'].indexOf(left.severity),
        )
        .slice(0, 3)
        .map(({ severity, title }) => ({ severity, title })),
    };
  }
  if (message.type === 'GET_ACTIVE_TAB_ID') {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    return { tabId: tab?.id };
  }
  if (message.type === 'PANEL_PAGE_URL_UPDATED') {
    const current = await getSession(message.tabId, message.pageUrl);
    const pageChanged = current.pageUrl !== message.pageUrl;
    await saveSession(message.tabId, {
      ...current,
      pageUrl: message.pageUrl,
      scannedAt: new Date().toISOString(),
      // DOM scans, SPA route messages, and DevTools navigation callbacks may describe the same
      // transition. Whichever updates the URL first owns the route marker.
      timeline:
        message.entry && pageChanged
          ? [...current.timeline, message.entry].slice(-MAX_BACKGROUND_TIMELINE)
          : current.timeline,
    });
    notify(message.tabId);
    return { ok: true };
  }
  if (message.type === 'REQUEST_DOM_SCAN') {
    return activateDomInspection(message.tabId, message.monitorMutations);
  }
  if (message.type === 'SCAN_TAB_DOM_ONCE') return scanTabDomOnce(message.tabId);
  if (message.type === 'SET_TAB_MUTATION_MONITORING') {
    return chrome.tabs
      .sendMessage(message.tabId, {
        type: 'SET_MUTATION_MONITORING',
        enabled: message.enabled,
      } satisfies ExtensionMessage)
      .catch(() => ({ ok: false }));
  }
  if (message.type === 'CLEAR_SESSION') {
    const current = await getSession(message.tabId, message.pageUrl);
    const cleared = { ...emptySession(message.pageUrl), qaRun: current.qaRun };
    await saveSession(message.tabId, cleared);
    notify(message.tabId);
    return { ok: true };
  }
  if (message.type === 'GET_VERSION') return { version: chrome.runtime.getManifest().version };
  return undefined;
}

chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  void handleMessage(message, sender)
    .then(sendResponse)
    .catch(() => sendResponse(undefined));
  return true;
});

chrome.tabs.onRemoved.addListener((tabId) => void deleteSession(tabId));
chrome.tabs.onActivated.addListener(({ tabId }) => {
  const message: ExtensionMessage = { type: 'ACTIVE_TAB_CHANGED', tabId };
  void chrome.runtime.sendMessage(message).catch(() => undefined);
});
