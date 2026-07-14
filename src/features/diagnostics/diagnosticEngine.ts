import type {
  DiagnosticSession,
  DiagnosticSummary,
  DiagnosticWarning,
  ExpectedDomainProfile,
} from '../models';
import { buildCommerceDiagnostics } from './commerceValidator';
import { detectDuplicatePageViews } from './duplicateEventDetector';
import { summarizeInfinityLibraries } from '../infinity/librarySummary';

function warning(
  code: string,
  severity: DiagnosticWarning['severity'],
  title: string,
  message: string,
  recommendation: string,
  evidenceIds: string[] = [],
): DiagnosticWarning {
  return {
    id: `${code}:${evidenceIds.join(',') || 'session'}`,
    code,
    severity,
    title,
    message,
    recommendation,
    evidenceIds,
  };
}

function domainProfile(session: DiagnosticSession, profiles: ExpectedDomainProfile[]) {
  try {
    const hostname = new URL(session.pageUrl).hostname;
    return profiles.find((profile) => profile.domain.toLowerCase() === hostname.toLowerCase());
  } catch {
    return undefined;
  }
}

function environmentWarnings(
  session: DiagnosticSession,
  profile?: ExpectedDomainProfile,
): DiagnosticWarning[] {
  let hostname = '';
  try {
    hostname = new URL(session.pageUrl).hostname.toLowerCase();
  } catch {
    return [];
  }
  const testLikeDomain = /(^localhost$|\.localhost$|\b(?:dev|test|qa|stage|staging)\b)/i.test(
    hostname,
  );
  return session.loaders.flatMap((loader) => {
    const observed = loader.config.environmentGuess;
    if (
      profile &&
      profile.environment !== 'unknown' &&
      observed !== 'unknown' &&
      profile.environment !== observed
    ) {
      return [
        warning(
          'environment-profile-mismatch',
          'high',
          'Observed environment differs from expected profile',
          `Expected ${profile.environment}, but the loader config appears ${observed}.`,
          'Confirm the expected domain profile and CX Tag _ora.config value.',
          [loader.id],
        ),
      ];
    }
    if (observed === 'test' && !testLikeDomain) {
      return [
        warning(
          'test-config-production-domain',
          'medium',
          'Test config on a production-like domain',
          'The loader config appears to be test while the hostname is not test-like.',
          'Verify that the test configuration is intentional before release.',
          [loader.id],
        ),
      ];
    }
    if (observed === 'production' && testLikeDomain) {
      return [
        warning(
          'production-config-test-domain',
          'medium',
          'Production config on a test-like domain',
          'The loader config appears production on localhost or a test-like hostname.',
          'Use the intended non-production config for QA environments.',
          [loader.id],
        ),
      ];
    }
    return [];
  });
}

export function buildDiagnostics(
  session: DiagnosticSession,
  expectedProfiles: ExpectedDomainProfile[] = [],
): DiagnosticWarning[] {
  const warnings: DiagnosticWarning[] = [];
  const collection = session.networkObservations.filter(
    (event) => event.eventKind !== 'loader' && event.eventKind !== 'library',
  );
  const loaderNetwork = session.networkObservations.filter((event) => event.eventKind === 'loader');
  const loaderEvidenceIds = [
    ...session.loaders.map((loader) => loader.id),
    ...loaderNetwork.map((event) => event.id),
  ];

  if (loaderEvidenceIds.length === 0) {
    warnings.push(
      warning(
        'no-tag-detected',
        session.captureMayBeIncomplete ? 'low' : 'medium',
        'No CX Tag loader detected',
        'No documented odc.js loader was found in the DOM or observed network traffic.',
        'Open DevTools before page load, reload, and verify tag-manager or consent conditions.',
      ),
    );
  }
  if (loaderEvidenceIds.length > 0 && collection.length === 0) {
    warnings.push(
      warning(
        'tag-no-collection',
        'medium',
        'Loader detected but no collection call observed',
        'A CX Tag loader was observed, but no dcs.gif or browser-visible DC API collection event was captured.',
        'Reload with DevTools open and exercise the expected page view or event.',
        loaderEvidenceIds,
      ),
    );
  }
  if (session.loaders.length > 1) {
    warnings.push(
      warning(
        'multiple-loaders',
        'medium',
        'Multiple CX Tag loaders detected',
        `${session.loaders.length} loader elements or inline loader snippets were observed.`,
        'Confirm that only the intended loader runs once.',
        session.loaders.map((loader) => loader.id),
      ),
    );
  }
  const accounts = new Set(
    [
      ...session.loaders.map((loader) => loader.config.accountGuid),
      ...session.networkObservations.map((event) => event.accountGuid),
    ].filter(Boolean),
  );
  if (accounts.size > 1) {
    warnings.push(
      warning(
        'multiple-account-guids',
        'high',
        'Multiple account GUIDs observed',
        `${accounts.size} distinct account GUIDs were observed in this session.`,
        'Compare the observed accounts with the expected domain profile.',
        loaderEvidenceIds,
      ),
    );
  }
  if (session.captureMayBeIncomplete) {
    warnings.push(
      warning(
        'reload-recommended',
        'info',
        'Network capture may be incomplete',
        'Chrome DevTools was opened after navigation, so earlier requests may be missing.',
        'Clear the session and reload the inspected page with DevTools open.',
      ),
    );
  }
  const expected = domainProfile(session, expectedProfiles);
  warnings.push(...environmentWarnings(session, expected));
  if (expected?.loadMode) {
    for (const loader of session.loaders.filter((entry) => entry.loadMode !== expected.loadMode)) {
      warnings.push(
        warning(
          'load-mode-mismatch',
          'medium',
          'Sync/async inference differs from expected profile',
          `Expected ${expected.loadMode}; observed inference is ${loader.loadMode}.`,
          'Review the load-mode evidence. Inference is not a guaranteed execution trace.',
          [loader.id],
        ),
      );
    }
  }
  for (const event of session.networkObservations) {
    if (event.eventKind === 'library' && event.statusCode >= 400) {
      warnings.push(
        warning(
          'infinity-library-failed',
          'high',
          'Infinity library failed to load',
          `${event.libraryName ?? 'An Infinity library'} returned HTTP ${event.statusCode}.`,
          'Inspect the response, CDN reachability, consent rules, and content-security policy for this resource.',
          [event.id],
        ),
      );
      continue;
    }
    if (event.sourceType === 'dcapi-browser-visible' && event.requestBodyParseStatus === 'failed') {
      warnings.push(
        warning(
          'malformed-dcapi',
          'high',
          'DC API payload unavailable or malformed',
          event.warnings.join(' ') || 'The DC API payload could not be parsed.',
          'Inspect the request payload and ensure it contains a valid events array of string-valued objects.',
          [event.id],
        ),
      );
    }
    if (event.statusCode >= 400) {
      warnings.push(
        warning(
          'failed-oracle-request',
          'high',
          'Oracle request failed',
          `${event.requestMethod} returned HTTP ${event.statusCode}.`,
          'Inspect the response and request details in the Network panel.',
          [event.id],
        ),
      );
    }
  }
  warnings.push(...buildCommerceDiagnostics(collection));
  for (const group of detectDuplicatePageViews(session.networkObservations)) {
    warnings.push(
      warning(
        'duplicate-page-view',
        'medium',
        'Possible duplicate page views',
        'Matching page-view identity parameters were observed within five seconds.',
        'Check whether multiple view triggers run for the same route. This is a heuristic, not proof.',
        group.eventIds,
      ),
    );
  }
  const warnedUnknown = new Set<string>();
  for (const parameter of session.parameters) {
    if (parameter.value === '' || parameter.value === null)
      warnings.push(
        warning(
          'empty-parameter-value',
          'medium',
          'Empty parameter value observed',
          `${parameter.name} was collected with ${parameter.value === null ? 'a null value' : 'an empty string'}.`,
          'Confirm whether this parameter is required and whether the tag should omit it or populate an expected value.',
          [parameter.id],
        ),
      );
    if (parameter.sensitivity === 'email')
      warnings.push(
        warning(
          'suspected-email',
          'high',
          'Possible raw email collected',
          `${parameter.name} contains an email-like value.`,
          'Remove, transform, or explicitly approve the value according to your privacy policy.',
          [parameter.id],
        ),
      );
    if (parameter.sensitivity === 'token-or-secret')
      warnings.push(
        warning(
          'suspected-token',
          'high',
          'Possible token or secret collected',
          `${parameter.name} contains a long token-like value.`,
          'Do not send authentication tokens or secrets to analytics.',
          [parameter.id],
        ),
      );
    if (parameter.classification === 'unknown' && !warnedUnknown.has(parameter.name)) {
      warnedUnknown.add(parameter.name);
      warnings.push(
        warning(
          'unknown-parameter',
          'low',
          'Observed parameter needs review',
          `${parameter.name} did not match the bundled Oracle documentation catalog and uses a reserved or unrecognized name.`,
          'Verify it against your implementation catalog or import a documentation-backed catalog entry.',
          [parameter.id],
        ),
      );
    }
  }
  const customGroups = new Map<string, Set<string | null>>();
  for (const parameter of session.parameters.filter((item) => item.classification === 'custom')) {
    const values = customGroups.get(parameter.name) ?? new Set<string>();
    values.add(parameter.value);
    customGroups.set(parameter.name, values);
  }
  for (const [name, values] of customGroups) {
    if (values.size > 20)
      warnings.push(
        warning(
          'custom-cardinality',
          'medium',
          'High custom-parameter cardinality',
          `${name} has ${values.size} unique observed values.`,
          'Confirm that this cardinality is intentional and useful.',
        ),
      );
  }
  warnings.push(
    warning(
      'server-side-visibility',
      'info',
      'Server-side DC API is outside browser scope',
      'This session reports only browser-visible DC API traffic; backend calls cannot be observed by a Chromium extension.',
      'Use server logs or backend observability for server-side DC API verification.',
    ),
  );
  return warnings;
}

export function buildSummary(session: DiagnosticSession): DiagnosticSummary {
  const loaderNetwork = session.networkObservations.filter((event) => event.eventKind === 'loader');
  const collection = session.networkObservations.filter(
    (event) => event.eventKind !== 'loader' && event.eventKind !== 'library',
  );
  const libraries = summarizeInfinityLibraries(session.networkObservations);
  const tagStatus =
    session.loaders.length || loaderNetwork.length
      ? 'detected'
      : collection.length
        ? 'inconclusive'
        : 'not-detected';
  return {
    tagStatus,
    loaderCount: session.loaders.length,
    libraryCount: libraries.length,
    libraryIssueCount: libraries.filter((library) => library.state === 'failed').length,
    tagManagerCount: session.tagManagers?.length ?? 0,
    collectionEventCount: collection.length,
    cxTagEventCount: collection.filter((event) => event.sourceType === 'cx-tag-network').length,
    dcApiEventCount: collection.filter((event) => event.sourceType === 'dcapi-browser-visible')
      .length,
    standardParameterCount: session.parameters.filter((item) => item.classification === 'standard')
      .length,
    customParameterCount: session.parameters.filter((item) => item.classification === 'custom')
      .length,
    unknownParameterCount: session.parameters.filter((item) => item.classification === 'unknown')
      .length,
    warningCount: session.warnings.length,
    confidence:
      tagStatus === 'detected' && session.loaders.some((loader) => loader.confidence === 'direct')
        ? 'direct'
        : tagStatus === 'not-detected'
          ? 'low'
          : 'inferred',
    reloadRecommended: session.captureMayBeIncomplete,
  };
}

export function withDiagnostics(
  session: DiagnosticSession,
  profiles: ExpectedDomainProfile[] = [],
): DiagnosticSession {
  const warnings = buildDiagnostics(session, profiles);
  const warningTimeline = warnings.map((item) => ({
    id: `timeline:${item.id}`,
    timestamp: session.scanTimestamp,
    type: 'warning' as const,
    title: item.title,
    detail: item.message,
    severity: item.severity,
  }));
  return {
    ...session,
    warnings,
    timeline: [...session.timeline.filter((entry) => entry.type !== 'warning'), ...warningTimeline],
  };
}
