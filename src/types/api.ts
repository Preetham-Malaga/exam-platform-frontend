// PURPOSE: TypeScript shapes of the backend response envelope and health payload.
// WHY: The frontend must match the API contract (openapi/openapi.yaml in the backend repo).
// DEPENDS ON: Nothing. Used by lib/api.ts and pages. Will be replaced by generated types later.

export interface ApiErrorBody {
  code: string;
  message: string;
  /** The request field the error is about. */
  field?: string;
}

export type ApiEnvelope<T> =
  | { success: true; data: T; error: null; requestId: string }
  | { success: false; data: null; error: ApiErrorBody; requestId: string };

export interface HealthReport {
  status: 'ok' | 'degraded';
  api: 'up';
  database: 'up' | 'down';
  redis: 'up' | 'down';
  version: string;
  environment: string;
}

export interface Paginated<T> {
  items: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}
