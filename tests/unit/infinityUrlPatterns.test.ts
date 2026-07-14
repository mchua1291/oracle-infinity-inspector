import {
  matchDcApiUrl,
  matchInfinityLibraryUrl,
  parseCxTagLoaderUrl,
} from '../../src/features/infinity/infinityUrlPatterns';

describe('Oracle URL patterns', () => {
  it('extracts account GUID, tag ID, and config', () => {
    const result = parseCxTagLoaderUrl(
      'https://d.oracleinfinity.io/infy/acs/account/example-guid/js/site-tag/odc.js?_ora.config=analytics%3Atest',
    );
    expect(result.status).toBe('success');
    if (result.status !== 'failed')
      expect(result.data).toMatchObject({
        accountGuid: 'example-guid',
        tagId: 'site-tag',
        config: 'analytics:test',
        environmentGuess: 'test',
      });
  });

  it('supports protocol-relative loader URLs', () => {
    expect(
      parseCxTagLoaderUrl('//d.oracleinfinity.io/infy/acs/account/example/js/tag/odc.js').status,
    ).toBe('success');
  });

  it('matches only HTTPS DC API v3 endpoints', () => {
    expect(matchDcApiUrl('https://dc.oracleinfinity.io/v3/example-guid')).toEqual({
      accountGuid: 'example-guid',
    });
    expect(matchDcApiUrl('http://dc.oracleinfinity.io/v3/example-guid')).toBeUndefined();
  });

  it('recognizes static Infinity libraries separately from collection endpoints', () => {
    expect(
      matchInfinityLibraryUrl('https://d.oracleinfinity.io/infy/ubi/analytics/ubi.js?v=1'),
    ).toEqual({ name: 'ubi.js', resourceType: 'javascript' });
    expect(
      matchInfinityLibraryUrl('https://sample.dc.oracleinfinity.io/dcs.gif?wt.dl=0'),
    ).toBeUndefined();
  });
});
