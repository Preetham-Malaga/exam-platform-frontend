// PURPOSE: The "you may not open this page" screen (403) shown by permission guards.
// WHY: A forbidden URL must be refused with a clear message, not merely hidden from the menu.
// DEPENDS ON: States.tsx, React Router.

import { Link } from 'react-router-dom';
import { EmptyState } from './States';

export function AccessDenied() {
  return (
    <div role="alert" data-testid="access-denied">
      <EmptyState
        icon="shield"
        title="You do not have access to this page"
        description="Ask an administrator of your organization if you need access."
        action={
          <Link
            to="/app"
            className="font-medium text-primary underline"
            data-testid="access-denied-home-link"
          >
            Go to your home page
          </Link>
        }
      />
    </div>
  );
}
