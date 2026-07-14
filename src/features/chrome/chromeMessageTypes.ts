import type {
  DiagnosticWarning,
  DiagnosticSummary,
  PlatformLoaderObservation,
  PlatformNetworkObservation,
  QaPlanRun,
  TagManagerObservation,
  TimelineEntry,
} from '../models';

export type ExtensionMessage =
  | {
      type: 'DOM_SCAN';
      tabId?: number;
      pageUrl: string;
      loaders: PlatformLoaderObservation[];
      tagManagers: TagManagerObservation[];
      scannedAt: string;
    }
  | { type: 'GET_DOM_SCAN' }
  | { type: 'SCAN_TAB_DOM_ONCE'; tabId: number }
  | { type: 'REQUEST_DOM_SCAN'; tabId: number; monitorMutations: boolean }
  | { type: 'ACTIVATE_DOM_INSPECTION'; monitorMutations: boolean }
  | { type: 'GET_TAB_SESSION'; tabId: number }
  | { type: 'NETWORK_OBSERVATIONS'; tabId: number; observations: PlatformNetworkObservation[] }
  | { type: 'SET_QA_RUN'; tabId: number; qaRun?: QaPlanRun }
  | { type: 'CLEAR_SESSION'; tabId: number; pageUrl?: string }
  | { type: 'GET_TAB_SUMMARY'; tabId: number }
  | { type: 'GET_ACTIVE_TAB_ID' }
  | { type: 'ACTIVE_TAB_CHANGED'; tabId: number }
  | { type: 'PANEL_PAGE_URL_UPDATED'; tabId: number; pageUrl: string; entry?: TimelineEntry }
  | { type: 'SET_MUTATION_MONITORING'; enabled: boolean }
  | { type: 'SET_TAB_MUTATION_MONITORING'; tabId: number; enabled: boolean }
  | { type: 'ROUTE_CHANGE'; pageUrl: string; entry: TimelineEntry }
  | { type: 'SESSION_UPDATED'; tabId: number }
  | { type: 'GET_VERSION' };

export interface BackgroundTabSession {
  schemaVersion: 1;
  pageUrl: string;
  loaders: PlatformLoaderObservation[];
  tagManagers: TagManagerObservation[];
  observations: PlatformNetworkObservation[];
  scannedAt: string;
  timeline: TimelineEntry[];
  droppedObservationCount: number;
  qaRun?: QaPlanRun;
}

export interface PopupSummaryResponse {
  summary?: DiagnosticSummary;
  pageUrl?: string;
  platformId?: string;
  scannedAt?: string;
  warnings?: Array<Pick<DiagnosticWarning, 'severity' | 'title'>>;
}
