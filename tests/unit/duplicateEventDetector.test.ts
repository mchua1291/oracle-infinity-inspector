import { detectDuplicatePageViews } from '../../src/features/diagnostics/duplicateEventDetector';
import { networkFixture } from '../helpers';

function pageView(id: string, timestamp: string) {
  return networkFixture({
    id,
    timestamp,
    parameters: [
      {
        id: `${id}:wt.es`,
        name: 'wt.es',
        value: 'https://www.example.test/products/one',
        sourceType: 'cx-tag-network',
        eventTimestamp: timestamp,
        eventId: id,
        origin: 'query-string',
        classification: 'standard',
        sensitivity: 'none',
      },
    ],
  });
}

describe('duplicate page-view detection', () => {
  it('reports only the adjacent duplicate run when the same page appeared earlier', () => {
    const groups = detectDuplicatePageViews([
      pageView('earlier', '2026-01-01T00:00:00.000Z'),
      pageView('duplicate-one', '2026-01-01T00:00:10.000Z'),
      pageView('duplicate-two', '2026-01-01T00:00:11.000Z'),
    ]);

    expect(groups).toEqual([
      {
        signature: 'https://www.example.test/products/one|||',
        eventIds: ['duplicate-one', 'duplicate-two'],
      },
    ]);
  });

  it('returns separate evidence groups for distinct duplicate runs', () => {
    const groups = detectDuplicatePageViews([
      pageView('first-a', '2026-01-01T00:00:00.000Z'),
      pageView('first-b', '2026-01-01T00:00:01.000Z'),
      pageView('second-a', '2026-01-01T00:00:20.000Z'),
      pageView('second-b', '2026-01-01T00:00:21.000Z'),
    ]);

    expect(groups.map((group) => group.eventIds)).toEqual([
      ['first-a', 'first-b'],
      ['second-a', 'second-b'],
    ]);
  });
});
