import type {
  DiagnosticSession,
  ExportedQaEvent,
  ObservedParameter,
  QaPlanRun,
  QaScorecard,
} from '../models';
import type { PlatformAdapter } from '../platform/platformAdapter';
import { platformAdapterForSession } from '../platform/platformRegistry';
import { createExportReport } from './exportJson';

function text(value: string | number | null | undefined): string {
  if (value === undefined || value === '') return 'Unavailable';
  if (value === null) return '**null**';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\\/g, '\\\\')
    .replace(/([`*_[\]|])/g, '\\$1')
    .replace(/\r?\n/g, '<br>');
}

function eventName(event: ExportedQaEvent): string {
  return event.eventKind
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function parameterSection(
  title: string,
  parameters: ObservedParameter[],
  adapter: PlatformAdapter,
): string[] {
  if (!parameters.length) return [`#### ${title} (0)`, '', '_None observed._', ''];
  return [
    `#### ${title} (${parameters.length})`,
    '',
    `| Parameter | Observed value | Origin | ${adapter.identity.productName} definition / naming |`,
    '| --- | --- | --- | --- |',
    ...parameters.map(
      (parameter) =>
        `| ${text(parameter.name)} | ${parameter.value === '' ? '**empty string**' : text(parameter.value)} | ${text(parameter.origin)} | ${parameterDefinition(parameter, adapter)} |`,
    ),
    '',
  ];
}

function parameterDefinition(parameter: ObservedParameter, adapter: PlatformAdapter): string {
  const label = parameter.catalogDisplayName
    ? `${parameter.catalogDisplayName}: ${parameter.catalogDescription ?? ''}`
    : (parameter.catalogDescription ?? parameter.namingPattern ?? 'Unavailable');
  const source = parameter.catalogSourceUrl
    ? ` ([${adapter.identity.documentationLabel}](${parameter.catalogSourceUrl}))`
    : '';
  return `${text(label)}${source}`;
}

function eventSection(event: ExportedQaEvent, adapter: PlatformAdapter): string[] {
  return [
    `## Event ${event.sequence} — ${eventName(event)}`,
    '',
    `- Timestamp: ${text(event.timestamp)}`,
    `- Source: ${text(event.sourceType)}`,
    `- Request: ${text(event.request.method)} ${text(event.request.url)}`,
    `- Response: ${text(event.request.responseStatus)}`,
    ...adapter
      .exportEventDetails(event)
      .map((detail) => `- ${detail.label}: ${text(detail.value)}`),
    `- Payload parse: ${event.parseStatus}`,
    `- Parameters: ${event.payload.parameterCount}`,
    '',
    '### Complete payload',
    '',
    ...parameterSection('Out-of-the-box parameters', event.payload.outOfTheBox, adapter),
    ...parameterSection('Custom parameters', event.payload.custom, adapter),
    ...parameterSection('Needs review', event.payload.needsReview, adapter),
    '### Payload QA findings',
    '',
    ...(event.payload.emptyValues.length
      ? event.payload.emptyValues.map(
          (issue) =>
            `- **Potential issue:** ${text(issue.name)} was collected with ${issue.valueKind === 'null' ? 'a null value' : 'an empty string'}.`,
        )
      : ['- No empty-string or null parameter values observed.']),
    '',
    '### Event warnings',
    '',
    ...(event.warnings.length
      ? event.warnings.map((warning) => `- ${text(warning)}`)
      : ['- None.']),
    '',
    '### QA findings',
    '',
    ...(event.qaFindings.length
      ? event.qaFindings.map(
          (finding) =>
            `- **${finding.severity.toUpperCase()} — ${text(finding.title)}:** ${text(finding.message)} Recommendation: ${text(finding.recommendation)}${finding.sourceUrl ? ` ([${adapter.identity.documentationLabel}](${finding.sourceUrl}))` : ''}`,
        )
      : ['- None.']),
    '',
  ];
}

function scorecardSection(scorecard?: QaScorecard): string[] {
  if (!scorecard) return [];
  return [
    '## QA contract scorecard',
    '',
    `- Plan: ${text(scorecard.planName)}`,
    `- Overall result: **${scorecard.status.toUpperCase()}**`,
    `- Steps: ${scorecard.summary.total} total / ${scorecard.summary.passed} pass / ${scorecard.summary.warnings} warn / ${scorecard.summary.failed} fail / ${scorecard.summary.notRun} not run`,
    '',
    '| Step | Type | Result | Events | Findings |',
    '| --- | --- | --- | ---: | ---: |',
    ...scorecard.steps.map(
      (step) =>
        `| ${text(step.name)} | ${text(step.kind)} | **${step.status.toUpperCase()}** | ${step.observedEventIds.length} | ${step.findings.length} |`,
    ),
    '',
    ...scorecard.steps.flatMap((step, index) => [
      `### Step ${index + 1}: ${text(step.name)} - ${step.status.toUpperCase()}`,
      '',
      ...(step.consentSnapshot
        ? [
            `- Consent state: ${text(step.consentSnapshot.state)}`,
            `- Collection events: ${step.consentSnapshot.collectionEventCount}`,
            `- Loader detected: ${step.consentSnapshot.loaderDetected ? 'yes' : 'no'}`,
            `- Identifier parameters: ${step.consentSnapshot.identifierParameterNames.length ? step.consentSnapshot.identifierParameterNames.map(text).join(', ') : 'none'}`,
          ]
        : []),
      ...(step.expectationResults.length
        ? step.expectationResults.map(
            (result) =>
              `- ${text(result.expectationName)}: **${result.status.toUpperCase()}** (${result.matchedEventIds.length} matching event${result.matchedEventIds.length === 1 ? '' : 's'})`,
          )
        : []),
      ...(step.findings.length
        ? step.findings.map(
            (finding) => `- **${finding.outcome.toUpperCase()}:** ${text(finding.message)}`,
          )
        : ['- No scorecard findings.']),
      '',
    ]),
  ];
}

export function exportReportMarkdown(
  session: DiagnosticSession,
  version?: string,
  qaRun?: QaPlanRun,
): string {
  const adapter = platformAdapterForSession(session);
  const { identity } = adapter;
  const report = createExportReport(session, version, qaRun);
  const { summary } = report;
  return [
    `# ${identity.productName} QA Report`,
    '',
    `Generated: ${report.generatedAt}`,
    `Page: ${text(report.page.url)}`,
    `Capture started: ${report.page.captureStartedAt}`,
    `Extension: ${report.extensionVersion}`,
    `Catalog: ${report.catalogVersion}`,
    `Platform adapter: ${report.platform.id} (${report.platform.generation})`,
    '',
    '## QA summary',
    '',
    ...adapter
      .summaryDetails(summary, report.events.length)
      .map((detail) => `- ${detail.label}: ${text(detail.value)}`),
    `- Capture may be incomplete: ${report.page.captureMayBeIncomplete ? 'yes' : 'no'}`,
    '',
    ...scorecardSection(report.qaScorecard),
    '## Implementation evidence',
    '',
    '### Tag managers',
    '',
    ...(report.tagManagers.length
      ? report.tagManagers.map(
          (manager) =>
            `- **${text(manager.label)}**${manager.containerId ? ` — ${text(manager.containerId)}` : ''}${manager.environment ? ` (${text(manager.environment)})` : ''}: ${text(manager.evidence)} Confidence: ${text(manager.confidence)}.`,
        )
      : ['- No standard tag-manager snippet observed.']),
    '',
    `_Tag-manager presence is an implementation clue, not proof that it deployed ${identity.shortName}._`,
    '',
    `### ${identity.libraryLabelPlural}`,
    '',
    ...(report.libraries.length
      ? [
          '| Library | Type | State | HTTP | Requests |',
          '| --- | --- | --- | --- | ---: |',
          ...report.libraries.map(
            (library) =>
              `| ${text(library.name)} | ${library.resourceType} | ${library.state === 'cached' ? 'cached / not modified' : library.state} | ${library.statusCodes.join(', ') || 'Unavailable'} | ${library.requestCount} |`,
          ),
        ]
      : [`- No ${identity.libraryLabelPlural.toLowerCase()} observed.`]),
    '',
    `### ${identity.supportTrafficLabel}`,
    '',
    ...(report.supportTraffic.length
      ? [
          '| Endpoint | Method | State | HTTP | Requests |',
          '| --- | --- | --- | --- | ---: |',
          ...report.supportTraffic.map(
            (entry) =>
              `| ${text(entry.url)} | ${text(entry.methods.join(', '))} | ${entry.state} | ${entry.statusCodes.join(', ') || 'Unavailable'} | ${entry.requestCount} |`,
          ),
        ]
      : [`- No unverified ${identity.supportTrafficLabel.toLowerCase()} observed.`]),
    '',
    '## Event index',
    '',
    ...(report.events.length
      ? [
          '| # | Timestamp | Event | Source | Response | Parameters | Findings |',
          '| ---: | --- | --- | --- | --- | ---: | ---: |',
          ...report.events.map(
            (event) =>
              `| ${event.sequence} | ${event.timestamp} | ${eventName(event)} | ${event.sourceType} | ${text(event.request.responseStatus)} | ${event.payload.parameterCount} | ${event.warnings.length + event.qaFindings.length} |`,
          ),
        ]
      : ['_No collection events were observed._']),
    '',
    ...report.events.flatMap((event) => eventSection(event, adapter)),
    '## Session diagnostics',
    '',
    ...(report.warnings.length
      ? report.warnings.map(
          (warning) =>
            `- **${warning.severity.toUpperCase()} — ${text(warning.title)}:** ${text(warning.message)} Recommendation: ${text(warning.recommendation)}${warning.sourceUrl ? ` ([${identity.documentationLabel}](${warning.sourceUrl}))` : ''}`,
        )
      : ['- No diagnostic warnings generated.']),
    '',
    '## Scope notes',
    '',
    ...report.notes.map((note) => `- ${text(note)}`),
  ].join('\n');
}
