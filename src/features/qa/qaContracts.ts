import type {
  DiagnosticSession,
  DiagnosticWarning,
  PlatformNetworkObservation,
  QaConsentExpectation,
  QaExpectedEvent,
  QaExpectedEventResult,
  QaPlan,
  QaPlanRun,
  QaPlanStep,
  QaPlanStepRun,
  QaPresenceExpectation,
  QaScoreFinding,
  QaScoreStatus,
  QaScorecard,
} from '../models';
import { platformAdapterForSession } from '../platform/platformRegistry';

function now(): string {
  return new Date().toISOString();
}

function identifierNames(events: PlatformNetworkObservation[]): string[] {
  return [
    ...new Set(
      events.flatMap((event) =>
        event.parameters
          .filter((parameter) => parameter.sensitivity === 'identifier')
          .map((parameter) => parameter.name),
      ),
    ),
  ].sort();
}

function parameterValue(
  event: PlatformNetworkObservation,
  name: string,
): string | null | undefined {
  return event.parameters.find((parameter) => parameter.name.toLowerCase() === name.toLowerCase())
    ?.value;
}

function matchesEvent(event: PlatformNetworkObservation, expected: QaExpectedEvent): boolean {
  const { matcher } = expected;
  return (
    (!matcher.eventKind || event.eventKind === matcher.eventKind) &&
    (!matcher.sourceType || event.sourceType === matcher.sourceType) &&
    (!matcher.wtDl || event.wtDl === matcher.wtDl) &&
    (!matcher.eventName || parameterValue(event, 'wt.ev') === matcher.eventName)
  );
}

function finding(
  code: string,
  outcome: 'warn' | 'fail',
  message: string,
  eventIds: string[] = [],
  parameterNames: string[] = [],
): QaScoreFinding {
  return { code, outcome, message, eventIds, parameterNames };
}

function statusFromFindings(findings: QaScoreFinding[]): 'pass' | 'warn' | 'fail' {
  if (findings.some((item) => item.outcome === 'fail')) return 'fail';
  if (findings.some((item) => item.outcome === 'warn')) return 'warn';
  return 'pass';
}

function evaluateExpectedEvent(
  expected: QaExpectedEvent,
  events: PlatformNetworkObservation[],
): QaExpectedEventResult {
  const matched = events.filter((event) => matchesEvent(event, expected));
  const findings: QaScoreFinding[] = [];
  if (matched.length < expected.minCount)
    findings.push(
      finding(
        'expected-event-minimum',
        'fail',
        `${expected.name} expected at least ${expected.minCount} matching event(s), but ${matched.length} were captured.`,
      ),
    );
  if (expected.maxCount !== undefined && matched.length > expected.maxCount)
    findings.push(
      finding(
        'expected-event-maximum',
        'fail',
        `${expected.name} expected no more than ${expected.maxCount} matching event(s), but ${matched.length} were captured.`,
        matched.map((event) => event.id),
      ),
    );

  for (const requirement of expected.parameters) {
    for (const event of matched) {
      const parameter = event.parameters.find(
        (item) => item.name.toLowerCase() === requirement.name.toLowerCase(),
      );
      if (requirement.presence === 'forbidden' && parameter) {
        findings.push(
          finding(
            'forbidden-parameter',
            'fail',
            `${requirement.name} was present on ${expected.name}, but the QA contract forbids it.`,
            [event.id],
            [requirement.name],
          ),
        );
        continue;
      }
      if (requirement.presence === 'required' && !parameter) {
        findings.push(
          finding(
            'required-parameter-missing',
            'fail',
            `${requirement.name} is required on every ${expected.name} event and was missing.`,
            [event.id],
            [requirement.name],
          ),
        );
        continue;
      }
      if (!parameter) continue;
      if (!requirement.allowEmpty && (parameter.value === '' || parameter.value === null))
        findings.push(
          finding(
            'contract-empty-parameter',
            requirement.presence === 'required' ? 'fail' : 'warn',
            `${requirement.name} was present on ${expected.name} with ${parameter.value === null ? 'a null value' : 'an empty string'}.`,
            [event.id],
            [requirement.name],
          ),
        );
      if (requirement.valuePattern && parameter.value !== null) {
        try {
          if (!new RegExp(requirement.valuePattern).test(parameter.value))
            findings.push(
              finding(
                'parameter-pattern-mismatch',
                requirement.presence === 'optional' ? 'warn' : 'fail',
                `${requirement.name} did not match the configured pattern for ${expected.name}.`,
                [event.id],
                [requirement.name],
              ),
            );
        } catch {
          findings.push(
            finding(
              'invalid-contract-pattern',
              'fail',
              `${requirement.name} has an invalid regular-expression pattern in the QA contract.`,
              [event.id],
              [requirement.name],
            ),
          );
        }
      }
    }
  }

  return {
    expectationId: expected.id,
    expectationName: expected.name,
    status: statusFromFindings(findings),
    matchedEventIds: matched.map((event) => event.id),
    findings,
  };
}

function evaluatePresence(
  label: string,
  expectation: QaPresenceExpectation,
  present: boolean,
  eventIds: string[],
  parameterNames: string[] = [],
): QaScoreFinding[] {
  if (expectation === 'blocked' && present)
    return [
      finding(
        `consent-${label}-blocked`,
        'fail',
        `${label} was observed at a checkpoint where the QA contract expected it to be blocked.`,
        eventIds,
        parameterNames,
      ),
    ];
  if (expectation === 'required' && !present)
    return [
      finding(
        `consent-${label}-required`,
        'fail',
        `${label} was not observed at a checkpoint where the QA contract requires it.`,
      ),
    ];
  return [];
}

function diagnosticFindings(
  events: PlatformNetworkObservation[],
  warnings: DiagnosticWarning[],
): QaScoreFinding[] {
  const evidenceIds = new Set(
    events.flatMap((event) => [event.id, ...event.parameters.map((parameter) => parameter.id)]),
  );
  const findings = warnings
    .filter(
      (warning) =>
        warning.severity !== 'info' && warning.evidenceIds.some((id) => evidenceIds.has(id)),
    )
    .map((warning) =>
      finding(
        `diagnostic:${warning.code}`,
        warning.severity === 'high' ? 'fail' : 'warn',
        `${warning.title}: ${warning.message}`,
        warning.evidenceIds.filter((id) => evidenceIds.has(id)),
      ),
    );
  for (const event of events)
    for (const warning of event.warnings)
      findings.push(finding('event-parser-warning', 'warn', warning, [event.id]));
  return findings;
}

function consentFindings(
  consent: QaConsentExpectation,
  events: PlatformNetworkObservation[],
  loaderDetected: boolean,
): QaScoreFinding[] {
  const ids = identifierNames(events);
  const eventIds = events.map((event) => event.id);
  return [
    ...evaluatePresence('collection', consent.collection, events.length > 0, eventIds),
    ...evaluatePresence('loader', consent.loader, loaderDetected, eventIds),
    ...evaluatePresence('identifiers', consent.identifiers, ids.length > 0, eventIds, ids),
  ];
}

function overallRunStatus(steps: QaPlanStepRun[]): QaScoreStatus {
  if (steps.some((step) => step.status === 'in-progress')) return 'in-progress';
  if (steps.some((step) => step.status === 'not-run')) return 'in-progress';
  if (steps.some((step) => step.status === 'fail')) return 'fail';
  if (steps.some((step) => step.status === 'warn')) return 'warn';
  return steps.length ? 'pass' : 'not-run';
}

export function createExpectedEvent(name = 'Expected event'): QaExpectedEvent {
  return {
    id: crypto.randomUUID(),
    name,
    matcher: {},
    minCount: 1,
    maxCount: 1,
    parameters: [],
  };
}

export function createScenarioStep(name = 'Scenario step'): QaPlanStep {
  return {
    id: crypto.randomUUID(),
    name,
    kind: 'scenario',
    expectedEvents: [createExpectedEvent()],
    unexpectedEventPolicy: 'warn',
  };
}

export function createConsentCheckpointStep(
  state: QaConsentExpectation['state'] = 'before-choice',
): QaPlanStep {
  const collection = state === 'accepted' ? 'required' : 'blocked';
  return {
    id: crypto.randomUUID(),
    name: `Consent checkpoint: ${state.replace('-', ' ')}`,
    kind: 'consent-checkpoint',
    expectedEvents: [],
    unexpectedEventPolicy: 'ignore',
    consent: {
      state,
      collection,
      loader: 'allowed',
      identifiers: state === 'accepted' ? 'allowed' : 'blocked',
    },
  };
}

export function createQaPlan(name = 'New QA plan', domain?: string, platformId?: string): QaPlan {
  const timestamp = now();
  return {
    id: crypto.randomUUID(),
    name,
    domain,
    platformId,
    createdAt: timestamp,
    updatedAt: timestamp,
    steps: [createScenarioStep()],
  };
}

export function startQaPlanRun(plan: QaPlan): QaPlanRun {
  return {
    id: crypto.randomUUID(),
    planId: plan.id,
    planName: plan.name,
    platformId: plan.platformId,
    startedAt: now(),
    status: 'in-progress',
    steps: plan.steps.map((step) => ({
      step,
      status: 'not-run',
      baselineEventIds: [],
      observedEvents: [],
      expectationResults: [],
      findings: [],
    })),
  };
}

export function startQaStep(run: QaPlanRun, stepId: string, session: DiagnosticSession): QaPlanRun {
  if (!run.steps.some((step) => step.step.id === stepId))
    throw new Error('The selected QA step is not part of this run.');
  if (run.activeStepId)
    throw new Error('Complete or cancel the active QA step before starting another step.');
  const adapter = platformAdapterForSession(session);
  const baselineEventIds = session.networkObservations
    .filter(adapter.isCollectionObservation)
    .map((event) => event.id);
  return {
    ...run,
    activeStepId: stepId,
    completedAt: undefined,
    status: 'in-progress',
    steps: run.steps.map((stepRun) =>
      stepRun.step.id === stepId
        ? {
            ...stepRun,
            status: 'in-progress',
            startedAt: now(),
            completedAt: undefined,
            startPageUrl: session.pageUrl,
            baselineEventIds,
            observedEvents: [],
            expectationResults: [],
            findings: [],
            consentSnapshot: undefined,
          }
        : stepRun,
    ),
  };
}

export function completeQaStep(
  run: QaPlanRun,
  stepId: string,
  session: DiagnosticSession,
): QaPlanRun {
  const adapter = platformAdapterForSession(session);
  const stepRun = run.steps.find((item) => item.step.id === stepId);
  if (!stepRun || stepRun.status !== 'in-progress')
    throw new Error('Start the QA step before completing it.');
  const baseline = new Set(stepRun.baselineEventIds);
  const events = session.networkObservations.filter(
    (event) => adapter.isCollectionObservation(event) && !baseline.has(event.id),
  );
  const expectationResults = stepRun.step.expectedEvents.map((expected) =>
    evaluateExpectedEvent(expected, events),
  );
  const matchedIds = new Set(expectationResults.flatMap((result) => result.matchedEventIds));
  const unexpected = events.filter((event) => !matchedIds.has(event.id));
  const findings = [
    ...expectationResults.flatMap((result) => result.findings),
    ...diagnosticFindings(events, session.warnings),
  ];
  if (unexpected.length > 0 && stepRun.step.unexpectedEventPolicy !== 'ignore')
    findings.push(
      finding(
        'unexpected-events',
        stepRun.step.unexpectedEventPolicy,
        `${unexpected.length} collection event(s) did not match an expectation for this step.`,
        unexpected.map((event) => event.id),
      ),
    );
  if (stepRun.step.consent)
    findings.push(...consentFindings(stepRun.step.consent, events, session.loaders.length > 0));

  const completedStep: QaPlanStepRun = {
    ...stepRun,
    status: statusFromFindings(findings),
    completedAt: now(),
    observedEvents: events,
    expectationResults,
    findings,
    consentSnapshot: stepRun.step.consent
      ? {
          state: stepRun.step.consent.state,
          pageUrl: session.pageUrl,
          observedAt: now(),
          collectionEventCount: events.length,
          loaderDetected: session.loaders.length > 0,
          identifierParameterNames: identifierNames(events),
        }
      : undefined,
  };
  const steps = run.steps.map((item) => (item.step.id === stepId ? completedStep : item));
  const status = overallRunStatus(steps);
  return {
    ...run,
    activeStepId: undefined,
    status,
    completedAt: steps.every((item) => !['not-run', 'in-progress'].includes(item.status))
      ? now()
      : undefined,
    steps,
  };
}

export function cancelQaStep(run: QaPlanRun, stepId: string): QaPlanRun {
  if (run.activeStepId !== stepId) throw new Error('Only the active QA step can be cancelled.');
  return {
    ...run,
    activeStepId: undefined,
    status: 'in-progress',
    steps: run.steps.map((stepRun) =>
      stepRun.step.id === stepId
        ? {
            ...stepRun,
            status: 'not-run',
            startedAt: undefined,
            completedAt: undefined,
            baselineEventIds: [],
            observedEvents: [],
            expectationResults: [],
            findings: [],
            consentSnapshot: undefined,
          }
        : stepRun,
    ),
  };
}

export function buildQaScorecard(run?: QaPlanRun): QaScorecard | undefined {
  if (!run) return undefined;
  const summary = {
    total: run.steps.length,
    passed: run.steps.filter((step) => step.status === 'pass').length,
    warnings: run.steps.filter((step) => step.status === 'warn').length,
    failed: run.steps.filter((step) => step.status === 'fail').length,
    notRun: run.steps.filter((step) => ['not-run', 'in-progress'].includes(step.status)).length,
  };
  return {
    runId: run.id,
    planId: run.planId,
    planName: run.planName,
    status: run.status,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    summary,
    steps: run.steps.map((stepRun) => ({
      stepId: stepRun.step.id,
      name: stepRun.step.name,
      kind: stepRun.step.kind,
      status: stepRun.status,
      startedAt: stepRun.startedAt,
      completedAt: stepRun.completedAt,
      observedEventIds: stepRun.observedEvents.map((event) => event.id),
      expectationResults: stepRun.expectationResults,
      findings: stepRun.findings,
      consentSnapshot: stepRun.consentSnapshot,
    })),
  };
}
