// PURPOSE: Sends the old Academic Structure, Subjects and Topics addresses to Courses (same area: /org or /teacher).
// WHY: Bookmarks keep working after those screens moved inside the Courses tree.
// DEPENDS ON: features/assessment/area.ts.

import { Navigate } from 'react-router-dom';
import { useAreaBase } from '@/features/assessment/area';

export function ToCourses() {
  return <Navigate to={`${useAreaBase()}/courses`} replace />;
}
