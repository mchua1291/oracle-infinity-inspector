import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../components/App';
import { AppErrorBoundary } from '../components/AppErrorBoundary';
import { startDevtoolsNetworkClient } from '../features/chrome/devtoolsNetworkClient';
import { diagnosticsActions, getDiagnosticsState } from '../store/diagnosticsStore';
import '../styles/globals.css';

void diagnosticsActions.initialize().then(() => {
  startDevtoolsNetworkClient(
    {
      onObservations: diagnosticsActions.addObservations,
      onNavigated: diagnosticsActions.navigation,
    },
    getDiagnosticsState().settings.importedCatalog,
  );
  void diagnosticsActions.syncInspectedPageUrl();
});

const pageUrlSyncInterval = window.setInterval(
  () => void diagnosticsActions.syncInspectedPageUrl(),
  1000,
);
window.addEventListener('focus', () => void diagnosticsActions.syncInspectedPageUrl());
window.addEventListener('beforeunload', () => window.clearInterval(pageUrlSyncInterval), {
  once: true,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);
