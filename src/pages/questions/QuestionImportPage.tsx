// PURPOSE: /org/questions/import - import questions from a CSV file: choose file → check every line → import.
// WHY: Teachers often have questions in a spreadsheet. Lines with problems are listed with their line number and skipped;
//      valid lines are saved as drafts or published (if the user may publish). Its own page, no pop-ups.
// DEPENDS ON: features/assessment/questionCsv.ts, services/assessmentService.ts (POST /questions/import).

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/feedback/Toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageRoot } from '@/components/layout/PageRoot';
import { Button } from '@/components/ui/Button';
import { usePermissions } from '@/contexts/PermissionContext';
import { useCatalogTree } from '@/features/academic/hooks';
import { errorText } from '@/features/academic/ui';
import { useAreaBase } from '@/features/assessment/area';
import { useAssessmentMutation } from '@/features/assessment/hooks';
import {
  QUESTION_TEMPLATE_CSV,
  checkQuestionCsv,
  type CheckedQuestion,
} from '@/features/assessment/questionCsv';
import { questionService } from '@/services/assessmentService';
import type { QuestionImportResult, QuestionImportRow } from '@/types/assessment';
import { cn } from '@/utils/cn';

export default function QuestionImportPage() {
  const base = useAreaBase();
  const navigate = useNavigate();
  const perms = usePermissions();
  const { toast } = useToast();
  const tree = useCatalogTree();
  const [rows, setRows] = useState<CheckedQuestion[] | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [publish, setPublish] = useState(false);
  const [result, setResult] = useState<QuestionImportResult | null>(null);
  const send = useAssessmentMutation((v: { rows: QuestionImportRow[]; publish: boolean }) =>
    questionService.import(v.rows, v.publish),
  );

  const onFile = async (f: File | undefined) => {
    setResult(null);
    setRows(null);
    setFileError(null);
    if (!f || !tree.data) return;
    if (f.size > 2_000_000) return setFileError('The file is larger than 2 MB.');
    const checked = checkQuestionCsv(await f.text(), tree.data);
    if (checked.missingColumns.length)
      return setFileError(
        `Missing columns: ${checked.missingColumns.join(', ')}. Download the template.`,
      );
    if (!checked.rows.length) return setFileError('The file has no questions.');
    if (checked.rows.length > 500) return setFileError('Up to 500 questions per file.');
    setRows(checked.rows);
  };
  const good = rows?.filter((r) => r.body) ?? [];
  const bad = rows?.filter((r) => !r.body) ?? [];
  const template = `data:text/csv;charset=utf-8,${encodeURIComponent(QUESTION_TEMPLATE_CSV)}`;

  return (
    <PageRoot
      testId="page-questions-import"
      ready={!tree.isPending}
      className="flex flex-col gap-[18px]"
    >
      <PageHeader
        breadcrumb={[{ label: 'Question Bank', to: `${base}/questions` }, { label: 'Import CSV' }]}
        title="Import questions"
        description="One question per line. Subjects are matched by their code and topics by name. Lines with problems are skipped."
      />
      <section
        className="flex flex-col gap-3.5 rounded-card bg-surface p-[22px]"
        data-testid="questions-import-panel"
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-0 flex-[2_1_260px] flex-col gap-1.5">
            <label htmlFor="q-import-file" className="text-xs font-bold text-muted">
              CSV file (columns: subject_code, topic, question, option_a … option_f, correct,
              difficulty, marks, negative_marks, explanation)
            </label>
            <input
              id="q-import-file"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => void onFile(e.target.files?.[0])}
              className="h-[46px] w-full rounded-input border-[1.5px] border-border bg-surface-2 px-3.5 pt-2.5"
              data-testid="questions-import-file-input"
            />
          </div>
          <a
            href={template}
            download="questions-template.csv"
            data-testid="questions-import-template-link"
          >
            Download template
          </a>
        </div>
        {fileError && (
          <p
            role="alert"
            className="m-0 rounded-2xl bg-danger-bg px-3.5 py-3 font-semibold text-danger"
            data-testid="questions-import-file-error"
          >
            {fileError}
          </p>
        )}
        {rows && (
          <>
            <p className="m-0 font-semibold" data-testid="questions-import-summary">
              {good.length} ready · {bad.length} with problems
            </p>
            <div className="max-h-[420px] overflow-auto">
              <table
                className="w-full min-w-[640px] border-separate [border-spacing:0_6px]"
                data-testid="questions-import-preview-table"
              >
                <thead>
                  <tr className="text-left text-xs font-bold text-muted">
                    <th className="px-3">Line</th>
                    <th className="px-3">Subject</th>
                    <th className="px-3">Question</th>
                    <th className="px-3">Check</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.row}
                      className="[&>td]:bg-row [&>td]:px-3 [&>td]:py-2.5 [&>td:first-child]:rounded-l-[14px] [&>td:last-child]:rounded-r-[14px]"
                      data-testid="questions-import-preview-row"
                      data-state={r.body ? 'ok' : 'error'}
                      data-entity-id={r.row}
                    >
                      <td className="num">{r.row}</td>
                      <td>{r.subject}</td>
                      <td className="max-w-[380px] truncate">{r.text}</td>
                      <td>
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2.5 py-1 text-xs font-bold',
                            r.body ? 'bg-mint text-mint-ink' : 'bg-danger-bg text-danger',
                          )}
                        >
                          {r.body ? 'Ready' : r.problems.join(' · ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              {perms.can('question.publish') ? (
                <label className="flex items-center gap-2.5 font-semibold">
                  <input
                    type="checkbox"
                    checked={publish}
                    onChange={(e) => setPublish(e.target.checked)}
                    className="h-[18px] w-[18px] accent-accent"
                    data-testid="questions-import-publish-checkbox"
                  />
                  Publish them now (otherwise they are saved as drafts)
                </label>
              ) : (
                <span className="text-xs font-semibold text-muted">They are saved as drafts.</span>
              )}
              <div className="flex gap-2.5">
                <Link
                  to={`${base}/questions`}
                  className="inline-flex min-h-[44px] items-center rounded-full bg-bg px-[18px] font-bold text-ink hover:no-underline"
                  data-testid="questions-import-cancel-btn"
                >
                  Cancel
                </Link>
                <Button
                  disabled={!good.length}
                  loading={send.isPending}
                  onClick={() =>
                    send.mutate(
                      { rows: good.map((r) => r.body!), publish },
                      {
                        onSuccess: (res) => {
                          setResult(res);
                          toast({
                            title: `${res.created} ${res.created === 1 ? 'question' : 'questions'} imported`,
                            ...(res.errors.length
                              ? { description: `${res.errors.length} skipped` }
                              : {}),
                            variant: 'success',
                          });
                          if (!res.errors.length) navigate(`${base}/questions`);
                        },
                        onError: (e) =>
                          toast({
                            title: 'Could not import',
                            description: errorText(e),
                            variant: 'error',
                          }),
                      },
                    )
                  }
                  data-testid="questions-import-confirm-btn"
                >
                  Import {good.length} {good.length === 1 ? 'question' : 'questions'}
                </Button>
              </div>
            </div>
          </>
        )}
        {result && result.errors.length > 0 && (
          <div
            className="rounded-2xl bg-butter px-3.5 py-3 text-[13px] font-semibold text-butter-ink"
            data-testid="questions-import-result"
          >
            {result.created} imported. These lines were refused by the server:
            <ul className="m-0 mt-1 pl-5">
              {result.errors.map((er) => (
                <li key={er.row}>
                  Line {er.row}: {er.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </PageRoot>
  );
}
