import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';

// Pages are lazy routes: the first render of each page compiles it, which can take over the default 1s when the whole
// suite runs in parallel. findBy*/waitFor still return as soon as the element appears.
configure({ asyncUtilTimeout: 10_000 });

afterEach(() => cleanup());
