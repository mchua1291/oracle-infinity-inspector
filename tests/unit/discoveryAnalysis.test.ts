import { compareDiscoverySnapshots } from '../../src/features/discovery/discoveryComparison';
import { analyzeDiscoveryReuse } from '../../src/features/discovery/reuseAnalyzer';
import {
  discoveryFieldFixture,
  discoverySnapshotFixture,
  networkFixture,
  sessionFixture,
} from '../helpers';

describe('discovery comparison and Infinity reuse analysis', () => {
  it('classifies exact matches, candidates, differing values, and empty fields conservatively', () => {
    const fields = [
      discoveryFieldFixture({
        id: 'exact',
        path: 'dataLayer[0].site.section',
        value: 'products',
      }),
      discoveryFieldFixture({
        id: 'candidate',
        path: 'dataLayer[0].product.sku',
        value: 'SKU-1',
      }),
      discoveryFieldFixture({
        id: 'different',
        path: 'dataLayer[0].page_name',
        value: 'Product detail',
      }),
      discoveryFieldFixture({
        id: 'empty',
        path: 'dataLayer[0].campaign',
        value: '',
        state: 'empty-string',
      }),
    ];
    const parameters = [
      {
        id: 'section',
        name: 'site.section',
        value: 'products',
        sourceType: 'cx-tag-network' as const,
        eventTimestamp: '2026-01-01T00:00:01.000Z',
        eventId: 'event-1',
        origin: 'query-string',
        classification: 'custom' as const,
        sensitivity: 'none' as const,
      },
      {
        id: 'page-name',
        name: 'page_name',
        value: 'Home',
        sourceType: 'cx-tag-network' as const,
        eventTimestamp: '2026-01-01T00:00:01.000Z',
        eventId: 'event-1',
        origin: 'query-string',
        classification: 'custom' as const,
        sensitivity: 'none' as const,
      },
    ];
    const session = sessionFixture({
      networkObservations: [networkFixture({ parameters, parameterCount: parameters.length })],
      parameters,
    });
    const results = analyzeDiscoveryReuse(discoverySnapshotFixture(fields), session);
    expect(Object.fromEntries(results.map((item) => [item.field.id, item.status]))).toEqual({
      candidate: 'available-not-collected',
      empty: 'empty-or-null',
      different: 'different-value',
      exact: 'already-collected',
    });
  });

  it('reports fields added and changed after an interaction', () => {
    const before = discoverySnapshotFixture([
      discoveryFieldFixture({ id: 'before-event', path: 'dataLayer[0].event', value: 'view_item' }),
    ]);
    const after = discoverySnapshotFixture(
      [
        discoveryFieldFixture({
          id: 'after-event',
          path: 'dataLayer[0].event',
          value: 'add_to_cart',
        }),
        discoveryFieldFixture({
          id: 'after-sku',
          path: 'dataLayer[0].product.sku',
          value: 'SKU-1',
        }),
      ],
      { id: 'snapshot-2' },
    );
    const comparison = compareDiscoverySnapshots(before, after);
    expect(comparison.map((entry) => entry.status)).toEqual(['changed', 'added']);
  });
});
