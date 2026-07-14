import { z } from 'zod';

export const ParseStatusSchema = z.enum(['success', 'partial', 'failed']);
export type ParseStatus = z.infer<typeof ParseStatusSchema>;

export type ParserResult<T> =
  | { status: 'success'; data: T; warnings: string[] }
  | { status: 'partial'; data: T; warnings: string[]; reason: string }
  | { status: 'failed'; warnings: string[]; reason: string };

export const ConfidenceSchema = z.enum(['direct', 'inferred', 'low']);
export type Confidence = z.infer<typeof ConfidenceSchema>;

export const ScriptLoadModeSchema = z.enum([
  'synchronous',
  'asynchronous',
  'deferred',
  'dynamically-inserted',
  'tag-manager-injected',
  'unknown',
]);
export type ScriptLoadMode = z.infer<typeof ScriptLoadModeSchema>;

export const ScriptDomLocationSchema = z.object({
  path: z.string(),
  parentElement: z.string(),
  scriptIndex: z.number().int().nonnegative(),
  inHead: z.boolean(),
});
export type ScriptDomLocation = z.infer<typeof ScriptDomLocationSchema>;

export const ScriptLoadEvidenceSchema = z.object({
  kind: z.enum([
    'async-attribute',
    'defer-attribute',
    'head-position',
    'parser-inserted',
    'mutation-observed',
    'inline-loader',
    'tag-manager-container',
    'conflict',
  ]),
  description: z.string(),
  direct: z.boolean(),
});
export type ScriptLoadEvidence = z.infer<typeof ScriptLoadEvidenceSchema>;

export const OracleCxTagConfigSchema = z.object({
  accountGuid: z.string().optional(),
  tagId: z.string().optional(),
  config: z.string().optional(),
  environmentGuess: z.enum(['test', 'production', 'unknown']),
});
export type OracleCxTagConfig = z.infer<typeof OracleCxTagConfigSchema>;

export const OracleCxTagLoaderSchema = z.object({
  id: z.string(),
  sourceUrl: z.string().optional(),
  config: OracleCxTagConfigSchema,
  location: ScriptDomLocationSchema,
  async: z.boolean(),
  defer: z.boolean(),
  dynamicallyInserted: z.boolean(),
  inlineLoaderEvidence: z.boolean(),
  parserInsertedInference: z.boolean(),
  loadMode: ScriptLoadModeSchema,
  confidence: ConfidenceSchema,
  evidence: z.array(ScriptLoadEvidenceSchema),
  detectedAt: z.string(),
});
export type OracleCxTagLoader = z.infer<typeof OracleCxTagLoaderSchema>;

export const TagManagerTypeSchema = z.enum(['google-tag-manager', 'tealium-iq', 'adobe-tags']);
export type TagManagerType = z.infer<typeof TagManagerTypeSchema>;

export const TagManagerObservationSchema = z.object({
  id: z.string(),
  type: TagManagerTypeSchema,
  label: z.string(),
  containerId: z.string().optional(),
  environment: z.string().optional(),
  sourceUrl: z.string().optional(),
  location: ScriptDomLocationSchema,
  confidence: ConfidenceSchema,
  evidence: z.string(),
  detectedAt: z.string(),
});
export type TagManagerObservation = z.infer<typeof TagManagerObservationSchema>;

export const InfinitySourceTypeSchema = z.enum([
  'cx-tag-loader',
  'infinity-library',
  'cx-tag-network',
  'dcapi-browser-visible',
  'unknown-infinity-network',
]);
export type InfinitySourceType = z.infer<typeof InfinitySourceTypeSchema>;

export const InfinityEventKindSchema = z.enum([
  'loader',
  'library',
  'page-view',
  'click-event',
  'event-code-specific',
  'dcapi-batch',
  'unknown',
]);
export type InfinityEventKind = z.infer<typeof InfinityEventKindSchema>;

export const ParameterClassificationSchema = z.enum(['standard', 'custom', 'unknown']);
export type ParameterClassification = z.infer<typeof ParameterClassificationSchema>;

export const ParameterSensitivitySchema = z.enum([
  'none',
  'identifier',
  'email',
  'phone',
  'payment-card',
  'token-or-secret',
]);
export type ParameterSensitivity = z.infer<typeof ParameterSensitivitySchema>;

export const OracleParameterCatalogEntrySchema = z.object({
  name: z.string(),
  displayName: z.string(),
  description: z.string(),
  sensitivity: ParameterSensitivitySchema,
  reportingNameNote: z.string().optional(),
  sourceUrl: z.string().url(),
});
export type OracleParameterCatalogEntry = z.infer<typeof OracleParameterCatalogEntrySchema>;

export const ObservedParameterSchema = z.object({
  id: z.string(),
  name: z.string(),
  value: z.string().nullable(),
  sourceType: InfinitySourceTypeSchema,
  eventTimestamp: z.string(),
  eventId: z.string(),
  eventUrl: z.string().optional(),
  origin: z.enum(['query-string', 'dcapi-static', 'dcapi-event', 'inferred-dom-page']),
  classification: ParameterClassificationSchema,
  sensitivity: ParameterSensitivitySchema,
  catalogDisplayName: z.string().optional(),
  catalogDescription: z.string().optional(),
  catalogSourceUrl: z.string().url().optional(),
  reportingNameNote: z.string().optional(),
  namingPattern: z.string().optional(),
});
export type ObservedParameter = z.infer<typeof ObservedParameterSchema>;

export const OracleNetworkObservationSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  requestUrl: z.string(),
  requestMethod: z.string(),
  statusCode: z.number().int(),
  sourceType: InfinitySourceTypeSchema,
  accountGuid: z.string().optional(),
  libraryName: z.string().optional(),
  libraryType: z.enum(['javascript', 'stylesheet', 'other']).optional(),
  eventKind: InfinityEventKindSchema,
  wtDl: z.string().optional(),
  parameterCount: z.number().int().nonnegative(),
  requestBodyParseStatus: ParseStatusSchema,
  responseStatus: z.string(),
  warnings: z.array(z.string()),
  parameters: z.array(ObservedParameterSchema),
});
export type OracleNetworkObservation = z.infer<typeof OracleNetworkObservationSchema>;

export const ParsedDcsGifEventSchema = z.object({
  eventKind: InfinityEventKindSchema,
  wtDl: z.string().optional(),
  parameters: z.record(z.string(), z.array(z.string())),
});
export type ParsedDcsGifEvent = z.infer<typeof ParsedDcsGifEventSchema>;

export const ParsedDcApiEventSchema = z.object({
  index: z.number().int().nonnegative(),
  parameters: z.record(z.string(), z.string().nullable()),
  origins: z.record(z.string(), z.enum(['dcapi-static', 'dcapi-event'])),
});
export type ParsedDcApiEvent = z.infer<typeof ParsedDcApiEventSchema>;

export const ParsedDcApiRequestSchema = z.object({
  staticParameters: z.record(z.string(), z.string().nullable()),
  events: z.array(ParsedDcApiEventSchema),
});
export type ParsedDcApiRequest = z.infer<typeof ParsedDcApiRequestSchema>;

export const DiagnosticSeveritySchema = z.enum(['info', 'low', 'medium', 'high']);
export type DiagnosticSeverity = z.infer<typeof DiagnosticSeveritySchema>;

export const DiagnosticWarningSchema = z.object({
  id: z.string(),
  code: z.string(),
  severity: DiagnosticSeveritySchema,
  title: z.string(),
  message: z.string(),
  recommendation: z.string(),
  evidenceIds: z.array(z.string()),
  sourceUrl: z.string().url().optional(),
});
export type DiagnosticWarning = z.infer<typeof DiagnosticWarningSchema>;

export const TimelineEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  type: z.enum(['dom-loader', 'network', 'route-change', 'warning']),
  title: z.string(),
  detail: z.string(),
  severity: DiagnosticSeveritySchema.optional(),
});
export type TimelineEntry = z.infer<typeof TimelineEntrySchema>;

export const DiagnosticSummarySchema = z.object({
  tagStatus: z.enum(['detected', 'not-detected', 'inconclusive']),
  loaderCount: z.number().int().nonnegative(),
  libraryCount: z.number().int().nonnegative(),
  libraryIssueCount: z.number().int().nonnegative(),
  tagManagerCount: z.number().int().nonnegative(),
  collectionEventCount: z.number().int().nonnegative(),
  cxTagEventCount: z.number().int().nonnegative(),
  dcApiEventCount: z.number().int().nonnegative(),
  standardParameterCount: z.number().int().nonnegative(),
  customParameterCount: z.number().int().nonnegative(),
  unknownParameterCount: z.number().int().nonnegative(),
  warningCount: z.number().int().nonnegative(),
  confidence: ConfidenceSchema,
  reloadRecommended: z.boolean(),
});
export type DiagnosticSummary = z.infer<typeof DiagnosticSummarySchema>;

export const DiagnosticSessionSchema = z.object({
  id: z.string(),
  tabId: z.number().int(),
  pageUrl: z.string(),
  startedAt: z.string(),
  scanTimestamp: z.string(),
  devtoolsOpenedAt: z.string(),
  loaders: z.array(OracleCxTagLoaderSchema),
  tagManagers: z.array(TagManagerObservationSchema),
  networkObservations: z.array(OracleNetworkObservationSchema),
  parameters: z.array(ObservedParameterSchema),
  warnings: z.array(DiagnosticWarningSchema),
  timeline: z.array(TimelineEntrySchema),
  captureMayBeIncomplete: z.boolean(),
  oraGlobalDetected: z.boolean().optional(),
});
export type DiagnosticSession = z.infer<typeof DiagnosticSessionSchema>;

export const ExpectedDomainProfileSchema = z.object({
  domain: z.string(),
  environment: z.enum(['test', 'production', 'unknown']),
  accountGuids: z.array(z.string()),
  tagId: z.string().optional(),
  config: z.string().optional(),
  loadMode: ScriptLoadModeSchema.optional(),
});
export type ExpectedDomainProfile = z.infer<typeof ExpectedDomainProfileSchema>;

export const ExtensionSettingsSchema = z.object({
  enableDomMutationMonitoring: z.boolean(),
  enablePageContextDetection: z.boolean(),
  enableReloadRecommendationBanner: z.boolean(),
  expectedProfiles: z.array(ExpectedDomainProfileSchema),
  importedCatalog: z.array(OracleParameterCatalogEntrySchema),
});
export type ExtensionSettings = z.infer<typeof ExtensionSettingsSchema>;

export const ExportedQaEventSchema = z.object({
  id: z.string(),
  sequence: z.number().int().positive(),
  timestamp: z.string(),
  eventKind: InfinityEventKindSchema,
  sourceType: InfinitySourceTypeSchema,
  request: z.object({
    url: z.string(),
    method: z.string(),
    statusCode: z.number().int(),
    responseStatus: z.string(),
    accountGuid: z.string().optional(),
  }),
  wtDl: z.string().optional(),
  parseStatus: ParseStatusSchema,
  payload: z.object({
    parameterCount: z.number().int().nonnegative(),
    outOfTheBox: z.array(ObservedParameterSchema),
    custom: z.array(ObservedParameterSchema),
    needsReview: z.array(ObservedParameterSchema),
    emptyValues: z.array(
      z.object({
        parameterId: z.string(),
        name: z.string(),
        valueKind: z.enum(['empty-string', 'null']),
      }),
    ),
  }),
  warnings: z.array(z.string()),
  qaFindings: z.array(DiagnosticWarningSchema),
});
export type ExportedQaEvent = z.infer<typeof ExportedQaEventSchema>;

export const InfinityLibrarySummarySchema = z.object({
  name: z.string(),
  url: z.string(),
  resourceType: z.enum(['javascript', 'stylesheet', 'other']),
  state: z.enum(['loaded', 'cached', 'failed', 'observed']),
  requestCount: z.number().int().positive(),
  statusCodes: z.array(z.number().int()),
  firstObservedAt: z.string(),
  lastObservedAt: z.string(),
  issues: z.array(z.string()),
});
export type InfinityLibrarySummary = z.infer<typeof InfinityLibrarySummarySchema>;

export const ExportedDiagnosticReportSchema = z.object({
  reportType: z.literal('oracle-infinity-qa-report'),
  generatedAt: z.string(),
  extensionVersion: z.string(),
  catalogVersion: z.string(),
  page: z.object({
    url: z.string(),
    captureStartedAt: z.string(),
    lastScanAt: z.string(),
    captureMayBeIncomplete: z.boolean(),
  }),
  summary: DiagnosticSummarySchema,
  loaders: z.array(OracleCxTagLoaderSchema),
  tagManagers: z.array(TagManagerObservationSchema),
  libraries: z.array(InfinityLibrarySummarySchema),
  events: z.array(ExportedQaEventSchema),
  warnings: z.array(DiagnosticWarningSchema),
  notes: z.array(z.string()),
});
export type ExportedDiagnosticReport = z.infer<typeof ExportedDiagnosticReportSchema>;

export const DEFAULT_SETTINGS: ExtensionSettings = {
  enableDomMutationMonitoring: true,
  enablePageContextDetection: false,
  enableReloadRecommendationBanner: true,
  expectedProfiles: [],
  importedCatalog: [],
};
