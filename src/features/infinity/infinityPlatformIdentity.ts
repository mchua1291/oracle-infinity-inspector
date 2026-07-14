import type { PlatformIdentity } from '../platform/platformAdapter';

export const ORACLE_INFINITY_PLATFORM_ID = 'oracle-infinity';

export const ORACLE_INFINITY_IDENTITY: PlatformIdentity = {
  id: ORACLE_INFINITY_PLATFORM_ID,
  family: 'Oracle Digital Experience Analytics',
  productName: 'Oracle Infinity',
  shortName: 'Infinity',
  panelName: 'Oracle Infinity',
  reportType: 'oracle-infinity-qa-report',
  generation: 'Infinity / UBI',
  documentationLabel: 'Oracle documentation',
  guidanceLabel: 'Oracle commerce guidance',
  warningGuidanceLabel: 'Oracle guidance',
  loaderLabel: 'CX Tag loader',
  libraryLabel: 'Infinity library',
  libraryLabelPlural: 'Infinity libraries',
  collectionLabel: 'Infinity collection',
  supportTrafficLabel: 'Infinity support and service traffic',
  pageContextLabel: 'window.ORA',
  pageContextExpression: "typeof window.ORA !== 'undefined'",
};
