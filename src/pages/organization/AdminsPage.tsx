// PURPOSE: /org/admins - the users list pre-filtered to organization admins.
// WHY: Same page, different preset; keeps one implementation of the users table.
// DEPENDS ON: pages/organization/UsersPage.tsx.

import UsersPage from './UsersPage';

export default function AdminsPage() {
  return <UsersPage adminsOnly />;
}
