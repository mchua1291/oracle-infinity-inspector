import { DEFAULT_SETTINGS, ExtensionSettingsSchema, type ExtensionSettings } from '../models';

const SETTINGS_KEY = 'oracleImplementationInspector.settings';
const LEGACY_SETTINGS_KEY = 'oracleInfinityInspector.settings';

export async function loadSettings(): Promise<ExtensionSettings> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return DEFAULT_SETTINGS;
  const result = await chrome.storage.local.get([SETTINGS_KEY, LEGACY_SETTINGS_KEY]);
  const parsed = ExtensionSettingsSchema.safeParse(
    result[SETTINGS_KEY] ?? result[LEGACY_SETTINGS_KEY],
  );
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  const validated = ExtensionSettingsSchema.parse(settings);
  if (typeof chrome !== 'undefined' && chrome.storage?.local)
    await chrome.storage.local.set({ [SETTINGS_KEY]: validated });
}
