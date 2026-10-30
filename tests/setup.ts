import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';

// Pages are lazy routes: the first render of each page compiles it, which can take over the default 1s when the whole
// suite runs in parallel. findBy*/waitFor still return as soon as the element appears.
configure({ asyncUtilTimeout: 10_000 });

// Unit tests never reach the network. Without this, a request still in flight when a test ends (after mockApi's fetch
// is removed) would hit a locally running API, get 401 for the fake token and sign the next test out.
globalThis.fetch = () =>
  Promise.reject(new Error('Network is disabled in unit tests; use mockApi().'));

afterEach(() => cleanup());
