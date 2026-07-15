import { startDevtoolsNetworkClient } from '../../src/features/chrome/devtoolsNetworkClient';
import type { HarEntry } from '../../src/features/network/harTypes';

describe('DevTools network client', () => {
  it('emits a request once when the live listener and HAR overlap', () => {
    let finished: ((entry: HarEntry) => void) | undefined;
    let harCallback: ((har: unknown) => void) | undefined;
    vi.stubGlobal('chrome', {
      devtools: {
        network: {
          onRequestFinished: {
            addListener: (listener: (entry: HarEntry) => void) => (finished = listener),
            removeListener: vi.fn(),
          },
          onNavigated: { addListener: vi.fn(), removeListener: vi.fn() },
          getHAR: (callback: (har: unknown) => void) => (harCallback = callback),
        },
      },
    });
    const entry: HarEntry = {
      startedDateTime: '2026-01-01T00:00:00.000Z',
      request: {
        method: 'GET',
        url: 'https://dc.oracleinfinity.io/example-account/dcs.gif?wt.dl=0',
      },
      response: { status: 200, statusText: 'OK' },
    };
    const observed: string[][] = [];
    startDevtoolsNetworkClient({
      onObservations: (events) => observed.push(events.map((event) => event.id)),
      onNavigated: vi.fn(),
    });
    finished?.(entry);
    harCallback?.({ entries: [entry] });
    expect(observed).toHaveLength(1);
    expect(observed[0]).toHaveLength(1);
  });

  it('treats a malformed initial HAR response as empty', () => {
    let harCallback: ((har: unknown) => void) | undefined;
    vi.stubGlobal('chrome', {
      devtools: {
        network: {
          onRequestFinished: { addListener: vi.fn(), removeListener: vi.fn() },
          onNavigated: { addListener: vi.fn(), removeListener: vi.fn() },
          getHAR: (callback: (har: unknown) => void) => (harCallback = callback),
        },
      },
    });
    const onObservations = vi.fn();
    startDevtoolsNetworkClient({ onObservations, onNavigated: vi.fn() });

    expect(() => harCallback?.({})).not.toThrow();
    expect(onObservations).not.toHaveBeenCalled();
  });

  it('routes supported non-Infinity requests to discovery evidence', () => {
    let finished: ((entry: HarEntry) => void) | undefined;
    vi.stubGlobal('chrome', {
      devtools: {
        network: {
          onRequestFinished: {
            addListener: (listener: (entry: HarEntry) => void) => (finished = listener),
            removeListener: vi.fn(),
          },
          onNavigated: { addListener: vi.fn(), removeListener: vi.fn() },
          getHAR: (callback: (har: unknown) => void) => callback({ entries: [] }),
        },
      },
    });
    const onDiscoveryEvidence = vi.fn();
    startDevtoolsNetworkClient({
      onObservations: vi.fn(),
      onDiscoveryEvidence,
      onNavigated: vi.fn(),
    });

    finished?.({
      request: {
        method: 'GET',
        url: 'https://www.google-analytics.com/g/collect?v=2&tid=G-EXAMPLE',
      },
      response: { status: 204, statusText: 'No Content' },
    });

    expect(onDiscoveryEvidence).toHaveBeenCalledWith([
      expect.objectContaining({ label: 'Google Analytics', identifier: 'G-EXAMPLE' }),
    ]);
  });
});
