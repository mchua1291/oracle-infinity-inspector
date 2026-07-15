import { networkFixture } from '../helpers';

function backgroundSession(observations = [networkFixture({ id: 'first-page-event' })]) {
  return {
    schemaVersion: 1 as const,
    pageUrl: 'https://www.example.test/first',
    loaders: [],
    tagManagers: [],
    observations,
    scannedAt: '2026-01-01T00:00:01.000Z',
    timeline: [],
    droppedObservationCount: 0,
  };
}

async function loadStore() {
  let inspectedUrl = 'https://www.example.test/first';
  let background = backgroundSession();
  const sendMessage = vi.fn(async (message: { type: string; pageUrl?: string }) => {
    if (message.type === 'GET_ACTIVE_TAB_ID') return { tabId: 7 };
    if (message.type === 'GET_TAB_SESSION') return background;
    if (message.type === 'PANEL_PAGE_URL_UPDATED' && message.pageUrl) {
      background = { ...background, pageUrl: message.pageUrl };
      return { ok: true };
    }
    if (message.type === 'CLEAR_NETWORK_OBSERVATIONS') {
      background = { ...background, observations: [], droppedObservationCount: 0 };
      return { ok: true };
    }
    return { ok: true };
  });
  vi.stubGlobal('chrome', {
    devtools: {
      inspectedWindow: {
        tabId: 7,
        eval: (
          _expression: string,
          callback: (result: unknown, exceptionInfo?: { isException?: boolean }) => void,
        ) => callback(inspectedUrl, {}),
      },
    },
    runtime: {
      sendMessage,
      onMessage: { addListener: vi.fn() },
    },
    storage: {
      local: {
        get: vi.fn().mockResolvedValue({}),
        set: vi.fn().mockResolvedValue(undefined),
      },
    },
  });
  vi.resetModules();
  const store = await import('../../src/store/diagnosticsStore');
  await store.diagnosticsActions.initialize();
  return {
    ...store,
    sendMessage,
    navigateTo(url: string) {
      inspectedUrl = url;
      return store.diagnosticsActions.navigation(url);
    },
  };
}

describe('diagnostics store capture lifecycle', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('keeps captured events when the inspected tab navigates', async () => {
    const store = await loadStore();

    await store.navigateTo('https://www.example.test/second');

    expect(store.getDiagnosticsState().session).toMatchObject({
      pageUrl: 'https://www.example.test/second',
      networkObservations: [{ id: 'first-page-event' }],
    });
    expect(store.sendMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'CLEAR_SESSION' }),
    );
  });

  it('pauses and resumes only new network observations', async () => {
    const store = await loadStore();
    store.diagnosticsActions.pauseRecording();
    store.diagnosticsActions.addObservations([networkFixture({ id: 'while-paused' })]);
    expect(store.getDiagnosticsState()).toMatchObject({
      recording: false,
      session: { networkObservations: [{ id: 'first-page-event' }] },
    });

    store.diagnosticsActions.resumeRecording();
    store.diagnosticsActions.addObservations([networkFixture({ id: 'after-resume' })]);
    expect(store.getDiagnosticsState()).toMatchObject({
      recording: true,
      session: {
        networkObservations: [{ id: 'first-page-event' }, { id: 'after-resume' }],
      },
    });
  });

  it('clears live history while leaving recording enabled', async () => {
    const store = await loadStore();

    await store.diagnosticsActions.clearObservations();

    expect(store.getDiagnosticsState()).toMatchObject({
      recording: true,
      session: { networkObservations: [], parameters: [], droppedObservationCount: 0 },
    });
  });
});
