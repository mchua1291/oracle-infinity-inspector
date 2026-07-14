import { commerceEventDefinition } from '../diagnostics/commerceValidator';
import type { PlatformAdapter } from '../platform/platformAdapter';
import { parseNetworkRequest } from '../network/networkRequestParser';
import { isCollectionObservation, isSupportObservation } from '../network/observationCollection';
import { ORACLE_PARAMETER_CATALOG } from './oracleParameterCatalog';
import { isInfinityLikeUrl } from './infinityUrlPatterns';
import { summarizeInfinityLibraries } from './librarySummary';
import { summarizeInfinitySupportTraffic } from './supportTrafficSummary';
import { oracleInfinityDomAdapter } from './infinityDomAdapter';
import { oracleInfinityDiagnosticsAdapter } from './infinityDiagnosticsAdapter';
import { ORACLE_INFINITY_IDENTITY, ORACLE_INFINITY_PLATFORM_ID } from './infinityPlatformIdentity';

export { ORACLE_INFINITY_PLATFORM_ID } from './infinityPlatformIdentity';

export const oracleInfinityPlatformAdapter: PlatformAdapter = {
  identity: ORACLE_INFINITY_IDENTITY,
  catalogVersion: ORACLE_PARAMETER_CATALOG.version,
  catalogEntries: ORACLE_PARAMETER_CATALOG.entries,
  expectedProfileFields: [
    {
      key: 'environment',
      label: 'Environment',
      control: 'select',
      options: ['unknown', 'test', 'production'],
    },
    {
      key: 'accountGuids',
      label: 'Expected account GUIDs (comma-separated, stored locally)',
      control: 'text',
      maxLength: 2000,
    },
    { key: 'tagId', label: 'Tag ID', control: 'text', maxLength: 200 },
    { key: 'config', label: '_ora.config', control: 'text', maxLength: 500 },
    {
      key: 'loadMode',
      label: 'Expected load mode',
      control: 'select',
      options: [
        '',
        'synchronous',
        'asynchronous',
        'deferred',
        'dynamically-inserted',
        'tag-manager-injected',
        'unknown',
      ],
    },
  ],
  readExpectedProfileField(profile, fieldKey) {
    if (fieldKey === 'accountGuids') return profile.accountGuids.join(', ');
    if (fieldKey === 'environment') return profile.environment;
    if (fieldKey === 'tagId') return profile.tagId ?? '';
    if (fieldKey === 'config') return profile.config ?? '';
    if (fieldKey === 'loadMode') return profile.loadMode ?? '';
    const custom = profile.platformConfig?.[fieldKey];
    return Array.isArray(custom) ? custom.join(', ') : typeof custom === 'string' ? custom : '';
  },
  writeExpectedProfileField(profile, fieldKey, value) {
    if (fieldKey === 'accountGuids')
      return {
        ...profile,
        accountGuids: value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      };
    if (fieldKey === 'environment')
      return {
        ...profile,
        environment: value as 'unknown' | 'test' | 'production',
      };
    if (fieldKey === 'tagId') return { ...profile, tagId: value || undefined };
    if (fieldKey === 'config') return { ...profile, config: value || undefined };
    if (fieldKey === 'loadMode')
      return {
        ...profile,
        loadMode: (value || undefined) as typeof profile.loadMode,
      };
    return {
      ...profile,
      platformConfig: { ...profile.platformConfig, [fieldKey]: value },
    };
  },
  matchesRequestUrl: isInfinityLikeUrl,
  parseNetworkRequest(entry, importedCatalog = []) {
    const result = parseNetworkRequest(entry, importedCatalog);
    if (result.status === 'failed') return result;
    const data = result.data.map((event) => ({
      ...event,
      platformId: ORACLE_INFINITY_PLATFORM_ID,
    }));
    return result.status === 'partial' ? { ...result, data } : { ...result, data };
  },
  scanDocument: oracleInfinityDomAdapter.scanDocument,
  scanScriptElement: oracleInfinityDomAdapter.scanScriptElement,
  loaderDetails(loader) {
    return [
      { label: 'DOM path', value: loader.location.path },
      { label: 'Source', value: loader.sourceUrl ?? 'Inline loader evidence' },
      { label: 'Account GUID', value: loader.config.accountGuid || 'Unavailable' },
      { label: 'Tag ID', value: loader.config.tagId ?? 'Unavailable' },
      { label: '_ora.config', value: loader.config.config ?? 'Not present' },
      { label: 'Environment guess', value: loader.config.environmentGuess },
      {
        label: 'Attributes',
        value: `async=${String(loader.async)} · defer=${String(loader.defer)}`,
      },
    ];
  },
  eventDisplayName(event) {
    const commerce = commerceEventDefinition(event);
    if (commerce) return commerce.label;
    const eventValue = event.parameters.find(
      (parameter) => parameter.name.toLowerCase() === 'wt.ev' && parameter.value,
    )?.value;
    if (typeof eventValue === 'string') return eventValue;
    const title = event.parameters.find(
      (parameter) => parameter.name.toLowerCase() === 'wt.ti' && parameter.value,
    )?.value;
    const kind = event.eventKind
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
    return typeof title === 'string' ? `${kind} — ${title}` : kind;
  },
  networkEventDetails(event) {
    return [
      { label: 'Account GUID', value: event.accountGuid ?? 'Unavailable' },
      { label: 'wt.dl', value: event.wtDl ?? 'Unavailable' },
    ];
  },
  exportEventDetails(event) {
    return [
      { label: 'Account GUID', value: event.request.accountGuid ?? 'Unavailable' },
      { label: 'wt.dl', value: event.wtDl ?? 'Unavailable' },
    ];
  },
  summaryDetails(summary, exportedEventCount) {
    return [
      { label: 'CX Tag status', value: summary.tagStatus },
      { label: 'Loaders observed', value: String(summary.loaderCount) },
      {
        label: 'Infinity libraries observed',
        value: `${summary.libraryCount} (${summary.libraryIssueCount} with load issues)`,
      },
      { label: 'Tag managers observed', value: String(summary.tagManagerCount) },
      { label: 'Complete collection events documented', value: String(exportedEventCount) },
      { label: 'CX Tag events', value: String(summary.cxTagEventCount) },
      { label: 'Browser-visible DC API events', value: String(summary.dcApiEventCount) },
      { label: 'Infinity support/service requests', value: String(summary.supportTrafficCount) },
      {
        label: 'Out-of-the-box/custom/needs-review parameter observations',
        value: `${summary.standardParameterCount}/${summary.customParameterCount}/${summary.unknownParameterCount}`,
      },
      { label: 'Diagnostic warnings', value: String(summary.warningCount) },
    ];
  },
  overviewCards(summary) {
    return [
      {
        id: 'tag-status',
        label: 'CX Tag',
        value: summary.tagStatus,
        note: `${summary.loaderCount} DOM loader(s)`,
        tone: summary.tagStatus === 'detected' ? 'success' : 'neutral',
      },
      {
        id: 'observed-calls',
        label: 'Observed calls',
        value: String(summary.collectionEventCount),
        note: `${summary.cxTagEventCount} CX Tag · ${summary.dcApiEventCount} browser-visible DC API`,
      },
      {
        id: 'libraries',
        label: 'Libraries',
        value: String(summary.libraryCount),
        note: summary.libraryIssueCount
          ? `${summary.libraryIssueCount} load issue(s)`
          : 'Loaded or cache-validated',
      },
      {
        id: 'support',
        label: 'Support traffic',
        value: String(summary.supportTrafficCount),
        note: 'Not counted as events',
      },
      {
        id: 'tag-managers',
        label: 'Tag managers',
        value: String(summary.tagManagerCount),
        note: 'Implementation clues',
      },
      {
        id: 'standard',
        label: 'Standard',
        value: String(summary.standardParameterCount),
        note: 'Observed parameter rows',
      },
      {
        id: 'custom',
        label: 'Custom',
        value: String(summary.customParameterCount),
        note: 'Catalog-safe classification',
      },
      {
        id: 'review',
        label: 'Needs review',
        value: String(summary.unknownParameterCount),
        note: 'No Oracle documentation match',
      },
      {
        id: 'warnings',
        label: 'Warnings',
        value: String(summary.warningCount),
        note: `Confidence: ${summary.confidence}`,
      },
    ];
  },
  debugAction(pageUrl) {
    try {
      const url = new URL(pageUrl);
      url.searchParams.set('_ora.debug', 'vvvv');
      return {
        label: 'Copy URL with _ora.debug=vvvv',
        note: 'Copy only; the page is not reloaded or modified.',
        url: url.toString(),
      };
    } catch {
      return undefined;
    }
  },
  isCollectionObservation,
  isSupportObservation,
  summarizeLibraries: summarizeInfinityLibraries,
  summarizeSupportTraffic: summarizeInfinitySupportTraffic,
  buildDiagnostics: oracleInfinityDiagnosticsAdapter.buildDiagnostics,
  buildSummary: oracleInfinityDiagnosticsAdapter.buildSummary,
  exportNotes(session) {
    return [
      'Payload values, account GUIDs, and request URLs are exported exactly as observed.',
      'Only browser-visible Oracle Infinity traffic is included; server-side DC API calls are outside extension scope.',
      'DC API static parameters are inherited into each logical event and retain their origin metadata.',
      'Static Infinity libraries are summarized separately and are not counted as data collection events.',
      'Unverified Infinity support and service traffic is summarized separately and is not counted as data collection events.',
      'Tag-manager evidence identifies standard page-level snippets but does not prove which manager deployed Infinity.',
      ...(session.droppedObservationCount > 0
        ? [
            `${session.droppedObservationCount} older observations were removed after the session limit was reached.`,
          ]
        : []),
    ];
  },
};
