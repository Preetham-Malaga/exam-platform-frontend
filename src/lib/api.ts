// PURPOSE: Typed fetch wrapper that unwraps the standard { success, data, error, requestId } envelope.
// WHY: Every service goes through one client, so errors, tokens and request IDs are handled once.
// DEPENDS ON: lib/env.ts, types/api.ts. Used by services/* and TanStack Query hooks.

import type { ApiEnvelope } from '@/types/api';
import { env } from './env';
import { supabase } from './supabaseClient';

export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly requestId?: string,
    /** The form field the server says the error is about (shown next to that input). */
    public readonly field?: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  /** Returns the current Supabase access token (null when signed out). */
  getAccessToken?: () => Promise<string | null>;
  /** Called when the server answers 401 to a request that carried a token (session expired or revoked). */
  onUnauthorized?: () => void;
  fetchImpl?: typeof fetch;
}

export function createApiClient(options: ApiClientOptions) {
  const doFetch = options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const token = await options.getAccessToken?.();
    if (token) headers.Authorization = `Bearer ${token}`;

    let response: Response;
    try {
      response = await doFetch(`${options.baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ApiClientError(
        'NETWORK_ERROR',
        'Cannot reach the server. Check your connection.',
        0,
      );
    }

    let envelope: ApiEnvelope<T>;
    try {
      envelope = (await response.json()) as ApiEnvelope<T>;
    } catch {
      throw new ApiClientError(
        'INVALID_RESPONSE',
        'The server sent an unexpected response.',
        response.status,
      );
    }

    if (response.status === 401 && token) options.onUnauthorized?.();

    if (!envelope.success) {
      throw new ApiClientError(
        envelope.error.code,
        envelope.error.message,
        response.status,
        envelope.requestId,
        envelope.error.field,
      );
    }
    return envelope.data;
  }

  return {
    get: <T>(path: string) => request<T>('GET', path),
    post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
    put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
    patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
    delete: <T>(path: string) => request<T>('DELETE', path),
  };
}

let unauthorizedHandler: (() => void) | null = null;
/** The AuthProvider registers what should happen when the session turns out to be invalid. */
export const setUnauthorizedHandler = (fn: (() => void) | null): void => {
  unauthorizedHandler = fn;
};

export const api = createApiClient({
  onUnauthorized: () => unauthorizedHandler?.(),
  baseUrl: env.VITE_API_URL,
  // The Supabase session (kept and refreshed by supabase-js) is the only place the access token lives.
  getAccessToken: async () => (await supabase.auth.getSession()).data.session?.access_token ?? null,
});
