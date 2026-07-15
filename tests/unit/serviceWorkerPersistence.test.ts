import { networkFixture } from '../helpers';
import { createQaPlan, startQaPlanRun } from '../../src/features/qa/qaContracts';

function fakeChrome(storageData: Record<string, unknown>) {
  let messageListener:
    | ((message: unknown, sender: unknown, sendResponse: (value: unknown) => void) => boolean)
    | undefined;
  const api = {
    runtime: {
      onMessage: {
        addListener: (
          listener: (
            message: unknown,
            sender: unknown,
            sendResponse: (value: unknown) => void,
          ) => boolean,
        ) => (messageListener = listener),
      },
      sendMessage: vi.fn().mockResolvedValue(undefined),
      getManifest: () => ({ version: '0.2.0' }),
    },
    storage: {
      session: {
        get: async (key: string) => ({ [key]: storageData[key] }),
        set: async (values: Record<string, unknown>) => Object.assign(storageData, values),
        remove: async (key: string) => delete storageData[key],
      },
    },
    tabs: {
      query: vi.fn().mockResolvedValue([]),
      sendMessage: vi.fn(async (_tabId: number, message: { type?: string }) =>
        message.type === 'GET_DOM_SCAN'
          ? {
              pageUrl: 'https://www.example.test/page',
              loaders: [],
              tagManagers: [],
              scannedAt: '2026-07-13T22:00:00.000Z',
            }
          : { ok: true },
      ),
      onRemoved: { addListener: vi.fn() },
      onActivated: { addListener: vi.fn() },
    },
  };
  return {
    api,
    send(message: unknown, sender: unknown = {}) {
      return new Promise<unknown>((resolve) => messageListener?.(message, sender, resolve));
    },
  };
}

describe('service-worker session persistence', () => {
  it('restores observations from session storage after a worker restart', async () => {
    const storageData: Record<string, unknown> = {};
    const firstWorker = fakeChrome(storageData);
    vi.stubGlobal('chrome', firstWorker.api);
    vi.resetModules();
    await import('../../src/background/serviceWorker');
    await firstWorker.send({
      type: 'NETWORK_OBSERVATIONS',
      tabId: 7,
      observations: [networkFixture({ id: 'persisted-event' })],
    });

    const restartedWorker = fakeChrome(storageData);
    vi.stubGlobal('chrome', restartedWorker.api);
    vi.resetModules();
    await import('../../src/background/serviceWorker');
    const restored = (await restartedWorker.send({
      type: 'GET_TAB_SESSION',
      tabId: 7,
    })) as { observations: Array<{ id: string }> };
    expect(restored.observations.map((event) => event.id)).toEqual(['persisted-event']);
  });

  it('preserves accumulated observations when the inspected tab navigates', async () => {
    const storageData: Record<string, unknown> = {};
    const firstWorker = fakeChrome(storageData);
    vi.stubGlobal('chrome', firstWorker.api);
    vi.resetModules();
    await import('../../src/background/serviceWorker');
    await firstWorker.send({
      type: 'NETWORK_OBSERVATIONS',
      tabId: 8,
      observations: [networkFixture({ id: 'before-navigation' })],
    });
    await firstWorker.send({
      type: 'PANEL_PAGE_URL_UPDATED',
      tabId: 8,
      pageUrl: 'https://www.example.test/next',
      entry: {
        id: 'route-next',
        timestamp: '2026-01-01T00:00:02.000Z',
        type: 'route-change',
        title: 'Inspected page URL changed',
        detail: 'page → next',
      },
    });

    await expect(firstWorker.send({ type: 'GET_TAB_SESSION', tabId: 8 })).resolves.toMatchObject({
      pageUrl: 'https://www.example.test/next',
      observations: [{ id: 'before-navigation' }],
      timeline: [{ id: 'route-next' }],
    });
  });

  it('records one route marker when the DOM scan wins the navigation race', async () => {
    const storageData: Record<string, unknown> = {};
    const worker = fakeChrome(storageData);
    vi.stubGlobal('chrome', worker.api);
    vi.resetModules();
    await import('../../src/background/serviceWorker');
    const sender = { tab: { id: 11 } };
    await worker.send(
      {
        type: 'DOM_SCAN',
        pageUrl: 'https://www.example.test/first',
        loaders: [],
        tagManagers: [],
        scannedAt: '2026-01-01T00:00:00.000Z',
      },
      sender,
    );
    await worker.send({
      type: 'NETWORK_OBSERVATIONS',
      tabId: 11,
      observations: [networkFixture({ id: 'journey-event' })],
    });
    await worker.send(
      {
        type: 'DOM_SCAN',
        pageUrl: 'https://www.example.test/second',
        loaders: [],
        tagManagers: [],
        scannedAt: '2026-01-01T00:00:02.000Z',
      },
      sender,
    );
    await worker.send({
      type: 'PANEL_PAGE_URL_UPDATED',
      tabId: 11,
      pageUrl: 'https://www.example.test/second',
      entry: {
        id: 'duplicate-panel-route',
        timestamp: '2026-01-01T00:00:02.100Z',
        type: 'route-change',
        title: 'Inspected page URL changed',
        detail: 'first → second',
      },
    });

    const session = (await worker.send({ type: 'GET_TAB_SESSION', tabId: 11 })) as {
      observations: Array<{ id: string }>;
      timeline: Array<{ id: string }>;
    };
    expect(session.observations.map((event) => event.id)).toEqual(['journey-event']);
    expect(session.timeline).toHaveLength(1);
    expect(session.timeline[0].id).toMatch(/^route:dom:/);
  });

  it('clears live observations without deleting the active QA run', async () => {
    const storageData: Record<string, unknown> = {};
    const worker = fakeChrome(storageData);
    vi.stubGlobal('chrome', worker.api);
    vi.resetModules();
    await import('../../src/background/serviceWorker');
    const qaRun = startQaPlanRun(createQaPlan('Journey regression'));
    await worker.send({ type: 'SET_QA_RUN', tabId: 10, qaRun });
    await worker.send({
      type: 'NETWORK_OBSERVATIONS',
      tabId: 10,
      observations: [networkFixture({ id: 'clear-me' })],
    });

    await worker.send({ type: 'CLEAR_NETWORK_OBSERVATIONS', tabId: 10 });

    await expect(worker.send({ type: 'GET_TAB_SESSION', tabId: 10 })).resolves.toMatchObject({
      observations: [],
      droppedObservationCount: 0,
      qaRun: { id: qaRun.id },
    });
  });

  it('supports an explicit one-time popup scan without enabling mutation monitoring', async () => {
    const storageData: Record<string, unknown> = {};
    const worker = fakeChrome(storageData);
    vi.stubGlobal('chrome', worker.api);
    vi.resetModules();
    await import('../../src/background/serviceWorker');

    await expect(worker.send({ type: 'SCAN_TAB_DOM_ONCE', tabId: 9 })).resolves.toEqual({
      ok: true,
    });
    expect(worker.api.tabs.sendMessage).toHaveBeenCalledWith(9, { type: 'GET_DOM_SCAN' });
    await expect(worker.send({ type: 'GET_TAB_SESSION', tabId: 9 })).resolves.toMatchObject({
      pageUrl: 'https://www.example.test/page',
      scannedAt: '2026-07-13T22:00:00.000Z',
    });
  });

  it('persists an active QA run across capture resets and worker restarts', async () => {
    const storageData: Record<string, unknown> = {};
    const firstWorker = fakeChrome(storageData);
    vi.stubGlobal('chrome', firstWorker.api);
    vi.resetModules();
    await import('../../src/background/serviceWorker');
    const qaRun = startQaPlanRun(createQaPlan('Consent regression'));

    await firstWorker.send({ type: 'SET_QA_RUN', tabId: 12, qaRun });
    await firstWorker.send({
      type: 'CLEAR_SESSION',
      tabId: 12,
      pageUrl: 'https://www.example.test/next',
    });
    await expect(firstWorker.send({ type: 'GET_TAB_SESSION', tabId: 12 })).resolves.toMatchObject({
      pageUrl: 'https://www.example.test/next',
      qaRun: { id: qaRun.id, planName: 'Consent regression' },
    });

    const restartedWorker = fakeChrome(storageData);
    vi.stubGlobal('chrome', restartedWorker.api);
    vi.resetModules();
    await import('../../src/background/serviceWorker');
    await expect(
      restartedWorker.send({ type: 'GET_TAB_SESSION', tabId: 12 }),
    ).resolves.toMatchObject({ qaRun: { id: qaRun.id } });
  });
});
