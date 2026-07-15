import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Popup } from '../../src/popup/PopupView';

function popupChrome() {
  const listeners = new Set<(message: unknown) => boolean>();
  const sendMessage = vi.fn(async (message: { type: string }) => {
    if (message.type === 'SCAN_TAB_DOM_ONCE') return { ok: true };
    if (message.type === 'GET_TAB_SUMMARY')
      return {
        pageUrl: 'https://www.example.test/products',
        platformId: 'oracle-infinity',
        scannedAt: '2026-07-13T22:00:00.000Z',
        summary: {
          tagStatus: 'detected',
          loaderCount: 1,
          libraryCount: 2,
          libraryIssueCount: 0,
          tagManagerCount: 1,
          collectionEventCount: 3,
          cxTagEventCount: 3,
          dcApiEventCount: 0,
          supportTrafficCount: 0,
          standardParameterCount: 12,
          customParameterCount: 4,
          unknownParameterCount: 1,
          warningCount: 1,
          confidence: 'observed',
          reloadRecommended: false,
        },
        warnings: [{ severity: 'medium', title: 'Empty parameter value observed' }],
      };
    return undefined;
  });
  return {
    runtime: {
      sendMessage,
      onMessage: {
        addListener: (listener: (message: unknown) => boolean) => listeners.add(listener),
        removeListener: (listener: (message: unknown) => boolean) => listeners.delete(listener),
      },
    },
    tabs: { query: vi.fn().mockResolvedValue([{ id: 7 }]) },
    sendMessage,
  };
}

describe('popup companion', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows actionable status and runs a one-time page scan', async () => {
    const chrome = popupChrome();
    vi.stubGlobal('chrome', chrome);
    render(<Popup />);

    expect(await screen.findByText('Page QA companion')).toBeInTheDocument();
    expect(screen.getByText('www.example.test')).toBeInTheDocument();
    expect(screen.getByText('Empty parameter value observed')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Scan current page' }));
    expect(screen.getByRole('button', { name: /^Scanning/ })).toBeDisabled();
    await waitFor(() =>
      expect(chrome.sendMessage).toHaveBeenCalledWith({ type: 'SCAN_TAB_DOM_ONCE', tabId: 7 }),
    );
    expect(await screen.findByText('Page implementation evidence refreshed.')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Scan current page' })).toBeEnabled(),
    );
  });
});
