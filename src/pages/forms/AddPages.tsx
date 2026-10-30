// PURPOSE: Own-route pages for adding (and editing questions): /org/questions/new, /org/questions/:questionId/edit,
//          /org/exams/new, /org/admins/new (and the /teacher equivalents).
// WHY: In the prototype every "Add" opens its own page with a breadcrumb back to the list, never a panel inside the list.
//      Each page reuses the screen's existing, tested form; closing or saving goes back to the list.
// DEPENDS ON: the list pages that own the forms (InviteAdminForm, NewExamForm), QuestionEditor.

import type { ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageRoot } from '@/components/layout/PageRoot';
import { useCatalogTree } from '@/features/academic/hooks';
import { useAreaBase } from '@/features/assessment/area';
import { QuestionEditor } from '@/features/assessment/QuestionEditor';
import { NewExamForm } from '@/pages/exams/ExamsPage';
import { InviteAdminForm } from '@/pages/organization/UsersPage';

function Frame({
  pageId,
  list,
  listLabel,
  title,
  description,
  children,
}: {
  pageId: `page-${string}`;
  list: string;
  listLabel: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <PageRoot testId={pageId} className="flex flex-col gap-[18px]">
      <PageHeader
        breadcrumb={[{ label: listLabel, to: list }, { label: title }]}
        title={title}
        description={description}
      />
      {children}
    </PageRoot>
  );
}

export function QuestionFormPage() {
  const { questionId } = useParams();
  const [params] = useSearchParams();
  const base = useAreaBase();
  const navigate = useNavigate();
  const tree = useCatalogTree();
  const back = () => navigate(`${base}/questions`);
  const defaultSubject = params.get('subject') ?? tree.data?.subjects[0]?.id ?? '';
  const title = questionId ? 'Edit question' : 'New question';
  return (
    <Frame
      pageId="page-form-question"
      list={`${base}/questions`}
      listLabel="Question Bank"
      title={title}
      description="Mark the correct option. Only published questions can be added to exams."
    >
      {(questionId || !tree.isPending) && (
        <QuestionEditor
          open
          questionId={questionId ?? null}
          defaultSubject={defaultSubject}
          onClose={back}
        />
      )}
    </Frame>
  );
}

export function ExamNewPage() {
  const base = useAreaBase();
  const navigate = useNavigate();
  return (
    <Frame
      pageId="page-form-exam"
      list={`${base}/exams`}
      listLabel="Exams"
      title="New exam"
      description="Start with the basics. Next you add questions, choose who takes it and publish."
    >
      <NewExamForm open onClose={() => navigate(`${base}/exams`)} />
    </Frame>
  );
}

export function AdminNewPage() {
  const navigate = useNavigate();
  return (
    <Frame
      pageId="page-form-admin"
      list="/org/admins"
      listLabel="Admins"
      title="New admin"
      description="Admins manage the whole organization. They get an invitation by e-mail."
    >
      <InviteAdminForm open onClose={() => navigate('/org/admins')} />
    </Frame>
  );
}
