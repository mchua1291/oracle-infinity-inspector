import type { ExtensionMessage } from '../features/chrome/chromeMessageTypes';
import { scanDocumentForCxTags, scanScriptTag } from '../features/dom/scriptTagScanner';
import {
  scanDocumentForTagManagers,
  scanTagManagerElement,
} from '../features/dom/tagManagerScanner';
import type { OracleCxTagLoader, TagManagerObservation } from '../features/models';

const observed = new Map<string, OracleCxTagLoader>();
const observedTagManagers = new Map<string, TagManagerObservation>();
let monitorEnabled = true;
let lastUrl = location.href;
let active = false;
let observer: MutationObserver | undefined;
let routeListenersInstalled = false;

function loaderKey(loader: OracleCxTagLoader): string {
  return `${loader.sourceUrl ?? 'inline'}|${loader.location.path}`;
}

function tagManagerKey(manager: TagManagerObservation): string {
  return `${manager.type}|${manager.containerId ?? manager.sourceUrl ?? manager.location.path}`;
}

function publish() {
  const message: ExtensionMessage = {
    type: 'DOM_SCAN',
    pageUrl: location.href,
    loaders: [...observed.values()],
    tagManagers: [...observedTagManagers.values()],
    scannedAt: new Date().toISOString(),
  };
  void chrome.runtime.sendMessage(message).catch(() => undefined);
}

function scanAll() {
  for (const loader of scanDocumentForCxTags()) observed.set(loaderKey(loader), loader);
  for (const manager of scanDocumentForTagManagers())
    observedTagManagers.set(tagManagerKey(manager), manager);
  publish();
}

function checkRouteChange() {
  if (location.href === lastUrl) return;
  const previous = lastUrl;
  lastUrl = location.href;
  const message: ExtensionMessage = {
    type: 'ROUTE_CHANGE',
    pageUrl: location.href,
    entry: {
      id: `route:${crypto.randomUUID()}`,
      timestamp: new Date().toISOString(),
      type: 'route-change',
      title: 'Possible SPA route change',
      detail: `${previous} → ${location.href}`,
    },
  };
  void chrome.runtime.sendMessage(message).catch(() => undefined);
}

function activateDomInspection(enableMutations: boolean) {
  active = true;
  monitorEnabled = enableMutations;
  lastUrl = location.href;
  if (!observer) {
    observer = new MutationObserver((mutations) => {
      if (!active) return;
      checkRouteChange();
      if (!monitorEnabled) return;
      let changed = false;
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue;
          const scripts = node.matches('script')
            ? [node]
            : Array.from(node.querySelectorAll('script'));
          for (const candidate of scripts) {
            const loader = scanScriptTag(
              candidate as HTMLScriptElement,
              document.readyState !== 'loading',
            );
            if (loader) {
              observed.set(loaderKey(loader), loader);
              changed = true;
            }
          }
          const tagManagerElements = node.matches('script, iframe')
            ? [node]
            : Array.from(node.querySelectorAll('script, iframe'));
          for (const element of tagManagerElements) {
            const manager = scanTagManagerElement(element);
            if (manager) {
              observedTagManagers.set(tagManagerKey(manager), manager);
              changed = true;
            }
          }
        }
      }
      if (changed) publish();
    });
    observer.observe(document, { childList: true, subtree: true });
  }
  if (!routeListenersInstalled) {
    routeListenersInstalled = true;
    window.addEventListener('hashchange', checkRouteChange, { passive: true });
    window.addEventListener('popstate', checkRouteChange, { passive: true });
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', scanAll, { once: true });
  scanAll();
}

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  if (message.type === 'ACTIVATE_DOM_INSPECTION') {
    activateDomInspection(message.monitorMutations);
    sendResponse({ ok: true });
  }
  if (message.type === 'GET_DOM_SCAN') {
    scanAll();
    sendResponse({
      pageUrl: location.href,
      loaders: [...observed.values()],
      tagManagers: [...observedTagManagers.values()],
      scannedAt: new Date().toISOString(),
    });
  }
  if (message.type === 'SET_MUTATION_MONITORING') {
    monitorEnabled = message.enabled;
    sendResponse({ ok: true });
  }
  return false;
});
