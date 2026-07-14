import type { DiagnosticSession, ExportedQaEvent, ObservedParameter } from '../models';
import { createExportReport } from './exportJson';

function text(value: string | number | null | undefined): string {
  if (value === undefined || value === '') return 'Unavailable';
  if (value === null) return '**null**';
  return String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

function eventName(event: ExportedQaEvent): string {
  return event.eventKind
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function parameterSection(title: string, parameters: ObservedParameter[]): string[] {
  if (!parameters.length) return [`#### ${title} (0)`, '', '_None observed._', ''];
  return [
    `#### ${title} (${parameters.length})`,
    '',
    '| Parameter | Observed value | Origin | Oracle definition / naming |',
    '| --- | --- | --- | --- |',
    ...parameters.map(
      (parameter) =>
        `| ${text(parameter.name)} | ${parameter.value === '' ? '**empty string**' : text(parameter.value)} | ${text(parameter.origin)} | ${parameterDefinition(parameter)} |`,
    ),
    '',
  ];
}

function parameterDefinition(parameter: ObservedParameter): string {
  const label = parameter.catalogDisplayName
    ? `${parameter.catalogDisplayName}: ${parameter.catalogDescription ?? ''}`
    : (parameter.catalogDescription ?? parameter.namingPattern ?? 'Unavailable');
  const source = parameter.catalogSourceUrl
    ? ` ([Oracle documentation](${parameter.catalogSourceUrl}))`
    : '';
  return `${text(label)}${source}`;
}

function eventSection(event: ExportedQaEvent): string[] {
  return [
    `## Event ${event.sequence} — ${eventName(event)}`,
    '',
    `- Timestamp: ${event.timestamp}`,
    `- Source: ${event.sourceType}`,
    `- Request: ${event.request.method} ${event.request.url}`,
    `- Response: ${event.request.responseStatus}`,
    `- Account GUID: ${event.request.accountGuid ?? 'Unavailable'}`,
    `- wt.dl: ${event.wtDl ?? 'Unavailable'}`,
    `- Payload parse: ${event.parseStatus}`,
    `- Parameters: ${event.payload.parameterCount}`,
    '',
    '### Complete payload',
    '',
    ...parameterSection('Out-of-the-box parameters', event.payload.outOfTheBox),
    ...parameterSection('Custom parameters', event.payload.custom),
    ...parameterSection('Needs review', event.payload.needsReview),
    '### Payload QA findings',
    '',
    ...(event.payload.emptyValues.length
      ? event.payload.emptyValues.map(
          (issue) =>
            `- **Potential issue:** ${issue.name} was collected with ${issue.valueKind === 'null' ? 'a null value' : 'an empty string'}.`,
        )
      : ['- No empty-string or null parameter values observed.']),
    '',
    '### Event warnings',
    '',
    ...(event.warnings.length ? event.warnings.map((warning) => `- ${warning}`) : ['- None.']),
    '',
    '### QA findings',
    '',
    ...(event.qaFindings.length
      ? event.qaFindings.map(
          (finding) =>
            `- **${finding.severity.toUpperCase()} — ${finding.title}:** ${finding.message} Recommendation: ${finding.recommendation}${finding.sourceUrl ? ` ([Oracle guidance](${finding.sourceUrl}))` : ''}`,
        )
      : ['- None.']),
    '',
  ];
}

export function exportReportMarkdown(session: DiagnosticSession, version?: string): string {
  const report = createExportReport(session, version);
  const { summary } = report;
  return [
    '# Oracle Infinity QA Report',
    '',
    `Generated: ${report.generatedAt}`,
    `Page: ${report.page.url}`,
    `Capture started: ${report.page.captureStartedAt}`,
    `Extension: ${report.extensionVersion}`,
    `Catalog: ${report.catalogVersion}`,
    '',
    '## QA summary',
    '',
    `- CX Tag status: ${summary.tagStatus}`,
    `- Loaders observed: ${summary.loaderCount}`,
    `- Infinity libraries observed: ${summary.libraryCount} (${summary.libraryIssueCount} with load issues)`,
    `- Tag managers observed: ${summary.tagManagerCount}`,
    `- Complete collection events documented: ${report.events.length}`,
    `- CX Tag events: ${summary.cxTagEventCount}`,
    `- Browser-visible DC API events: ${summary.dcApiEventCount}`,
    `- Out-of-the-box/custom/needs-review parameter observations: ${summary.standardParameterCount}/${summary.customParameterCount}/${summary.unknownParameterCount}`,
    `- Diagnostic warnings: ${summary.warningCount}`,
    `- Capture may be incomplete: ${report.page.captureMayBeIncomplete ? 'yes' : 'no'}`,
    '',
    '## Implementation evidence',
    '',
    '### Tag managers',
    '',
    ...(report.tagManagers.length
      ? report.tagManagers.map(
          (manager) =>
            `- **${manager.label}**${manager.containerId ? ` — ${manager.containerId}` : ''}${manager.environment ? ` (${manager.environment})` : ''}: ${manager.evidence} Confidence: ${manager.confidence}.`,
        )
      : ['- No standard tag-manager snippet observed.']),
    '',
    '_Tag-manager presence is an implementation clue, not proof that it deployed Infinity._',
    '',
    '### Infinity libraries',
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
      : ['- No Infinity static libraries observed.']),
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
    ...report.events.flatMap(eventSection),
    '## Session diagnostics',
    '',
    ...(report.warnings.length
      ? report.warnings.map(
          (warning) =>
            `- **${warning.severity.toUpperCase()} — ${warning.title}:** ${warning.message} Recommendation: ${warning.recommendation}${warning.sourceUrl ? ` ([Oracle guidance](${warning.sourceUrl}))` : ''}`,
        )
      : ['- No diagnostic warnings generated.']),
    '',
    '## Scope notes',
    '',
    ...report.notes.map((note) => `- ${note}`),
  ].join('\n');
}
