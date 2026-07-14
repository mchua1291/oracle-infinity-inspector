import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../components/App';
import { AppErrorBoundary } from '../components/AppErrorBoundary';
import { startDevtoolsNetworkClient } from '../features/chrome/devtoolsNetworkClient';
import { runExtensionOperation } from '../features/chrome/extensionLifecycle';
import { diagnosticsActions, getDiagnosticsState } from '../store/diagnosticsStore';
import '../styles/globals.css';

let stopNetworkClient: (() => void) | undefined;
let panelContextValid = true;
const invalidatePanelContext = () => {
  panelContextValid = false;
  window.clearInterval(pageUrlSyncInterval);
};
const runPanelOperation = (operation: () => void | PromiseLike<unknown>) =>
  runExtensionOperation(operation, undefined, invalidatePanelContext);
const syncVisiblePage = () => {
  if (panelContextValid && document.visibilityState === 'visible')
    runPanelOperation(() => diagnosticsActions.syncInspectedPageUrl());
};
const pageUrlSyncInterval = window.setInterval(syncVisiblePage, 5000);
window.addEventListener('focus', syncVisiblePage);
document.addEventListener('visibilitychange', syncVisiblePage);

runPanelOperation(() =>
  diagnosticsActions.initialize().then(() => {
    stopNetworkClient = startDevtoolsNetworkClient(
      {
        onObservations: diagnosticsActions.addObservations,
        onNavigated: diagnosticsActions.navigation,
      },
      getDiagnosticsState().settings.importedCatalog,
    );
    return diagnosticsActions.syncInspectedPageUrl();
  }),
);

window.addEventListener(
  'beforeunload',
  () => {
    window.clearInterval(pageUrlSyncInterval);
    runPanelOperation(() => stopNetworkClient?.());
  },
  { once: true },
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);
