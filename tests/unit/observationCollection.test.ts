import {
  isCollectionObservation,
  mergeObservations,
} from '../../src/features/network/observationCollection';
import { networkFixture } from '../helpers';

describe('observation collection', () => {
  it('deduplicates deterministic observation IDs and keeps the latest copy', () => {
    const first = networkFixture({ id: 'same', responseStatus: 'Pending or unavailable' });
    const completed = networkFixture({ id: 'same', responseStatus: '200 OK' });
    expect(mergeObservations([first], [completed]).observations).toEqual([completed]);
  });

  it('caps long sessions and reports dropped observations', () => {
    const events = [0, 1, 2, 3].map((index) => networkFixture({ id: `event-${index}` }));
    expect(mergeObservations([], events, 2)).toEqual({
      observations: events.slice(-2),
      dropped: 2,
    });
  });

  it('counts only verified CX Tag and DC API sources as collection', () => {
    expect(isCollectionObservation(networkFixture())).toBe(true);
    expect(
      isCollectionObservation(
        networkFixture({ sourceType: 'unknown-infinity-network', eventKind: 'unknown' }),
      ),
    ).toBe(false);
  });
});
