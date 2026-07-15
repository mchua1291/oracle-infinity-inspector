import { z } from 'zod';

export const DiscoveryProviderIdSchema = z.enum(['google', 'adobe', 'tealium']);
export type DiscoveryProviderId = z.infer<typeof DiscoveryProviderIdSchema>;

const DiscoveryConfidenceSchema = z.enum(['direct', 'inferred', 'low']);
const DiscoveryTechnologyKindSchema = z.enum([
  'tag-manager',
  'analytics',
  'data-layer',
  'collector',
]);
const DiscoveryEvidenceSourceSchema = z.enum(['dom', 'network', 'page-context']);

const DiscoveryTechnologyEvidenceSchema = z.object({
  id: z.string(),
  providerId: DiscoveryProviderIdSchema,
  technologyKind: DiscoveryTechnologyKindSchema,
  label: z.string(),
  identifier: z.string().optional(),
  environment: z.string().optional(),
  source: DiscoveryEvidenceSourceSchema,
  confidence: DiscoveryConfidenceSchema,
  evidence: z.string(),
  observedAt: z.string(),
  requestUrl: z.string().optional(),
});
export type DiscoveryTechnologyEvidence = z.infer<typeof DiscoveryTechnologyEvidenceSchema>;

const DiscoveryFieldStateSchema = z.enum([
  'populated',
  'empty-string',
  'null',
  'empty-array',
  'empty-object',
  'unavailable',
  'unsupported',
]);

const DiscoveryValueTypeSchema = z.enum([
  'string',
  'number',
  'boolean',
  'null',
  'undefined',
  'array',
  'object',
  'bigint',
  'function',
  'symbol',
  'date',
  'dom-node',
  'unknown',
]);

const DiscoverySensitivitySchema = z.enum([
  'none',
  'identifier',
  'email',
  'phone',
  'payment-card',
  'token-or-secret',
]);

const DiscoveryFieldSchema = z.object({
  id: z.string(),
  providerId: DiscoveryProviderIdSchema,
  sourceObject: z.string(),
  path: z.string(),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  valueType: DiscoveryValueTypeSchema,
  state: DiscoveryFieldStateSchema,
  entryIndex: z.number().int().nonnegative().optional(),
  truncated: z.boolean(),
  sensitivity: DiscoverySensitivitySchema,
  sensitivityReasons: z.array(z.string()),
});
export type DiscoveryField = z.infer<typeof DiscoveryFieldSchema>;

const DiscoveryLayerSchema = z.object({
  providerId: DiscoveryProviderIdSchema,
  objectName: z.string(),
  label: z.string(),
  kind: z.enum(['queue', 'object', 'runtime']),
  totalEntries: z.number().int().nonnegative(),
  truncated: z.boolean(),
  fields: z.array(DiscoveryFieldSchema),
});
export type DiscoveryLayer = z.infer<typeof DiscoveryLayerSchema>;

export const DiscoverySnapshotSchema = z.object({
  id: z.string(),
  capturedAt: z.string(),
  pageUrl: z.string(),
  layers: z.array(DiscoveryLayerSchema),
});
export type DiscoverySnapshot = z.infer<typeof DiscoverySnapshotSchema>;

export const DiscoveryStateSchema = z.object({
  technologies: z.array(DiscoveryTechnologyEvidenceSchema),
  snapshots: z.array(DiscoverySnapshotSchema),
  baselineSnapshotId: z.string().optional(),
});
export type DiscoveryState = z.infer<typeof DiscoveryStateSchema>;

export const EMPTY_DISCOVERY_STATE: DiscoveryState = {
  technologies: [],
  snapshots: [],
};

const DiscoveryChangeStatusSchema = z.enum(['added', 'removed', 'changed', 'unchanged']);

const DiscoveryComparisonEntrySchema = z.object({
  key: z.string(),
  status: DiscoveryChangeStatusSchema,
  before: DiscoveryFieldSchema.optional(),
  after: DiscoveryFieldSchema.optional(),
});
export type DiscoveryComparisonEntry = z.infer<typeof DiscoveryComparisonEntrySchema>;

const DiscoveryReuseStatusSchema = z.enum([
  'already-collected',
  'available-not-collected',
  'different-value',
  'empty-or-null',
]);

const DiscoveryReuseAssessmentSchema = z.object({
  id: z.string(),
  field: DiscoveryFieldSchema,
  canonicalPath: z.string(),
  fieldName: z.string(),
  status: DiscoveryReuseStatusSchema,
  matchingParameterNames: z.array(z.string()),
  rationale: z.string(),
});
export type DiscoveryReuseAssessment = z.infer<typeof DiscoveryReuseAssessmentSchema>;

export const ExportedDiscoverySchema = DiscoveryStateSchema.extend({
  reuseAssessments: z.array(DiscoveryReuseAssessmentSchema),
  comparison: z.array(DiscoveryComparisonEntrySchema),
});
export type ExportedDiscovery = z.infer<typeof ExportedDiscoverySchema>;
