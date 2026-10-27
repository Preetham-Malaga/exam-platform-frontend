// PURPOSE: /org/exams/published - the exams list filtered to published (live) exams.
// WHY: The sidebar has a dedicated entry; a separate module keeps the lazy route simple.
// DEPENDS ON: pages/exams/ExamsPage.tsx.

import ExamsPage from './ExamsPage';

export default function PublishedExamsPage() {
  return <ExamsPage publishedOnly />;
}
