import { OracleParameterCatalogEntrySchema } from '../../src/features/models';

const entry = {
  name: 'site.section',
  displayName: 'Site section',
  description: 'A verified local description.',
  sensitivity: 'none' as const,
};

describe('imported catalog validation', () => {
  it('accepts HTTPS documentation links', () => {
    expect(
      OracleParameterCatalogEntrySchema.safeParse({
        ...entry,
        sourceUrl: 'https://docs.oracle.com/example',
      }).success,
    ).toBe(true);
  });

  it.each(['javascript:alert(1)', 'data:text/html,example', 'http://docs.example.test'])(
    'rejects an unsafe documentation URL: %s',
    (sourceUrl) => {
      expect(OracleParameterCatalogEntrySchema.safeParse({ ...entry, sourceUrl }).success).toBe(
        false,
      );
    },
  );
});
