import type {
  DiagnosticSession,
  DiagnosticSummary,
  DiagnosticWarning,
  ExpectedDomainProfile,
  ExportedQaEvent,
  ParameterCatalogEntry,
  ParserResult,
  PlatformLibrarySummary,
  PlatformLoaderObservation,
  PlatformNetworkObservation,
  PlatformSupportTrafficSummary,
} from '../models';
import type { HarEntry } from '../network/harTypes';

export interface PlatformIdentity {
  id: string;
  family: string;
  productName: string;
  shortName: string;
  panelName: string;
  reportType: string;
  generation: string;
  documentationLabel: string;
  guidanceLabel: string;
  warningGuidanceLabel: string;
  loaderLabel: string;
  libraryLabel: string;
  libraryLabelPlural: string;
  collectionLabel: string;
  supportTrafficLabel: string;
  pageContextLabel: string;
  pageContextExpression: string;
}

export interface PlatformDetail {
  label: string;
  value: string;
}

export interface PlatformOverviewCard extends PlatformDetail {
  id: string;
  note?: string;
  tone?: 'success' | 'warning' | 'danger' | 'neutral' | 'info';
}

export interface PlatformDebugAction {
  label: string;
  note: string;
  url: string;
}

export interface PlatformProfileField {
  key: string;
  label: string;
  control: 'text' | 'select';
  options?: readonly string[];
  maxLength?: number;
}

export interface PlatformAdapter {
  identity: PlatformIdentity;
  catalogVersion: string;
  catalogEntries: readonly ParameterCatalogEntry[];
  expectedProfileFields: readonly PlatformProfileField[];
  readExpectedProfileField(profile: ExpectedDomainProfile, fieldKey: string): string;
  writeExpectedProfileField(
    profile: ExpectedDomainProfile,
    fieldKey: string,
    value: string,
  ): ExpectedDomainProfile;
  matchesRequestUrl(url: string): boolean;
  parseNetworkRequest(
    entry: HarEntry,
    importedCatalog?: ParameterCatalogEntry[],
  ): ParserResult<PlatformNetworkObservation[]>;
  scanDocument(root?: ParentNode): PlatformLoaderObservation[];
  scanScriptElement(
    script: HTMLScriptElement,
    dynamicallyInserted?: boolean,
  ): PlatformLoaderObservation | undefined;
  loaderDetails(loader: PlatformLoaderObservation): PlatformDetail[];
  eventDisplayName(event: PlatformNetworkObservation): string;
  networkEventDetails(event: PlatformNetworkObservation): PlatformDetail[];
  exportEventDetails(event: ExportedQaEvent): PlatformDetail[];
  summaryDetails(summary: DiagnosticSummary, exportedEventCount: number): PlatformDetail[];
  overviewCards(summary: DiagnosticSummary): PlatformOverviewCard[];
  debugAction?(pageUrl: string): PlatformDebugAction | undefined;
  isCollectionObservation(event: PlatformNetworkObservation): boolean;
  isSupportObservation(event: PlatformNetworkObservation): boolean;
  summarizeLibraries(events: PlatformNetworkObservation[]): PlatformLibrarySummary[];
  summarizeSupportTraffic(events: PlatformNetworkObservation[]): PlatformSupportTrafficSummary[];
  buildDiagnostics(
    session: DiagnosticSession,
    profiles?: ExpectedDomainProfile[],
  ): DiagnosticWarning[];
  buildSummary(session: DiagnosticSession): DiagnosticSummary;
  exportNotes(session: DiagnosticSession): string[];
}
