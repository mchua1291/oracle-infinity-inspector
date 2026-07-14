import view from '../fixtures/har/cx-tag-view-call.har.json';
import type { HarEntry } from '../../src/features/network/harTypes';
import { oracleInfinityPlatformAdapter } from '../../src/features/infinity/infinityPlatformAdapter';
import {
  createPlatformRegistry,
  getDefaultPlatformAdapter,
  getPlatformAdapter,
  platformAdapterForSession,
} from '../../src/features/platform/platformRegistry';
import { parseRequestWithPlatformAdapters } from '../../src/features/platform/platformRuntime';
import { scanDocumentWithPlatformDomAdapters } from '../../src/features/platform/platformDomRegistry';
import { networkFixture, sessionFixture } from '../helpers';

describe('platform adapter architecture', () => {
  it('registers Infinity as the default adapter with stable product metadata', () => {
    expect(getDefaultPlatformAdapter().identity).toMatchObject({
      id: 'oracle-infinity',
      productName: 'Oracle Infinity',
      reportType: 'oracle-infinity-qa-report',
    });
  });

  it('rejects duplicate and unknown adapter identifiers instead of silently misclassifying them', () => {
    expect(() =>
      createPlatformRegistry([oracleInfinityPlatformAdapter, oracleInfinityPlatformAdapter]),
    ).toThrow(/Duplicate platform adapter id/);
    expect(() => getPlatformAdapter('future-unregistered-platform')).toThrow(
      /No platform adapter is registered/,
    );
  });

  it('routes matching network requests through the adapter and stamps the platform id', () => {
    const result = parseRequestWithPlatformAdapters(view.log.entries[0] as HarEntry);
    expect(result.status).not.toBe('failed');
    expect(result.status !== 'failed' && result.data[0]).toMatchObject({
      platformId: 'oracle-infinity',
      sourceType: 'cx-tag-network',
    });
    expect(
      parseRequestWithPlatformAdapters({
        request: { method: 'GET', url: 'https://example.test/analytics' },
        response: { status: 200, statusText: 'OK' },
      }).status,
    ).toBe('failed');
  });

  it('routes DOM loader detection through the adapter and stamps the platform id', () => {
    document.body.innerHTML =
      '<script src="https://d.oracleinfinity.io/infy/acs/account/account/js/tag/odc.js"></script>';
    expect(scanDocumentWithPlatformDomAdapters()[0]).toMatchObject({
      platformId: 'oracle-infinity',
      config: { accountGuid: 'account', tagId: 'tag' },
    });
  });

  it('resolves sessions and expected-profile fields through the registered adapter', () => {
    const session = sessionFixture({
      networkObservations: [networkFixture({ platformId: 'oracle-infinity' })],
    });
    const adapter = platformAdapterForSession(session);
    const profile = adapter.writeExpectedProfileField(
      {
        domain: 'example.test',
        platformId: adapter.identity.id,
        environment: 'unknown',
        accountGuids: [],
      },
      'accountGuids',
      'one, two',
    );
    expect(adapter.readExpectedProfileField(profile, 'accountGuids')).toBe('one, two');
    expect(profile.accountGuids).toEqual(['one', 'two']);
  });
});
