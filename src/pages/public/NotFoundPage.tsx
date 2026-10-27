// PURPOSE: Friendly 404 page for unknown routes.
// WHY: Users who mistype a URL should see a clear message instead of a blank screen.
// DEPENDS ON: React Router. Used by app/routes.tsx.

import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <main className="mx-auto max-w-xl p-6 text-center">
      <h1 className="text-[22px] font-bold text-primary">Page not found</h1>
      <p className="mt-2 text-muted">The page you are looking for does not exist.</p>
      <Link to="/" className="mt-4 inline-block font-medium text-primary underline">
        Go to home
      </Link>
    </main>
  );
}
