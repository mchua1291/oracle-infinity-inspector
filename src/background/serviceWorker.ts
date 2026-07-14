import type { BackgroundTabSession, ExtensionMessage } from '../features/chrome/chromeMessageTypes';
import { buildSummary, withDiagnostics } from '../features/diagnostics/diagnosticEngine';
import type { DiagnosticSession } from '../features/models';

const sessions = new Map<number, BackgroundTabSession>();

function emptySession(pageUrl = ''): BackgroundTabSession {
  return {
    pageUrl,
    loaders: [],
    tagManagers: [],
    observations: [],
    scannedAt: new Date().toISOString(),
    timeline: [],
  };
}

function notify(tabId: number) {
  const message: ExtensionMessage = { type: 'SESSION_UPDATED', tabId };
  void chrome.runtime.sendMessage(message).catch(() => undefined);
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
    tagManagers: source.tagManagers ?? [],
    networkObservations: source.observations,
    parameters: source.observations.flatMap((event) => event.parameters),
    warnings: [],
    timeline: source.timeline,
    captureMayBeIncomplete: true,
  };
  return withDiagnostics(session);
}

chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  if (message.type === 'DOM_SCAN' && sender.tab?.id !== undefined) {
    const tabId = sender.tab.id;
    const current = sessions.get(tabId) ?? emptySession(message.pageUrl);
    sessions.set(tabId, {
      ...current,
      pageUrl: message.pageUrl,
      loaders: message.loaders,
      tagManagers: message.tagManagers ?? [],
      scannedAt: message.scannedAt,
    });
    notify(tabId);
    sendResponse({ ok: true });
  } else if (message.type === 'ROUTE_CHANGE' && sender.tab?.id !== undefined) {
    const tabId = sender.tab.id;
    const current = sessions.get(tabId) ?? emptySession(message.pageUrl);
    sessions.set(tabId, {
      ...current,
      pageUrl: message.pageUrl,
      timeline: [...current.timeline, message.entry],
    });
    notify(tabId);
  } else if (message.type === 'NETWORK_OBSERVATIONS') {
    const current = sessions.get(message.tabId) ?? emptySession();
    const ids = new Set(current.observations.map((event) => event.id));
    sessions.set(message.tabId, {
      ...current,
      observations: [
        ...current.observations,
        ...message.observations.filter((event) => !ids.has(event.id)),
      ],
    });
    notify(message.tabId);
    sendResponse({ ok: true });
  } else if (message.type === 'GET_TAB_SESSION') {
    sendResponse(sessions.get(message.tabId) ?? emptySession());
  } else if (message.type === 'GET_TAB_SUMMARY') {
    const current = sessions.get(message.tabId);
    sendResponse(
      current
        ? {
            pageUrl: current.pageUrl,
            summary: buildSummary(diagnosticSession(message.tabId, current)),
          }
        : {},
    );
  } else if (message.type === 'GET_ACTIVE_TAB_ID') {
    void chrome.tabs
      .query({ active: true, lastFocusedWindow: true })
      .then(([tab]) => sendResponse({ tabId: tab?.id }))
      .catch(() => sendResponse({ tabId: undefined }));
    return true;
  } else if (message.type === 'PANEL_PAGE_URL_UPDATED') {
    const current = sessions.get(message.tabId) ?? emptySession(message.pageUrl);
    sessions.set(message.tabId, {
      ...current,
      pageUrl: message.pageUrl,
      scannedAt: new Date().toISOString(),
      timeline: message.entry ? [...current.timeline, message.entry] : current.timeline,
    });
    notify(message.tabId);
    sendResponse({ ok: true });
  } else if (message.type === 'REQUEST_DOM_SCAN') {
    void chrome.tabs
      .sendMessage(message.tabId, { type: 'GET_DOM_SCAN' } satisfies ExtensionMessage)
      .then(sendResponse)
      .catch(() => sendResponse(undefined));
    return true;
  } else if (message.type === 'SET_TAB_MUTATION_MONITORING') {
    void chrome.tabs
      .sendMessage(message.tabId, {
        type: 'SET_MUTATION_MONITORING',
        enabled: message.enabled,
      } satisfies ExtensionMessage)
      .then(sendResponse)
      .catch(() => sendResponse({ ok: false }));
    return true;
  } else if (message.type === 'CLEAR_SESSION') {
    sessions.set(message.tabId, emptySession(message.pageUrl));
    notify(message.tabId);
    sendResponse({ ok: true });
  } else if (message.type === 'GET_VERSION') {
    sendResponse({ version: chrome.runtime.getManifest().version });
  }
  return false;
});

chrome.tabs.onRemoved.addListener((tabId) => sessions.delete(tabId));
chrome.tabs.onActivated.addListener(({ tabId }) => {
  const message: ExtensionMessage = { type: 'ACTIVE_TAB_CHANGED', tabId };
  void chrome.runtime.sendMessage(message).catch(() => undefined);
});
