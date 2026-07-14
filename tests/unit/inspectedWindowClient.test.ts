import { afterEach, vi } from 'vitest';
import { getInspectedPageUrl } from '../../src/features/chrome/inspectedWindowClient';

afterEach(() => vi.unstubAllGlobals());

describe('inspected-window URL synchronization', () => {
  it('reads the URL from the tab attached to DevTools', async () => {
    const evaluate = vi.fn(
      (
        _expression: string,
        callback: (result: unknown, exceptionInfo?: { isException?: boolean }) => void,
      ) => callback('https://example.test/current-page', {}),
    );
    vi.stubGlobal('chrome', { devtools: { inspectedWindow: { eval: evaluate } } });

    await expect(getInspectedPageUrl()).resolves.toBe('https://example.test/current-page');
    expect(evaluate).toHaveBeenCalledWith('location.href', expect.any(Function));
  });

  it('returns unavailable when inspected-window evaluation fails', async () => {
    vi.stubGlobal('chrome', {
      devtools: {
        inspectedWindow: {
          eval: (
            _expression: string,
            callback: (result: unknown, exceptionInfo?: { isException?: boolean }) => void,
          ) => callback(undefined, { isException: true }),
        },
      },
    });

    await expect(getInspectedPageUrl()).resolves.toBeUndefined();
  });
});
