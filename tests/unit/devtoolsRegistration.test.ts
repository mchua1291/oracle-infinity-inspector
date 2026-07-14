describe('DevTools panel registration', () => {
  it('registers a visible panel icon alongside the product label', async () => {
    const create = vi.fn();
    vi.stubGlobal('chrome', { devtools: { panels: { create } } });

    await import('../../src/devtools/devtools');

    expect(create).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledWith('Oracle Infinity', 'icons/icon-32.png', 'panel.html');
  });
});
