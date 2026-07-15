import { inspectNetworkForDiscovery } from '../../src/features/discovery/discoveryRegistry';
import type { HarEntry } from '../../src/features/network/harTypes';

function entry(url: string): HarEntry {
  return {
    startedDateTime: '2026-01-01T00:00:00.000Z',
    request: { method: 'GET', url },
    response: { status: 200, statusText: 'OK' },
  };
}

describe('cross-platform discovery providers', () => {
  it('detects Google Tag Manager and Google Analytics network evidence', () => {
    const evidence = [
      ...inspectNetworkForDiscovery(
        entry('https://www.googletagmanager.com/gtm.js?id=GTM-EXAMPLE'),
      ),
      ...inspectNetworkForDiscovery(
        entry('https://www.google-analytics.com/g/collect?v=2&tid=G-EXAMPLE'),
      ),
    ];
    expect(evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Google Tag Manager', identifier: 'GTM-EXAMPLE' }),
        expect.objectContaining({ label: 'Google Analytics', identifier: 'G-EXAMPLE' }),
      ]),
    );
  });

  it('marks first-party Google Analytics collection proxies as inferred', () => {
    expect(
      inspectNetworkForDiscovery(
        entry('https://analytics.example.test/g/collect?v=2&tid=G-EXAMPLE'),
      ),
    ).toEqual([
      expect.objectContaining({
        label: 'Google Analytics',
        identifier: 'G-EXAMPLE',
        confidence: 'inferred',
      }),
    ]);
  });

  it('detects Adobe Tags, AppMeasurement, and Web SDK evidence', () => {
    const evidence = [
      ...inspectNetworkForDiscovery(
        entry('https://assets.adobedtm.com/launch-EN123-development.min.js'),
      ),
      ...inspectNetworkForDiscovery(
        entry('https://example.data.adobedc.net/b/ss/example-suite/1/JS-2.0/s123'),
      ),
      ...inspectNetworkForDiscovery(
        entry('https://example.data.adobedc.net/ee/v1/interact?configId=example'),
      ),
    ];
    expect(evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Adobe Experience Platform Tags',
          environment: 'development',
        }),
        expect.objectContaining({
          label: 'Adobe Analytics (AppMeasurement)',
          identifier: 'example-suite',
        }),
        expect.objectContaining({ label: 'Adobe Experience Platform Web SDK / Edge Network' }),
      ]),
    );
  });

  it('detects Tealium iQ and Tealium Collect evidence', () => {
    const evidence = [
      ...inspectNetworkForDiscovery(
        entry('https://tags.tiqcdn.com/utag/example/main/prod/utag.js'),
      ),
      ...inspectNetworkForDiscovery(entry('https://collect.tealiumiq.com/event')),
    ];
    expect(evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Tealium iQ',
          identifier: 'example/main',
          environment: 'prod',
        }),
        expect.objectContaining({ label: 'Tealium Collect' }),
      ]),
    );
  });
});
