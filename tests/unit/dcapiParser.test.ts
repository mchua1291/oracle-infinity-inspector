import { parseDcApiBody } from '../../src/features/network/dcapiParser';

describe('DC API parser', () => {
  it('flattens static values into each event and lets event values override', () => {
    const result = parseDcApiBody(
      JSON.stringify({
        static: { dcssip: 'example.test', shared: 'static' },
        events: [{ 'wt.ets': '1', shared: 'event' }, { 'wt.ets': '2' }],
      }),
    );
    expect(result.status).toBe('success');
    if (result.status !== 'failed') {
      expect(result.data.events).toHaveLength(2);
      expect(result.data.events[0].parameters.shared).toBe('event');
      expect(result.data.events[1].parameters.shared).toBe('static');
      expect(result.data.events[0].origins.shared).toBe('dcapi-event');
    }
  });

  it('returns failed for malformed JSON', () =>
    expect(parseDcApiBody('{bad').status).toBe('failed'));
  it('returns partial when non-string values are omitted', () =>
    expect(parseDcApiBody(JSON.stringify({ events: [{ 'wt.ets': '1', count: 2 }] })).status).toBe(
      'partial',
    ));

  it('preserves empty strings and explicit null values for QA', () => {
    const result = parseDcApiBody(
      JSON.stringify({ events: [{ 'wt.ets': '1', empty: '', missing: null }] }),
    );
    expect(result.status).toBe('success');
    if (result.status !== 'failed') {
      expect(result.data.events[0].parameters.empty).toBe('');
      expect(result.data.events[0].parameters.missing).toBeNull();
    }
  });
});
