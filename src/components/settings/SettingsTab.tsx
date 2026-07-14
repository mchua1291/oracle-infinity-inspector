import { useState, type ChangeEvent } from 'react';
import {
  OracleParameterCatalogEntrySchema,
  type ExtensionSettings,
  type ExpectedDomainProfile,
} from '../../features/models';
import { ORACLE_PARAMETER_CATALOG } from '../../features/infinity/oracleParameterCatalog';
import { diagnosticsActions } from '../../store/diagnosticsStore';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Notice } from '../ui/Notice';
import { Toggle } from '../ui/Toggle';
import { z } from 'zod';

export function SettingsTab({
  settings,
  pageUrl,
}: {
  settings: ExtensionSettings;
  pageUrl: string;
}) {
  const [draft, setDraft] = useState(settings);
  const [message, setMessage] = useState('');
  let domain = '';
  try {
    domain = new URL(pageUrl).hostname;
  } catch {
    domain = '';
  }
  const profile = draft.expectedProfiles.find((item) => item.domain === domain) ?? {
    domain,
    environment: 'unknown' as const,
    accountGuids: [],
  };
  const update = (key: keyof ExtensionSettings, value: unknown) =>
    setDraft({ ...draft, [key]: value });
  const updateProfile = (next: ExpectedDomainProfile) =>
    setDraft({
      ...draft,
      expectedProfiles: [...draft.expectedProfiles.filter((item) => item.domain !== domain), next],
    });
  const importCatalog = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const entries = z
        .array(OracleParameterCatalogEntrySchema)
        .parse(JSON.parse(await file.text()));
      update('importedCatalog', entries);
      setMessage(`Imported ${entries.length} verified local entries into the draft.`);
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
            detail="Checks only whether window.ORA exists; no ORA methods are called."
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
          <Field label="Environment">
            <select
              value={profile.environment}
              onChange={(event) =>
                updateProfile({
                  ...profile,
                  environment: event.target.value as ExpectedDomainProfile['environment'],
                })
              }
              className="w-full rounded-lg border border-stone-300 px-3 py-2"
            >
              <option>unknown</option>
              <option>test</option>
              <option>production</option>
            </select>
          </Field>
          <Field label="Expected account GUIDs (comma-separated, stored locally)">
            <input
              value={profile.accountGuids.join(', ')}
              onChange={(event) =>
                updateProfile({
                  ...profile,
                  accountGuids: event.target.value
                    .split(',')
                    .map((item) => item.trim())
                    .filter(Boolean),
                })
              }
              className="w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </Field>
          <Field label="Tag ID">
            <input
              value={profile.tagId ?? ''}
              onChange={(event) =>
                updateProfile({ ...profile, tagId: event.target.value || undefined })
              }
              className="w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </Field>
          <Field label="_ora.config">
            <input
              value={profile.config ?? ''}
              onChange={(event) =>
                updateProfile({ ...profile, config: event.target.value || undefined })
              }
              className="w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </Field>
          <Field label="Expected load mode">
            <select
              value={profile.loadMode ?? ''}
              onChange={(event) =>
                updateProfile({
                  ...profile,
                  loadMode: (event.target.value || undefined) as ExpectedDomainProfile['loadMode'],
                })
              }
              className="w-full rounded-lg border border-stone-300 px-3 py-2"
            >
              <option value="">Not specified</option>
              {[
                'synchronous',
                'asynchronous',
                'deferred',
                'dynamically-inserted',
                'tag-manager-injected',
                'unknown',
              ].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
        </div>
      </Card>
      <Card>
        <h2 className="font-semibold">Local parameter catalog</h2>
        <p className="mt-2 text-sm text-stone-600">
          Bundled catalog: {ORACLE_PARAMETER_CATALOG.entries.length} documentation-backed entries ·
          version {ORACLE_PARAMETER_CATALOG.version}.
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
                'oracle-infinity-parameter-catalog.json',
                JSON.stringify(
                  [...ORACLE_PARAMETER_CATALOG.entries, ...draft.importedCatalog],
                  null,
                  2,
                ),
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
