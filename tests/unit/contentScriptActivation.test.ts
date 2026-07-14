describe('content-script activation', () => {
  it('does not inspect or publish until the DevTools panel activates it', async () => {
    vi.resetModules();
    document.documentElement.innerHTML =
      '<head><script src="https://d.oracleinfinity.io/infy/acs/account/example/js/tag/odc.js"></script></head><body></body>';
    let listener:
      | ((message: unknown, sender: unknown, sendResponse: (value: unknown) => void) => void)
      | undefined;
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage,
        onMessage: {
          addListener: (
            next: (
              message: unknown,
              sender: unknown,
              sendResponse: (value: unknown) => void,
            ) => void,
          ) => (listener = next),
        },
      },
    });

    await import('../../src/content/domScannerContentScript');
    expect(sendMessage).not.toHaveBeenCalled();

    listener?.({ type: 'ACTIVATE_DOM_INSPECTION', monitorMutations: true }, {}, vi.fn());
    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'DOM_SCAN', pageUrl: window.location.href }),
    );
  });
});
