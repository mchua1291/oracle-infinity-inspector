import { z } from 'zod';
import { ExportedDiscoverySchema } from './discovery/discoveryModels';

export const ParseStatusSchema = z.enum(['success', 'partial', 'failed']);

export type ParserResult<T> =
  | { status: 'success'; data: T; warnings: string[] }
  | { status: 'partial'; data: T; warnings: string[]; reason: string }
  | { status: 'failed'; warnings: string[]; reason: string };

export const ConfidenceSchema = z.enum(['direct', 'inferred', 'low']);
export type Confidence = z.infer<typeof ConfidenceSchema>;

export const PlatformIdSchema = z.string().min(1).max(80);
export type PlatformId = z.infer<typeof PlatformIdSchema>;

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

export const PlatformLoaderConfigSchema = z.object({
  accountGuid: z.string().optional(),
  tagId: z.string().optional(),
  config: z.string().optional(),
  environmentGuess: z.enum(['test', 'production', 'unknown']),
  platformConfig: z.record(z.string(), z.string()).optional(),
});
export type PlatformLoaderConfig = z.infer<typeof PlatformLoaderConfigSchema>;
export type OracleCxTagConfig = PlatformLoaderConfig;

export const PlatformLoaderObservationSchema = z.object({
  id: z.string(),
  platformId: PlatformIdSchema.optional(),
  sourceUrl: z.string().optional(),
  config: PlatformLoaderConfigSchema,
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
export type PlatformLoaderObservation = z.infer<typeof PlatformLoaderObservationSchema>;
export type OracleCxTagLoader = PlatformLoaderObservation;

export const TagManagerTypeSchema = z.enum(['google-tag-manager', 'tealium-iq', 'adobe-tags']);

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

export const PlatformSourceTypeSchema = z.string().min(1).max(100);
export type PlatformSourceType = z.infer<typeof PlatformSourceTypeSchema>;

export const InfinityEventKindSchema = z.enum([
  'loader',
  'library',
  'page-view',
  'click-event',
  'event-code-specific',
  'dcapi-batch',
  'unknown',
]);

export const PlatformEventKindSchema = z.string().min(1).max(100);
export type PlatformEventKind = z.infer<typeof PlatformEventKindSchema>;

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

const HttpsDocumentationUrlSchema = z
  .string()
  .url()
  .max(2048)
  .refine((value) => new URL(value).protocol === 'https:', {
    message: 'Documentation links must use HTTPS.',
  });

export const OracleParameterCatalogEntrySchema = z.object({
  name: z.string().min(1).max(120),
  displayName: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  sensitivity: ParameterSensitivitySchema,
  reportingNameNote: z.string().max(1000).optional(),
  sourceUrl: HttpsDocumentationUrlSchema,
});
export type OracleParameterCatalogEntry = z.infer<typeof OracleParameterCatalogEntrySchema>;
export const ParameterCatalogEntrySchema = OracleParameterCatalogEntrySchema;
export type ParameterCatalogEntry = OracleParameterCatalogEntry;

export const ObservedParameterSchema = z.object({
  id: z.string(),
  name: z.string(),
  value: z.string().nullable(),
  sourceType: PlatformSourceTypeSchema,
  eventTimestamp: z.string(),
  eventId: z.string(),
  eventUrl: z.string().optional(),
  origin: z.string().min(1).max(100),
  classification: ParameterClassificationSchema,
  sensitivity: ParameterSensitivitySchema,
  catalogDisplayName: z.string().optional(),
  catalogDescription: z.string().optional(),
  catalogSourceUrl: z.string().url().optional(),
  reportingNameNote: z.string().optional(),
  namingPattern: z.string().optional(),
});
export type ObservedParameter = z.infer<typeof ObservedParameterSchema>;

export const PlatformNetworkObservationSchema = z.object({
  id: z.string(),
  platformId: PlatformIdSchema.optional(),
  timestamp: z.string(),
  requestUrl: z.string(),
  requestMethod: z.string(),
  statusCode: z.number().int(),
  sourceType: PlatformSourceTypeSchema,
  accountGuid: z.string().optional(),
  libraryName: z.string().optional(),
  libraryType: z.enum(['javascript', 'stylesheet', 'other']).optional(),
  eventKind: PlatformEventKindSchema,
  wtDl: z.string().optional(),
  parameterCount: z.number().int().nonnegative(),
  requestBodyParseStatus: ParseStatusSchema,
  responseStatus: z.string(),
  warnings: z.array(z.string()),
  parameters: z.array(ObservedParameterSchema),
  platformData: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional(),
});
export type PlatformNetworkObservation = z.infer<typeof PlatformNetworkObservationSchema>;
export type OracleNetworkObservation = PlatformNetworkObservation;

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
  supportTrafficCount: z.number().int().nonnegative(),
  sourceBreakdown: z.record(z.string(), z.number().int().nonnegative()).optional(),
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
  platformId: PlatformIdSchema.optional(),
  tabId: z.number().int(),
  pageUrl: z.string(),
  startedAt: z.string(),
  scanTimestamp: z.string(),
  devtoolsOpenedAt: z.string(),
  loaders: z.array(PlatformLoaderObservationSchema),
  tagManagers: z.array(TagManagerObservationSchema),
  networkObservations: z.array(PlatformNetworkObservationSchema),
  parameters: z.array(ObservedParameterSchema),
  warnings: z.array(DiagnosticWarningSchema),
  timeline: z.array(TimelineEntrySchema),
  captureMayBeIncomplete: z.boolean(),
  droppedObservationCount: z.number().int().nonnegative(),
  pageContextDetected: z.boolean().optional(),
});
export type DiagnosticSession = z.infer<typeof DiagnosticSessionSchema>;

export const QaScoreStatusSchema = z.enum(['not-run', 'in-progress', 'pass', 'warn', 'fail']);
export type QaScoreStatus = z.infer<typeof QaScoreStatusSchema>;

export const QaPresenceExpectationSchema = z.enum(['blocked', 'allowed', 'required']);
export type QaPresenceExpectation = z.infer<typeof QaPresenceExpectationSchema>;

export const QaParameterRequirementSchema = z.object({
  name: z.string().min(1).max(120),
  presence: z.enum(['required', 'optional', 'forbidden']),
  allowEmpty: z.boolean(),
  valuePattern: z.string().max(500).optional(),
});
export type QaParameterRequirement = z.infer<typeof QaParameterRequirementSchema>;

export const QaEventMatcherSchema = z.object({
  eventKind: PlatformEventKindSchema.optional(),
  sourceType: PlatformSourceTypeSchema.optional(),
  wtDl: z.string().max(40).optional(),
  eventName: z.string().max(160).optional(),
});

export const QaExpectedEventSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).max(160),
    matcher: QaEventMatcherSchema,
    minCount: z.number().int().nonnegative(),
    maxCount: z.number().int().nonnegative().optional(),
    parameters: z.array(QaParameterRequirementSchema).max(100),
  })
  .refine((value) => value.maxCount === undefined || value.maxCount >= value.minCount, {
    message: 'Maximum event count must be greater than or equal to the minimum.',
    path: ['maxCount'],
  });
export type QaExpectedEvent = z.infer<typeof QaExpectedEventSchema>;

export const QaConsentExpectationSchema = z.object({
  state: z.enum(['before-choice', 'rejected', 'accepted', 'withdrawn']),
  collection: QaPresenceExpectationSchema,
  loader: QaPresenceExpectationSchema,
  identifiers: QaPresenceExpectationSchema,
});
export type QaConsentExpectation = z.infer<typeof QaConsentExpectationSchema>;

export const QaPlanStepSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).max(160),
    instructions: z.string().max(2000).optional(),
    kind: z.enum(['scenario', 'consent-checkpoint']),
    expectedEvents: z.array(QaExpectedEventSchema).max(20),
    unexpectedEventPolicy: z.enum(['ignore', 'warn', 'fail']),
    consent: QaConsentExpectationSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.kind === 'scenario' && value.expectedEvents.length === 0)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['expectedEvents'],
        message: 'Scenario steps require at least one expected event.',
      });
    if (value.kind === 'consent-checkpoint' && !value.consent)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['consent'],
        message: 'Consent checkpoint steps require consent expectations.',
      });
  });
export type QaPlanStep = z.infer<typeof QaPlanStepSchema>;

export const QaPlanSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(160),
  description: z.string().max(2000).optional(),
  platformId: PlatformIdSchema.optional(),
  domain: z.string().max(253).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  steps: z.array(QaPlanStepSchema).min(1).max(50),
});
export type QaPlan = z.infer<typeof QaPlanSchema>;

export const QaScoreFindingSchema = z.object({
  code: z.string().min(1),
  outcome: z.enum(['warn', 'fail']),
  message: z.string(),
  eventIds: z.array(z.string()),
  parameterNames: z.array(z.string()),
});
export type QaScoreFinding = z.infer<typeof QaScoreFindingSchema>;

export const QaExpectedEventResultSchema = z.object({
  expectationId: z.string(),
  expectationName: z.string(),
  status: z.enum(['pass', 'warn', 'fail']),
  matchedEventIds: z.array(z.string()),
  findings: z.array(QaScoreFindingSchema),
});
export type QaExpectedEventResult = z.infer<typeof QaExpectedEventResultSchema>;

export const QaConsentSnapshotSchema = z.object({
  state: QaConsentExpectationSchema.shape.state,
  pageUrl: z.string(),
  observedAt: z.string(),
  collectionEventCount: z.number().int().nonnegative(),
  loaderDetected: z.boolean(),
  identifierParameterNames: z.array(z.string()),
});

export const QaPlanStepRunSchema = z.object({
  step: QaPlanStepSchema,
  status: QaScoreStatusSchema,
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  startPageUrl: z.string().optional(),
  baselineEventIds: z.array(z.string()),
  observedEvents: z.array(PlatformNetworkObservationSchema),
  expectationResults: z.array(QaExpectedEventResultSchema),
  findings: z.array(QaScoreFindingSchema),
  consentSnapshot: QaConsentSnapshotSchema.optional(),
});
export type QaPlanStepRun = z.infer<typeof QaPlanStepRunSchema>;

export const QaPlanRunSchema = z.object({
  id: z.string(),
  planId: z.string(),
  planName: z.string(),
  platformId: PlatformIdSchema.optional(),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  activeStepId: z.string().optional(),
  status: QaScoreStatusSchema,
  steps: z.array(QaPlanStepRunSchema),
});
export type QaPlanRun = z.infer<typeof QaPlanRunSchema>;

export const QaScorecardStepSchema = z.object({
  stepId: z.string(),
  name: z.string(),
  kind: z.enum(['scenario', 'consent-checkpoint']),
  status: QaScoreStatusSchema,
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  observedEventIds: z.array(z.string()),
  expectationResults: z.array(QaExpectedEventResultSchema),
  findings: z.array(QaScoreFindingSchema),
  consentSnapshot: QaConsentSnapshotSchema.optional(),
});

export const QaScorecardSchema = z.object({
  runId: z.string(),
  planId: z.string(),
  planName: z.string(),
  status: QaScoreStatusSchema,
  startedAt: z.string(),
  completedAt: z.string().optional(),
  summary: z.object({
    total: z.number().int().nonnegative(),
    passed: z.number().int().nonnegative(),
    warnings: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
    notRun: z.number().int().nonnegative(),
  }),
  steps: z.array(QaScorecardStepSchema),
});
export type QaScorecard = z.infer<typeof QaScorecardSchema>;

export const ExpectedDomainProfileSchema = z.object({
  domain: z.string(),
  platformId: PlatformIdSchema.optional(),
  environment: z.enum(['test', 'production', 'unknown']),
  accountGuids: z.array(z.string()),
  tagId: z.string().optional(),
  config: z.string().optional(),
  loadMode: ScriptLoadModeSchema.optional(),
  platformConfig: z
    .record(z.string(), z.union([z.string(), z.array(z.string()), z.boolean()]))
    .optional(),
});
export type ExpectedDomainProfile = z.infer<typeof ExpectedDomainProfileSchema>;

export const ExtensionSettingsSchema = z.object({
  enableDomMutationMonitoring: z.boolean(),
  enablePageContextDetection: z.boolean(),
  enableReloadRecommendationBanner: z.boolean(),
  expectedProfiles: z.array(ExpectedDomainProfileSchema),
  importedCatalog: z.array(OracleParameterCatalogEntrySchema).max(1000),
  qaPlans: z.array(QaPlanSchema).max(50).default([]),
});
export type ExtensionSettings = z.infer<typeof ExtensionSettingsSchema>;

export const ExportedQaEventSchema = z.object({
  id: z.string(),
  sequence: z.number().int().positive(),
  timestamp: z.string(),
  eventKind: PlatformEventKindSchema,
  sourceType: PlatformSourceTypeSchema,
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
  variantUrls: z.array(z.string()),
  resourceType: z.enum(['javascript', 'stylesheet', 'other']),
  state: z.enum(['loaded', 'cached', 'failed', 'observed']),
  requestCount: z.number().int().positive(),
  statusCodes: z.array(z.number().int()),
  firstObservedAt: z.string(),
  lastObservedAt: z.string(),
  issues: z.array(z.string()),
});
export type InfinityLibrarySummary = z.infer<typeof InfinityLibrarySummarySchema>;
export type PlatformLibrarySummary = InfinityLibrarySummary;

export const InfinitySupportTrafficSummarySchema = z.object({
  url: z.string(),
  methods: z.array(z.string()),
  state: z.enum(['successful', 'failed', 'observed']),
  requestCount: z.number().int().positive(),
  statusCodes: z.array(z.number().int()),
  firstObservedAt: z.string(),
  lastObservedAt: z.string(),
  issues: z.array(z.string()),
});
export type InfinitySupportTrafficSummary = z.infer<typeof InfinitySupportTrafficSummarySchema>;
export type PlatformSupportTrafficSummary = InfinitySupportTrafficSummary;

export const ExportedDiagnosticReportSchema = z.object({
  schemaVersion: z.number().int().positive(),
  reportType: z.string().min(1),
  platform: z.object({
    id: PlatformIdSchema,
    family: z.string(),
    productName: z.string(),
    generation: z.string(),
  }),
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
  loaders: z.array(PlatformLoaderObservationSchema),
  tagManagers: z.array(TagManagerObservationSchema),
  libraries: z.array(InfinityLibrarySummarySchema),
  supportTraffic: z.array(InfinitySupportTrafficSummarySchema),
  events: z.array(ExportedQaEventSchema),
  warnings: z.array(DiagnosticWarningSchema),
  qaScorecard: QaScorecardSchema.optional(),
  discovery: ExportedDiscoverySchema.optional(),
  notes: z.array(z.string()),
});
export type ExportedDiagnosticReport = z.infer<typeof ExportedDiagnosticReportSchema>;

export const DEFAULT_SETTINGS: ExtensionSettings = {
  enableDomMutationMonitoring: true,
  enablePageContextDetection: false,
  enableReloadRecommendationBanner: true,
  expectedProfiles: [],
  importedCatalog: [],
  qaPlans: [],
};
