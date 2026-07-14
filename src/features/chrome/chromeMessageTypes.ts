import type {
  DiagnosticSummary,
  OracleCxTagLoader,
  OracleNetworkObservation,
  TagManagerObservation,
  TimelineEntry,
} from '../models';

export type ExtensionMessage =
  | {
      type: 'DOM_SCAN';
      tabId?: number;
      pageUrl: string;
      loaders: OracleCxTagLoader[];
      tagManagers: TagManagerObservation[];
      scannedAt: string;
    }
  | { type: 'GET_DOM_SCAN' }
  | { type: 'REQUEST_DOM_SCAN'; tabId: number }
  | { type: 'GET_TAB_SESSION'; tabId: number }
  | { type: 'NETWORK_OBSERVATIONS'; tabId: number; observations: OracleNetworkObservation[] }
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
  pageUrl: string;
  loaders: OracleCxTagLoader[];
  tagManagers: TagManagerObservation[];
  observations: OracleNetworkObservation[];
  scannedAt: string;
  timeline: TimelineEntry[];
}

export interface PopupSummaryResponse {
  summary?: DiagnosticSummary;
  pageUrl?: string;
}
