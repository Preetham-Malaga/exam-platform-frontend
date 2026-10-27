// PURPOSE: Root component: providers + router.
// WHY: Keeps main.tsx tiny and gives tests one component to render.
// DEPENDS ON: app/providers.tsx, app/routes.tsx. Used by main.tsx.

import { useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Providers } from './providers';
import { createRouter } from './routes';

export default function App() {
  const [router] = useState(createRouter);
  return (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  );
}
