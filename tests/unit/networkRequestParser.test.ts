import dcapi from '../fixtures/har/dcapi-post.har.json';
import view from '../fixtures/har/cx-tag-view-call.har.json';
import { parseNetworkRequest } from '../../src/features/network/networkRequestParser';
import type { HarEntry } from '../../src/features/network/harTypes';

describe('network request parser', () => {
  it('parses a CX Tag view request fixture', () => {
    const result = parseNetworkRequest(view.log.entries[0] as HarEntry);
    expect(result.status !== 'failed' && result.data[0]).toMatchObject({
      sourceType: 'cx-tag-network',
      eventKind: 'page-view',
    });
  });
  it('creates one logical observation per DC API event', () => {
    const result = parseNetworkRequest(dcapi.log.entries[0] as HarEntry);
    expect(result.status !== 'failed' && result.data).toHaveLength(2);
  });
  it('classifies a cache-validated UBI script as an Infinity library, not an event', () => {
    const result = parseNetworkRequest({
      startedDateTime: '2026-01-01T00:00:00.000Z',
      request: {
        method: 'GET',
        url: 'https://d.oracleinfinity.io/infy/ubi/analytics/ubi.js?v=1',
      },
      response: { status: 304, statusText: 'Not Modified' },
    });
    expect(result.status !== 'failed' && result.data[0]).toMatchObject({
      sourceType: 'infinity-library',
      eventKind: 'library',
      libraryName: 'ubi.js',
      statusCode: 304,
      warnings: [],
    });
  });

  it('creates stable event and parameter IDs for the same HAR request', () => {
    const first = parseNetworkRequest(view.log.entries[0] as HarEntry);
    const second = parseNetworkRequest(view.log.entries[0] as HarEntry);
    expect(first.status !== 'failed' && first.data[0].id).toBe(
      second.status !== 'failed' ? second.data[0].id : undefined,
    );
    expect(first.status !== 'failed' && first.data[0].parameters.map((item) => item.id)).toEqual(
      second.status !== 'failed' ? second.data[0].parameters.map((item) => item.id) : [],
    );
  });

  it('keeps the request identity stable when only response metadata changes', () => {
    const pending = { ...view.log.entries[0], response: { status: 0, statusText: '' } } as HarEntry;
    const completed = view.log.entries[0] as HarEntry;
    const pendingResult = parseNetworkRequest(pending);
    const completedResult = parseNetworkRequest(completed);
    expect(pendingResult.status !== 'failed' && pendingResult.data[0].id).toBe(
      completedResult.status !== 'failed' ? completedResult.data[0].id : undefined,
    );
  });

  it('reports a non-POST DC API call without treating it as a malformed body', () => {
    const result = parseNetworkRequest({
      startedDateTime: '2026-01-01T00:00:00.000Z',
      request: { method: 'GET', url: 'https://dc.oracleinfinity.io/v3/example-guid' },
      response: { status: 200, statusText: 'OK' },
    });
    expect(result.status).toBe('partial');
    expect(result.status !== 'failed' && result.data[0]).toMatchObject({
      requestMethod: 'GET',
      requestBodyParseStatus: 'partial',
      parameters: [],
    });
  });
});
