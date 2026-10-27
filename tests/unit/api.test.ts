import { describe, expect, it, vi } from 'vitest';
import { ApiClientError, createApiClient } from '@/lib/api';

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

describe('api client', () => {
  it('unwraps data from a success envelope and sends the bearer token', async () => {
    const fetchImpl = vi.fn(() =>
      json({ success: true, data: { hello: 'world' }, error: null, requestId: 'r1' }),
    );
    const api = createApiClient({
      baseUrl: 'http://api.test',
      getAccessToken: async () => 'tok',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(api.get('/x')).resolves.toEqual({ hello: 'world' });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://api.test/x');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('throws ApiClientError with code, status and requestId from a failure envelope', async () => {
    const fetchImpl = vi.fn(() =>
      json(
        {
          success: false,
          data: null,
          error: { code: 'FORBIDDEN', message: 'No.' },
          requestId: 'r2',
        },
        403,
      ),
    );
    const api = createApiClient({
      baseUrl: 'http://api.test',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(api.get('/x')).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
      requestId: 'r2',
    });
  });

  it('maps network failures to a friendly NETWORK_ERROR', async () => {
    const api = createApiClient({
      baseUrl: 'http://api.test',
      fetchImpl: (() => Promise.reject(new TypeError('boom'))) as unknown as typeof fetch,
    });
    const err = await api.get('/x').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiClientError);
    expect((err as ApiClientError).code).toBe('NETWORK_ERROR');
  });

  it('reports a 401 to onUnauthorized only when a token was sent (an expired/revoked session)', async () => {
    const unauthorized = () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            success: false,
            data: null,
            error: { code: 'UNAUTHENTICATED', message: 'x' },
            requestId: 'r',
          }),
          { status: 401 },
        ),
      );
    const onUnauthorized = vi.fn();
    const withToken = createApiClient({
      baseUrl: 'http://api.test',
      getAccessToken: async () => 'tok',
      onUnauthorized,
      fetchImpl: (() => unauthorized()) as unknown as typeof fetch,
    });
    await expect(withToken.get('/x')).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    const withoutToken = createApiClient({
      baseUrl: 'http://api.test',
      getAccessToken: async () => null,
      onUnauthorized,
      fetchImpl: (() => unauthorized()) as unknown as typeof fetch,
    });
    await expect(withoutToken.get('/x')).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledTimes(1); // unchanged: signed-out requests are not "expiry"
  });

  it('does not call onUnauthorized for other errors', async () => {
    const onUnauthorized = vi.fn();
    const api = createApiClient({
      baseUrl: 'http://api.test',
      getAccessToken: async () => 'tok',
      onUnauthorized,
      fetchImpl: (() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              success: false,
              data: null,
              error: { code: 'FORBIDDEN', message: 'no' },
              requestId: 'r',
            }),
            { status: 403 },
          ),
        )) as unknown as typeof fetch,
    });
    await expect(api.get('/x')).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
