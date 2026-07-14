import {
  classifyParameterName,
  createObservedParameter,
} from '../../src/features/infinity/parameterClassifier';
import { ORACLE_PARAMETER_CATALOG } from '../../src/features/infinity/oracleParameterCatalog';

describe('parameter classification', () => {
  it('classifies verified catalog names as standard', () =>
    expect(classifyParameterName('wt.ti').classification).toBe('standard'));
  it.each([
    'dcsdat',
    'wt.tz',
    'wt.bh',
    'wt.ul',
    'wt.cd',
    'wt.sr',
    'wt.jo',
    'wt.js',
    'wt.bs',
    'wt.ssl',
    'wt.ce',
  ])('classifies documented system parameter %s as standard', (name) =>
    expect(classifyParameterName(name).classification).toBe('standard'),
  );
  it('classifies uncatalogued wt.* parameters as custom', () =>
    expect(classifyParameterName('wt.example_custom').classification).toBe('custom'));
  it('keeps unmatched Oracle-reserved integration namespaces in review', () =>
    expect(classifyParameterName('wt.z_example').classification).toBe('unknown'));
  it('classifies implementation-defined names safely as custom', () =>
    expect(classifyParameterName('site.section').classification).toBe('custom'));
  it.each(['wt.product_name', 'wt.cart_total', 'wt.currency', 'wt.email_sha256'])(
    'classifies documented commerce parameter %s as standard',
    (name) => expect(classifyParameterName(name).classification).toBe('standard'),
  );
  it('creates observed rows with Oracle descriptions and source links', () => {
    const parameter = createObservedParameter({
      name: 'wt.ti',
      value: 'Example',
      sourceType: 'cx-tag-network',
      eventTimestamp: '2026-01-01T00:00:00Z',
      eventId: 'event',
      origin: 'query-string',
    });
    expect(parameter.catalogDisplayName).toBe('Page Title');
    expect(parameter.catalogDescription).toBeTruthy();
    expect(parameter.catalogSourceUrl).toContain('docs.oracle.com');
  });
  it('uses the documented wt.co_f identifier meaning over a token-shaped value', () => {
    const parameter = createObservedParameter({
      name: 'wt.co_f',
      value: 'abcDEF0123456789abcDEF0123456789',
      sourceType: 'cx-tag-network',
      eventTimestamp: '2026-01-01T00:00:00Z',
      eventId: 'event',
      origin: 'query-string',
    });
    expect(parameter.sensitivity).toBe('identifier');
  });
  it('bundles the full reference plus documented supplemental system names', () =>
    expect(ORACLE_PARAMETER_CATALOG.entries.length).toBeGreaterThanOrEqual(246));
});
