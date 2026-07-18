import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, del, get, listShops, post } from './api';

function mockFetchOnce(response: { ok: boolean; status: number; json?: () => Promise<unknown> }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status,
    statusText: '',
    json: response.json ?? (() => Promise.resolve(undefined)),
  } as Response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('api client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds the request URL with the default base URL and /api/v1 prefix', async () => {
    const fetchMock = mockFetchOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: [], meta: { page: 1, limit: 20, total: 0 } }),
    });

    await get('/manufacturers');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/manufacturers',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('serializes query params onto the URL and omits undefined values', async () => {
    const fetchMock = mockFetchOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: [], meta: { page: 2, limit: 10, total: 0 } }),
    });

    await get('/parts', { page: 2, limit: 10, categoryId: undefined, q: 'brake' });

    const [calledUrl] = fetchMock.mock.calls[0] as [string, RequestInit];
    const url = new URL(calledUrl);
    expect(url.pathname).toBe('/api/v1/parts');
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('limit')).toBe('10');
    expect(url.searchParams.get('q')).toBe('brake');
    expect(url.searchParams.has('categoryId')).toBe(false);
  });

  it('sends a JSON body and Content-Type header on post/patch/put', async () => {
    const fetchMock = mockFetchOnce({ ok: true, status: 201, json: () => Promise.resolve({ id: 1 }) });

    await post('/manufacturers', { name: 'Bosch' });

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestInit.method).toBe('POST');
    expect(requestInit.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(requestInit.body).toBe(JSON.stringify({ name: 'Bosch' }));
  });

  it('unwraps a successful response body as-is', async () => {
    const payload = { data: [{ id: 1, name: 'Downtown Shop' }], meta: { page: 1, limit: 20, total: 1 } };
    mockFetchOnce({ ok: true, status: 200, json: () => Promise.resolve(payload) });

    const result = await listShops();

    expect(result).toEqual(payload);
  });

  it('returns undefined for a 204 response without parsing a body', async () => {
    const jsonSpy = vi.fn();
    mockFetchOnce({ ok: true, status: 204, json: jsonSpy });

    const result = await del('/manufacturers/1');

    expect(result).toBeUndefined();
    expect(jsonSpy).not.toHaveBeenCalled();
  });

  it('parses the {error} envelope into a typed ApiError on a not-found response', async () => {
    mockFetchOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: { code: 'NOT_FOUND', message: 'Shop 99 not found' } }),
    });

    let caughtError: unknown;
    try {
      await get('/shops/99');
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(ApiError);
    expect((caughtError as ApiError).status).toBe(404);
    expect((caughtError as ApiError).code).toBe('NOT_FOUND');
    expect((caughtError as ApiError).message).toBe('Shop 99 not found');
  });

  it('wraps a fetch rejection in an ApiError with status 0 and NETWORK_ERROR code', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    let caughtError: unknown;
    try {
      await get('/shops');
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(ApiError);
    expect((caughtError as ApiError).status).toBe(0);
    expect((caughtError as ApiError).code).toBe('NETWORK_ERROR');
    expect((caughtError as ApiError).message).toBe('Failed to fetch');
  });

  it('carries validation error details through the ApiError', async () => {
    const details = [{ path: ['name'], message: 'Required' }];
    mockFetchOnce({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({ error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details } }),
    });

    let caughtError: unknown;
    try {
      await post('/manufacturers', {});
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(ApiError);
    expect((caughtError as ApiError).code).toBe('VALIDATION_ERROR');
    expect((caughtError as ApiError).details).toEqual(details);
  });
});
