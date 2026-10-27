// PURPOSE: The URL prefix of the current area ("/org" for owners/admins, "/teacher" for teachers).
// WHY: The same exam / question / result pages are mounted in both areas; links must stay inside the current one.
// DEPENDS ON: React Router.

import { useLocation } from 'react-router-dom';

export function useAreaBase(): '/org' | '/teacher' {
  return useLocation().pathname.startsWith('/teacher') ? '/teacher' : '/org';
}
