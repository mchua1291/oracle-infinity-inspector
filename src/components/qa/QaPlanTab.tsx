import { useEffect, useMemo, useState } from 'react';
import {
  QaPlanSchema,
  type ExtensionSettings,
  type QaExpectedEvent,
  type QaParameterRequirement,
  type QaPlan,
  type QaPlanRun,
  type QaPlanStep,
  type QaPresenceExpectation,
  type QaScoreStatus,
} from '../../features/models';
import {
  buildQaScorecard,
  createConsentCheckpointStep,
  createExpectedEvent,
  createQaPlan,
  createScenarioStep,
} from '../../features/qa/qaContracts';
import { runExtensionOperation } from '../../features/chrome/extensionLifecycle';
import { diagnosticsActions } from '../../store/diagnosticsStore';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Notice } from '../ui/Notice';

const inputClass = 'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm';
const consentStates = ['before-choice', 'rejected', 'accepted', 'withdrawn'] as const;
const presenceOptions = ['blocked', 'allowed', 'required'] as const;

function inspectedDomain(pageUrl: string): string {
  try {
    return new URL(pageUrl).hostname;
  } catch {
    return '';
  }
}

function statusTone(status: QaScoreStatus): 'neutral' | 'info' | 'success' | 'warning' | 'danger' {
  if (status === 'pass') return 'success';
  if (status === 'warn') return 'warning';
  if (status === 'fail') return 'danger';
  if (status === 'in-progress') return 'info';
  return 'neutral';
}

export function QaPlanTab({
  settings,
  pageUrl,
  platformId,
  qaRun,
}: {
  settings: ExtensionSettings;
  pageUrl: string;
  platformId: string;
  qaRun?: QaPlanRun;
}) {
  const compatiblePlans = useMemo(
    () => settings.qaPlans.filter((plan) => !plan.platformId || plan.platformId === platformId),
    [platformId, settings.qaPlans],
  );
  const [selectedPlanId, setSelectedPlanId] = useState(compatiblePlans[0]?.id ?? '');
  const selectedPlan = compatiblePlans.find((plan) => plan.id === selectedPlanId);
  const [draft, setDraft] = useState<QaPlan | undefined>(selectedPlan);
  const [message, setMessage] = useState('');
  const scorecard = useMemo(() => buildQaScorecard(qaRun), [qaRun]);

  useEffect(() => {
    const saved = compatiblePlans.find((plan) => plan.id === selectedPlanId);
    if (saved) setDraft(saved);
    else if (!selectedPlanId && compatiblePlans[0]) {
      setSelectedPlanId(compatiblePlans[0].id);
      setDraft(compatiblePlans[0]);
    }
  }, [compatiblePlans, selectedPlanId]);

  const createPlan = () => {
    const plan = createQaPlan('New QA plan', inspectedDomain(pageUrl), platformId);
    setSelectedPlanId(plan.id);
    setDraft(plan);
    setMessage('New plan draft created. Save it before starting a run.');
  };

  const savePlan = () => {
    if (!draft) return;
    try {
      const validated = QaPlanSchema.parse({
        ...draft,
        platformId,
        updatedAt: new Date().toISOString(),
      });
      const nextSettings = {
        ...settings,
        qaPlans: [...settings.qaPlans.filter((plan) => plan.id !== validated.id), validated],
      };
      runExtensionOperation(
        () =>
          diagnosticsActions.updateSettings(nextSettings).then(() => {
            setSelectedPlanId(validated.id);
            setDraft(validated);
            setMessage('QA plan saved locally.');
          }),
        (error) => setMessage(error instanceof Error ? error.message : 'Unable to save QA plan.'),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'QA plan validation failed.');
    }
  };

  const deletePlan = () => {
    if (!draft || !settings.qaPlans.some((plan) => plan.id === draft.id)) return;
    if (!window.confirm(`Delete the saved QA plan "${draft.name}"?`)) return;
    const nextSettings = {
      ...settings,
      qaPlans: settings.qaPlans.filter((plan) => plan.id !== draft.id),
    };
    runExtensionOperation(
      () =>
        diagnosticsActions.updateSettings(nextSettings).then(() => {
          const next = nextSettings.qaPlans.find(
            (plan) => !plan.platformId || plan.platformId === platformId,
          );
          setSelectedPlanId(next?.id ?? '');
          setDraft(next);
          setMessage('QA plan deleted. Existing scorecard evidence was not changed.');
        }),
      (error) => setMessage(error instanceof Error ? error.message : 'Unable to delete QA plan.'),
    );
  };

  const updateStep = (stepId: string, updater: (step: QaPlanStep) => QaPlanStep) => {
    if (!draft) return;
    setDraft({
      ...draft,
      steps: draft.steps.map((step) => (step.id === stepId ? updater(step) : step)),
    });
  };

  const moveStep = (index: number, offset: number) => {
    if (!draft) return;
    const target = index + offset;
    if (target < 0 || target >= draft.steps.length) return;
    const steps = [...draft.steps];
    [steps[index], steps[target]] = [steps[target], steps[index]];
    setDraft({ ...draft, steps });
  };

  const startRun = () => {
    const saved = settings.qaPlans.find((plan) => plan.id === draft?.id);
    if (!saved) {
      setMessage('Save this plan before starting a QA run.');
      return;
    }
    if (qaRun && !window.confirm('Replace the current QA run and its in-browser scorecard?'))
      return;
    diagnosticsActions.startQaPlan(saved);
    setMessage('QA run started. Start each step immediately before performing its interaction.');
  };

  const performRunAction = (action: () => void) => {
    try {
      action();
      setMessage('QA run updated.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update the QA run.');
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              Executable QA contracts
            </p>
            <h2 className="mt-1 text-lg font-semibold">Scenario plans and consent checkpoints</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
              Define expected events and payload rules, then capture one named step at a time. The
              resulting pass, warn, or fail scorecard is included in JSON and Markdown exports.
            </p>
          </div>
          <Button onClick={createPlan}>New QA plan</Button>
        </div>
        {message && <p className="mt-3 text-sm text-stone-600">{message}</p>}
      </Card>

      {qaRun && scorecard && (
        <RunScorecard
          run={qaRun}
          scorecard={scorecard}
          onStartStep={(stepId) => performRunAction(() => diagnosticsActions.startQaStep(stepId))}
          onCompleteStep={(stepId) =>
            performRunAction(() => diagnosticsActions.completeQaStep(stepId))
          }
          onCancelStep={(stepId) => performRunAction(() => diagnosticsActions.cancelQaStep(stepId))}
          onClear={() => {
            if (window.confirm('Clear the current in-browser QA run and scorecard?'))
              diagnosticsActions.clearQaRun();
          }}
        />
      )}

      <div className="grid items-start gap-4 xl:grid-cols-[18rem_1fr]">
        <Card>
          <h2 className="font-semibold">Saved plans</h2>
          <div className="mt-3 space-y-2">
            {compatiblePlans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlanId(plan.id)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${plan.id === selectedPlanId ? 'border-oracle bg-[#f7ebe8]' : 'border-stone-200 hover:bg-stone-50'}`}
              >
                <span className="block font-semibold">{plan.name}</span>
                <span className="mt-0.5 block text-xs text-stone-500">
                  {plan.steps.length} step{plan.steps.length === 1 ? '' : 's'}
                  {plan.domain ? ` - ${plan.domain}` : ''}
                </span>
              </button>
            ))}
            {!compatiblePlans.length && (
              <p className="text-sm text-stone-500">No QA plans are saved for this platform yet.</p>
            )}
          </div>
        </Card>

        {draft ? (
          <PlanEditor
            draft={draft}
            setDraft={setDraft}
            updateStep={updateStep}
            moveStep={moveStep}
            onSave={savePlan}
            onDelete={deletePlan}
            onStartRun={startRun}
            isSaved={settings.qaPlans.some((plan) => plan.id === draft.id)}
          />
        ) : (
          <Card>
            <p className="text-sm text-stone-500">
              Create a QA plan to define scenarios and consent checkpoints.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

function PlanEditor({
  draft,
  setDraft,
  updateStep,
  moveStep,
  onSave,
  onDelete,
  onStartRun,
  isSaved,
}: {
  draft: QaPlan;
  setDraft: (plan: QaPlan) => void;
  updateStep: (stepId: string, updater: (step: QaPlanStep) => QaPlanStep) => void;
  moveStep: (index: number, offset: number) => void;
  onSave: () => void;
  onDelete: () => void;
  onStartRun: () => void;
  isSaved: boolean;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Plan name">
            <input
              className={inputClass}
              maxLength={160}
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            />
          </Field>
          <Field label="Domain (optional)">
            <input
              className={inputClass}
              maxLength={253}
              value={draft.domain ?? ''}
              onChange={(event) => setDraft({ ...draft, domain: event.target.value || undefined })}
            />
          </Field>
        </div>
        <Field label="Description">
          <textarea
            className={`${inputClass} mt-3 min-h-20`}
            maxLength={2000}
            value={draft.description ?? ''}
            onChange={(event) =>
              setDraft({ ...draft, description: event.target.value || undefined })
            }
          />
        </Field>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={onSave}>Save plan locally</Button>
          <Button onClick={onStartRun} disabled={!isSaved} className="bg-oracle hover:bg-red-800">
            Start new QA run
          </Button>
          {isSaved && (
            <Button onClick={onDelete} className="bg-red-700 hover:bg-red-800">
              Delete plan
            </Button>
          )}
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Plan steps</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setDraft({ ...draft, steps: [...draft.steps, createScenarioStep()] })}
          >
            Add scenario
          </Button>
          <Button
            onClick={() =>
              setDraft({ ...draft, steps: [...draft.steps, createConsentCheckpointStep()] })
            }
            className="bg-[#514c47] hover:bg-[#312d2a]"
          >
            Add consent checkpoint
          </Button>
        </div>
      </div>

      {draft.steps.map((step, index) => (
        <StepEditor
          key={step.id}
          step={step}
          index={index}
          total={draft.steps.length}
          update={(updater) => updateStep(step.id, updater)}
          move={(offset) => moveStep(index, offset)}
          remove={() =>
            setDraft({ ...draft, steps: draft.steps.filter((item) => item.id !== step.id) })
          }
        />
      ))}
    </div>
  );
}

function StepEditor({
  step,
  index,
  total,
  update,
  move,
  remove,
}: {
  step: QaPlanStep;
  index: number;
  total: number;
  update: (updater: (step: QaPlanStep) => QaPlanStep) => void;
  move: (offset: number) => void;
  remove: () => void;
}) {
  const updateExpected = (
    expectationId: string,
    updater: (expected: QaExpectedEvent) => QaExpectedEvent,
  ) =>
    update((current) => ({
      ...current,
      expectedEvents: current.expectedEvents.map((expected) =>
        expected.id === expectationId ? updater(expected) : expected,
      ),
    }));

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge tone={step.kind === 'consent-checkpoint' ? 'info' : 'neutral'}>
            Step {index + 1}
          </Badge>
          <Badge>{step.kind}</Badge>
        </div>
        <div className="flex gap-2">
          <Button disabled={index === 0} onClick={() => move(-1)} className="px-3 py-1 text-xs">
            Up
          </Button>
          <Button
            disabled={index === total - 1}
            onClick={() => move(1)}
            className="px-3 py-1 text-xs"
          >
            Down
          </Button>
          <Button onClick={remove} className="bg-red-700 px-3 py-1 text-xs hover:bg-red-800">
            Remove
          </Button>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Field label="Step name">
          <input
            className={inputClass}
            value={step.name}
            maxLength={160}
            onChange={(event) => update((current) => ({ ...current, name: event.target.value }))}
          />
        </Field>
        <Field label="Unexpected collection events">
          <select
            className={inputClass}
            value={step.unexpectedEventPolicy}
            onChange={(event) =>
              update((current) => ({
                ...current,
                unexpectedEventPolicy: event.target.value as QaPlanStep['unexpectedEventPolicy'],
              }))
            }
          >
            <option value="ignore">Ignore</option>
            <option value="warn">Warn</option>
            <option value="fail">Fail</option>
          </select>
        </Field>
      </div>
      <Field label="Instructions for the tester">
        <textarea
          className={`${inputClass} mt-3 min-h-16`}
          value={step.instructions ?? ''}
          maxLength={2000}
          onChange={(event) =>
            update((current) => ({
              ...current,
              instructions: event.target.value || undefined,
            }))
          }
        />
      </Field>

      {step.consent && (
        <ConsentEditor
          consent={step.consent}
          updateConsent={(consent) => update((current) => ({ ...current, consent }))}
        />
      )}

      {step.expectedEvents.length > 0 && (
        <div className="mt-5 space-y-4">
          <h3 className="font-semibold">Expected events</h3>
          {step.expectedEvents.map((expected, expectedIndex) => (
            <ExpectedEventEditor
              key={expected.id}
              expected={expected}
              index={expectedIndex}
              update={(updater) => updateExpected(expected.id, updater)}
              remove={() =>
                update((current) => ({
                  ...current,
                  expectedEvents: current.expectedEvents.filter((item) => item.id !== expected.id),
                }))
              }
            />
          ))}
        </div>
      )}
      <Button
        onClick={() =>
          update((current) => ({
            ...current,
            expectedEvents: [...current.expectedEvents, createExpectedEvent()],
          }))
        }
        className="mt-4 bg-[#514c47] hover:bg-[#312d2a]"
      >
        Add expected event
      </Button>
    </Card>
  );
}

function ConsentEditor({
  consent,
  updateConsent,
}: {
  consent: NonNullable<QaPlanStep['consent']>;
  updateConsent: (consent: NonNullable<QaPlanStep['consent']>) => void;
}) {
  const presenceField = (key: 'collection' | 'loader' | 'identifiers', label: string) => (
    <Field label={label}>
      <select
        className={inputClass}
        value={consent[key]}
        onChange={(event) =>
          updateConsent({ ...consent, [key]: event.target.value as QaPresenceExpectation })
        }
      >
        {presenceOptions.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </Field>
  );
  return (
    <div className="mt-5 rounded-xl border border-sky-200 bg-sky-50 p-4">
      <h3 className="font-semibold text-sky-950">Consent expectations</h3>
      <p className="mt-1 text-xs leading-5 text-sky-900">
        These are client-defined QA expectations, not a universal legal determination.
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Checkpoint state">
          <select
            className={inputClass}
            value={consent.state}
            onChange={(event) =>
              updateConsent({
                ...consent,
                state: event.target.value as NonNullable<QaPlanStep['consent']>['state'],
              })
            }
          >
            {consentStates.map((state) => (
              <option key={state}>{state}</option>
            ))}
          </select>
        </Field>
        {presenceField('collection', 'Collection calls')}
        {presenceField('loader', 'Loader presence')}
        {presenceField('identifiers', 'Identifier parameters')}
      </div>
    </div>
  );
}

function ExpectedEventEditor({
  expected,
  index,
  update,
  remove,
}: {
  expected: QaExpectedEvent;
  index: number;
  update: (updater: (expected: QaExpectedEvent) => QaExpectedEvent) => void;
  remove: () => void;
}) {
  const updateParameter = (
    parameterIndex: number,
    updater: (parameter: QaParameterRequirement) => QaParameterRequirement,
  ) =>
    update((current) => ({
      ...current,
      parameters: current.parameters.map((parameter, currentIndex) =>
        currentIndex === parameterIndex ? updater(parameter) : parameter,
      ),
    }));
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-semibold">Expected event {index + 1}</h4>
        <Button onClick={remove} className="bg-red-700 px-3 py-1 text-xs hover:bg-red-800">
          Remove
        </Button>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Expectation name">
          <input
            className={inputClass}
            value={expected.name}
            onChange={(event) => update((current) => ({ ...current, name: event.target.value }))}
          />
        </Field>
        <Field label="wt.ev (optional)">
          <input
            className={inputClass}
            value={expected.matcher.eventName ?? ''}
            placeholder="$ViewProduct"
            onChange={(event) =>
              update((current) => ({
                ...current,
                matcher: { ...current.matcher, eventName: event.target.value || undefined },
              }))
            }
          />
        </Field>
        <Field label="wt.dl (optional)">
          <input
            className={inputClass}
            value={expected.matcher.wtDl ?? ''}
            placeholder="0"
            onChange={(event) =>
              update((current) => ({
                ...current,
                matcher: { ...current.matcher, wtDl: event.target.value || undefined },
              }))
            }
          />
        </Field>
        <Field label="Event kind (optional)">
          <input
            className={inputClass}
            value={expected.matcher.eventKind ?? ''}
            placeholder="page-view"
            onChange={(event) =>
              update((current) => ({
                ...current,
                matcher: { ...current.matcher, eventKind: event.target.value || undefined },
              }))
            }
          />
        </Field>
        <Field label="Source type (optional)">
          <input
            className={inputClass}
            value={expected.matcher.sourceType ?? ''}
            placeholder="cx-tag-network"
            onChange={(event) =>
              update((current) => ({
                ...current,
                matcher: { ...current.matcher, sourceType: event.target.value || undefined },
              }))
            }
          />
        </Field>
        <Field label="Minimum count">
          <input
            type="number"
            min={0}
            className={inputClass}
            value={expected.minCount}
            onChange={(event) =>
              update((current) => ({ ...current, minCount: Number(event.target.value) }))
            }
          />
        </Field>
        <Field label="Maximum count (blank = unlimited)">
          <input
            type="number"
            min={0}
            className={inputClass}
            value={expected.maxCount ?? ''}
            onChange={(event) =>
              update((current) => ({
                ...current,
                maxCount: event.target.value === '' ? undefined : Number(event.target.value),
              }))
            }
          />
        </Field>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3">
          <h5 className="text-sm font-semibold">Parameter requirements</h5>
          <Button
            onClick={() =>
              update((current) => ({
                ...current,
                parameters: [
                  ...current.parameters,
                  { name: '', presence: 'required', allowEmpty: false },
                ],
              }))
            }
            className="px-3 py-1 text-xs"
          >
            Add parameter rule
          </Button>
        </div>
        <div className="mt-2 space-y-2">
          {expected.parameters.map((parameter, parameterIndex) => (
            <div
              key={`${expected.id}:parameter:${parameterIndex}`}
              className="grid gap-2 rounded-lg border border-stone-200 bg-white p-3 md:grid-cols-[1fr_auto_auto_1fr_auto]"
            >
              <input
                aria-label="Parameter name"
                className={inputClass}
                placeholder="wt.pn_sku"
                value={parameter.name}
                onChange={(event) =>
                  updateParameter(parameterIndex, (current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
              <select
                aria-label="Parameter presence"
                className={inputClass}
                value={parameter.presence}
                onChange={(event) =>
                  updateParameter(parameterIndex, (current) => ({
                    ...current,
                    presence: event.target.value as QaParameterRequirement['presence'],
                  }))
                }
              >
                <option value="required">required</option>
                <option value="optional">optional</option>
                <option value="forbidden">forbidden</option>
              </select>
              <label className="flex items-center gap-2 whitespace-nowrap px-2 text-xs">
                <input
                  type="checkbox"
                  checked={parameter.allowEmpty}
                  onChange={(event) =>
                    updateParameter(parameterIndex, (current) => ({
                      ...current,
                      allowEmpty: event.target.checked,
                    }))
                  }
                />
                Allow empty
              </label>
              <input
                aria-label="Value pattern"
                className={inputClass}
                placeholder="Optional regular expression"
                value={parameter.valuePattern ?? ''}
                onChange={(event) =>
                  updateParameter(parameterIndex, (current) => ({
                    ...current,
                    valuePattern: event.target.value || undefined,
                  }))
                }
              />
              <Button
                onClick={() =>
                  update((current) => ({
                    ...current,
                    parameters: current.parameters.filter(
                      (_item, currentIndex) => currentIndex !== parameterIndex,
                    ),
                  }))
                }
                className="bg-red-700 px-3 py-1 text-xs hover:bg-red-800"
              >
                Remove
              </Button>
            </div>
          ))}
          {!expected.parameters.length && (
            <p className="text-xs text-stone-500">No parameter requirements configured.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function RunScorecard({
  run,
  scorecard,
  onStartStep,
  onCompleteStep,
  onCancelStep,
  onClear,
}: {
  run: QaPlanRun;
  scorecard: NonNullable<ReturnType<typeof buildQaScorecard>>;
  onStartStep: (stepId: string) => void;
  onCompleteStep: (stepId: string) => void;
  onCancelStep: (stepId: string) => void;
  onClear: () => void;
}) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            Active scorecard
          </p>
          <h2 className="mt-1 text-lg font-semibold">{run.planName}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone={statusTone(scorecard.status)}>{scorecard.status}</Badge>
            <Badge tone="success">{scorecard.summary.passed} pass</Badge>
            <Badge tone="warning">{scorecard.summary.warnings} warn</Badge>
            <Badge tone="danger">{scorecard.summary.failed} fail</Badge>
            <Badge>{scorecard.summary.notRun} not run</Badge>
          </div>
        </div>
        <Button onClick={onClear} className="bg-red-700 hover:bg-red-800">
          Clear QA run
        </Button>
      </div>
      <div className="mt-4">
        <Notice>
          Start a step immediately before the approved interaction or consent action. Complete it
          after collection traffic settles. Starting a new step is disabled while another is active.
        </Notice>
      </div>
      <div className="mt-4 space-y-3">
        {run.steps.map((stepRun, index) => {
          const active = run.activeStepId === stepRun.step.id;
          return (
            <div key={stepRun.step.id} className="rounded-xl border border-stone-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">
                      {index + 1}. {stepRun.step.name}
                    </span>
                    <Badge tone={statusTone(stepRun.status)}>{stepRun.status}</Badge>
                    {stepRun.step.kind === 'consent-checkpoint' && (
                      <Badge tone="info">consent</Badge>
                    )}
                  </div>
                  {stepRun.step.instructions && (
                    <p className="mt-1 text-xs leading-5 text-stone-500">
                      {stepRun.step.instructions}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {active ? (
                    <>
                      <Button onClick={() => onCompleteStep(stepRun.step.id)}>Complete step</Button>
                      <Button
                        onClick={() => onCancelStep(stepRun.step.id)}
                        className="bg-[#514c47] hover:bg-[#312d2a]"
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      disabled={Boolean(run.activeStepId)}
                      onClick={() => onStartStep(stepRun.step.id)}
                    >
                      {stepRun.status === 'not-run' ? 'Start capture' : 'Run again'}
                    </Button>
                  )}
                </div>
              </div>
              {active && (
                <p className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-900">
                  Capturing this step now. Perform the interaction, wait for traffic, then complete
                  the step.
                </p>
              )}
              {stepRun.consentSnapshot && (
                <dl className="mt-3 grid gap-2 text-xs md:grid-cols-4">
                  <Metric label="Consent state" value={stepRun.consentSnapshot.state} />
                  <Metric
                    label="Collection events"
                    value={String(stepRun.consentSnapshot.collectionEventCount)}
                  />
                  <Metric
                    label="Loader"
                    value={stepRun.consentSnapshot.loaderDetected ? 'detected' : 'not detected'}
                  />
                  <Metric
                    label="Identifiers"
                    value={stepRun.consentSnapshot.identifierParameterNames.join(', ') || 'none'}
                  />
                </dl>
              )}
              {stepRun.findings.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs">
                  {stepRun.findings.map((finding, findingIndex) => (
                    <li key={`${finding.code}:${findingIndex}`}>
                      <span
                        className={
                          finding.outcome === 'fail'
                            ? 'font-semibold text-red-700'
                            : 'font-semibold text-amber-800'
                        }
                      >
                        {finding.outcome.toUpperCase()}:
                      </span>{' '}
                      {finding.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </Card>
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-stone-50 p-3">
      <dt className="text-stone-500">{label}</dt>
      <dd className="mt-1 break-all font-semibold">{value}</dd>
    </div>
  );
}
