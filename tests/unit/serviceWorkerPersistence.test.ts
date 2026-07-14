import { networkFixture } from '../helpers';

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
      sendMessage: vi.fn().mockResolvedValue({ ok: true }),
      onRemoved: { addListener: vi.fn() },
      onActivated: { addListener: vi.fn() },
    },
  };
  return {
    api,
    send(message: unknown) {
      return new Promise<unknown>((resolve) => messageListener?.(message, {}, resolve));
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
});
