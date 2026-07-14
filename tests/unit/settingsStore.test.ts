import { DEFAULT_SETTINGS } from '../../src/features/models';
import { loadSettings, saveSettings } from '../../src/features/settings/settingsStore';

describe('settings storage migration', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('loads legacy Infinity settings when the product-neutral key is absent', async () => {
    const legacySettings = { ...DEFAULT_SETTINGS, enableDomMutationMonitoring: false };
    const get = vi.fn().mockResolvedValue({
      'oracleInfinityInspector.settings': legacySettings,
    });
    vi.stubGlobal('chrome', { storage: { local: { get } } });

    await expect(loadSettings()).resolves.toEqual(legacySettings);
    expect(get).toHaveBeenCalledWith([
      'oracleImplementationInspector.settings',
      'oracleInfinityInspector.settings',
    ]);
  });

  it('prefers the product-neutral settings when both keys exist', async () => {
    const currentSettings = { ...DEFAULT_SETTINGS, enablePageContextDetection: false };
    const get = vi.fn().mockResolvedValue({
      'oracleImplementationInspector.settings': currentSettings,
      'oracleInfinityInspector.settings': DEFAULT_SETTINGS,
    });
    vi.stubGlobal('chrome', { storage: { local: { get } } });

    await expect(loadSettings()).resolves.toEqual(currentSettings);
  });

  it('writes validated settings only to the product-neutral key', async () => {
    const set = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('chrome', { storage: { local: { set } } });

    await saveSettings(DEFAULT_SETTINGS);

    expect(set).toHaveBeenCalledWith({
      'oracleImplementationInspector.settings': DEFAULT_SETTINGS,
    });
  });
});
