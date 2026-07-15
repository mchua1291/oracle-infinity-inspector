import { afterEach, vi } from 'vitest';
import { captureDiscoverySnapshot } from '../../src/features/discovery/captureDiscovery';

afterEach(() => vi.unstubAllGlobals());

it('normalizes a bounded page-context snapshot and highlights sensitive values', async () => {
  const evaluate = vi.fn(
    (
      expression: string,
      callback: (result: unknown, exceptionInfo?: { isException?: boolean }) => void,
    ) => {
      expect(expression).toContain('__ORACLE_INFINITY_DISCOVERY_PROBE__');
      callback({
        capturedAt: '2026-01-01T00:00:00.000Z',
        pageUrl: 'https://www.example.test/product',
        technologies: [
          {
            providerId: 'google',
            technologyKind: 'data-layer',
            label: 'Google dataLayer',
            identifier: 'dataLayer',
            evidence: 'The dataLayer page-context object is present.',
          },
        ],
        layers: [
          {
            providerId: 'google',
            objectName: 'dataLayer',
            label: 'Google dataLayer',
            kind: 'queue',
            totalEntries: 1,
            truncated: false,
            fields: [
              {
                path: 'dataLayer[0].customer_email',
                value: 'person@example.test',
                valueType: 'string',
                state: 'populated',
                entryIndex: 0,
                truncated: false,
              },
              {
                path: 'dataLayer[0].event_timestamp',
                value: '1783982327833',
                valueType: 'string',
                state: 'populated',
                entryIndex: 0,
                truncated: false,
              },
            ],
          },
        ],
      });
    },
  );
  vi.stubGlobal('chrome', { devtools: { inspectedWindow: { eval: evaluate } } });

  const result = await captureDiscoverySnapshot();
  expect(result.snapshot.layers[0].fields[0]).toMatchObject({ sensitivity: 'email' });
  expect(result.snapshot.layers[0].fields[1]).toMatchObject({ sensitivity: 'none' });
  expect(result.technologies[0]).toMatchObject({
    providerId: 'google',
    technologyKind: 'data-layer',
    source: 'page-context',
  });
});
