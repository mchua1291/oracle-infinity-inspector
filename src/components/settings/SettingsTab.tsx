import { useState, type ChangeEvent } from 'react';
import {
  ParameterCatalogEntrySchema,
  type ExtensionSettings,
  type ExpectedDomainProfile,
} from '../../features/models';
import { getPlatformAdapter } from '../../features/platform/platformRegistry';
import { diagnosticsActions } from '../../store/diagnosticsStore';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Notice } from '../ui/Notice';
import { Toggle } from '../ui/Toggle';
import { z } from 'zod';

export function SettingsTab({
  settings,
  pageUrl,
  platformId,
}: {
  settings: ExtensionSettings;
  pageUrl: string;
  platformId: string;
}) {
  const adapter = getPlatformAdapter(platformId);
  const { identity } = adapter;
  const [draft, setDraft] = useState(settings);
  const [message, setMessage] = useState('');
  let domain = '';
  try {
    domain = new URL(pageUrl).hostname;
  } catch {
    domain = '';
  }
  const profile = draft.expectedProfiles.find(
    (item) =>
      item.domain.toLowerCase() === domain.toLowerCase() &&
      (!item.platformId || item.platformId === identity.id),
  ) ?? {
    domain,
    platformId: identity.id,
    environment: 'unknown' as const,
    accountGuids: [],
  };
  const update = (key: keyof ExtensionSettings, value: unknown) =>
    setDraft({ ...draft, [key]: value });
  const updateProfile = (next: ExpectedDomainProfile) =>
    setDraft({
      ...draft,
      expectedProfiles: [
        ...draft.expectedProfiles.filter(
          (item) =>
            item.domain.toLowerCase() !== domain.toLowerCase() ||
            (item.platformId && item.platformId !== identity.id),
        ),
        { ...next, platformId: identity.id },
      ],
    });
  const importCatalog = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const entries = z
        .array(ParameterCatalogEntrySchema)
        .max(1000)
        .parse(JSON.parse(await file.text()));
      const deduplicated = [
        ...new Map(entries.map((entry) => [entry.name.toLowerCase(), entry])).values(),
      ];
      update('importedCatalog', deduplicated);
      setMessage(`Imported ${deduplicated.length} verified local entries into the draft.`);
    } catch {
      setMessage('Catalog import failed schema validation. No entries were applied.');
    }
  };
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <h2 className="font-semibold">Capture behavior</h2>
        <div className="mt-2">
          <Toggle
            label="Enable DOM mutation monitoring"
            checked={draft.enableDomMutationMonitoring}
            onChange={(value) => update('enableDomMutationMonitoring', value)}
          />
          <Toggle
            label="Enable optional page-context detection"
            detail={`Checks only whether ${identity.pageContextLabel} exists; no platform methods are called.`}
            checked={draft.enablePageContextDetection}
            onChange={(value) => update('enablePageContextDetection', value)}
          />
          <Toggle
            label="Enable reload recommendation banner"
            checked={draft.enableReloadRecommendationBanner}
            onChange={(value) => update('enableReloadRecommendationBanner', value)}
          />
        </div>
      </Card>
      <Card>
        <h2 className="font-semibold">Expected profile for current domain</h2>
        <p className="mt-1 text-xs text-stone-500">
          {domain || 'No valid inspected hostname is available.'}
        </p>
        <div className="mt-4 grid gap-3">
          {adapter.expectedProfileFields.map((field) => (
            <Field label={field.label} key={field.key}>
              {field.control === 'select' ? (
                <select
                  value={adapter.readExpectedProfileField(profile, field.key)}
                  onChange={(event) =>
                    updateProfile(
                      adapter.writeExpectedProfileField(profile, field.key, event.target.value),
                    )
                  }
                  className="w-full rounded-lg border border-stone-300 px-3 py-2"
                >
                  {field.options?.map((option) => (
                    <option key={option || 'not-specified'} value={option}>
                      {option || 'Not specified'}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  maxLength={field.maxLength}
                  value={adapter.readExpectedProfileField(profile, field.key)}
                  onChange={(event) =>
                    updateProfile(
                      adapter.writeExpectedProfileField(profile, field.key, event.target.value),
                    )
                  }
                  className="w-full rounded-lg border border-stone-300 px-3 py-2"
                />
              )}
            </Field>
          ))}
        </div>
      </Card>
      <Card>
        <h2 className="font-semibold">Local parameter catalog</h2>
        <p className="mt-2 text-sm text-stone-600">
          Bundled catalog: {adapter.catalogEntries.length} documentation-backed entries · version{' '}
          {adapter.catalogVersion}.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <label className="cursor-pointer rounded-lg bg-stone-200 px-3 py-2 text-sm font-semibold">
            Import catalog JSON
            <input
              type="file"
              accept="application/json"
              onChange={(event) => void importCatalog(event)}
              className="sr-only"
            />
          </label>
          <Button
            onClick={() =>
              download(
                `${identity.id}-parameter-catalog.json`,
                JSON.stringify([...adapter.catalogEntries, ...draft.importedCatalog], null, 2),
              )
            }
          >
            Export local catalog
          </Button>
        </div>
        {message && <p className="mt-3 text-sm text-stone-600">{message}</p>}
      </Card>
      <Card>
        <h2 className="font-semibold">Session controls</h2>
        <Notice>
          Reset clears in-memory observations for this inspected tab. It does not alter the page or
          delete your saved settings.
        </Notice>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            onClick={() =>
              void diagnosticsActions
                .updateSettings(draft)
                .then(() => setMessage('Settings saved locally.'))
            }
          >
            Save settings
          </Button>
          <Button
            className="bg-red-700 hover:bg-red-800"
            onClick={() => void diagnosticsActions.reset(false)}
          >
            Reset session data
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label>
      <span className="mb-1 block text-xs font-semibold text-stone-600">{label}</span>
      {children}
    </label>
  );
}
function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}
