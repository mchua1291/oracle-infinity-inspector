import { parseDcsGif } from '../../src/features/network/dcsGifParser';

describe('dcs.gif parser', () => {
  const url = (dl: string) =>
    `https://sample.dc.oracleinfinity.io/dcs.gif?wt.dl=${dl}&wt.ti=Example&custom_key=value`;
  it('classifies wt.dl=0 as page view', () => {
    const result = parseDcsGif(url('0'));
    expect(result.status !== 'failed' && result.data.eventKind).toBe('page-view');
  });
  it('classifies wt.dl=1 as click/event', () => {
    const result = parseDcsGif(url('1'));
    expect(result.status !== 'failed' && result.data.eventKind).toBe('click-event');
  });
  it('preserves undocumented event codes without inventing meaning', () => {
    const result = parseDcsGif(url('77'));
    expect(result.status !== 'failed' && result.data).toMatchObject({
      eventKind: 'event-code-specific',
      wtDl: '77',
    });
  });
  it('preserves query parameters', () => {
    const result = parseDcsGif(url('0'));
    expect(result.status !== 'failed' && result.data.parameters.custom_key).toEqual(['value']);
  });
  it('preserves empty query-string values', () => {
    const result = parseDcsGif(`${url('0')}&site.section=`);
    expect(result.status !== 'failed' && result.data.parameters['site.section']).toEqual(['']);
  });
});
