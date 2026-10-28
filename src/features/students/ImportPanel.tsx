// PURPOSE: Import students from a CSV file: read the file, check it (dry run, nothing saved), then import.
// WHY: Colleges onboard hundreds of students at once (guide 2.2 step 6). Problems are reported per line so the file can be
//      fixed and uploaded again; rows that already exist are refused, never duplicated.
// DEPENDS ON: features/students/csv.ts + hooks.ts, services/studentService.ts, components/inline/Inline.tsx (shown in the page, above the list).

import { useState } from 'react';
import { useToast } from '@/components/feedback/Toast';
import { InlinePanel } from '@/components/inline/Inline';
import { Button } from '@/components/ui/Button';
import { errorText } from '@/features/academic/ui';
import { studentService } from '@/services/studentService';
import type { ImportResult, ImportRow } from '@/types/student';
import { TEMPLATE_CSV, toImportRows } from './csv';
import { useStudentMutation } from './hooks';

const SHOW_PROBLEMS = 50;

function Problems({ result }: { result: ImportResult }) {
  if (!result.failed.length) return null;
  return (
    <div className="max-h-56 overflow-y-auto rounded-lg border border-border">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Rows with problems</caption>
        <thead className="bg-background text-xs text-muted">
          <tr>
            <th className="px-3 py-1.5">Line</th>
            <th className="px-3 py-1.5">Roll no.</th>
            <th className="px-3 py-1.5">Problem</th>
          </tr>
        </thead>
        <tbody>
          {result.failed.slice(0, SHOW_PROBLEMS).map((f) => (
            <tr key={f.row} className="border-t border-border">
              {/* data row 1 is line 2 of the file (line 1 is the header) */}
              <td className="px-3 py-1.5">{f.row + 1}</td>
              <td className="px-3 py-1.5 font-mono text-xs">{f.rollNumber ?? '—'}</td>
              <td className="px-3 py-1.5">{f.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {result.failed.length > SHOW_PROBLEMS && (
        <p className="px-3 py-1.5 text-xs text-muted">
          …and {result.failed.length - SHOW_PROBLEMS} more.
        </p>
      )}
    </div>
  );
}

export function ImportPanel({
  open,
  onClose,
  className,
}: {
  open: boolean;
  onClose: () => void;
  className?: string;
}) {
  const { toast } = useToast();
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [check, setCheck] = useState<ImportResult | null>(null);
  const run = useStudentMutation((dryRun: boolean) => studentService.importAll(rows, dryRun));

  const close = () => {
    setFileName('');
    setRows([]);
    setFileError(null);
    setCheck(null);
    run.reset();
    onClose();
  };
  const onFile = async (file: File | undefined) => {
    setCheck(null);
    if (!file) return;
    setFileName(file.name);
    const parsed = toImportRows(await file.text());
    setRows(parsed.rows);
    setFileError(parsed.error);
  };
  const doCheck = () =>
    run.mutate(true, {
      onSuccess: setCheck,
      onError: (e) =>
        toast({ title: 'Could not check the file', description: errorText(e), variant: 'error' }),
    });
  const doImport = () =>
    run.mutate(false, {
      onSuccess: (r) => {
        toast({
          title: `${r.created} student${r.created === 1 ? '' : 's'} imported`,
          description: r.failed.length ? `${r.failed.length} row(s) were skipped.` : undefined,
          variant: r.failed.length ? 'info' : 'success',
        });
        if (r.failed.length) setCheck(r);
        else close();
      },
      onError: (e) =>
        toast({ title: 'Import failed', description: errorText(e), variant: 'error' }),
    });

  const ready = check && !check.dryRun ? 0 : (check?.created ?? 0);
  return (
    <InlinePanel
      open={open}
      onClose={close}
      title="Import students"
      testId="student-import"
      {...(className ? { className } : {})}
      footer={
        <>
          <Button variant="outline" onClick={close} data-testid="student-import-cancel-btn">
            {check && !check.dryRun ? 'Done' : 'Cancel'}
          </Button>
          {!check || !check.dryRun ? (
            <Button
              disabled={!rows.length || Boolean(fileError) || Boolean(check && !check.dryRun)}
              loading={run.isPending}
              onClick={doCheck}
              data-testid="student-import-check-btn"
            >
              Check file
            </Button>
          ) : (
            <Button
              disabled={ready === 0}
              loading={run.isPending}
              onClick={doImport}
              data-testid="student-import-submit-btn"
              data-count={ready}
            >
              Import {ready} student{ready === 1 ? '' : 's'}
            </Button>
          )}
        </>
      }
    >
      <div className="grid gap-4">
        <p className="text-sm text-muted">
          Columns: <code>roll_number</code>, <code>full_name</code> (required), <code>email</code>,{' '}
          <code>phone</code>, <code>unit_code</code> (the code of an academic unit).{' '}
          <a
            className="font-medium text-primary underline"
            download="students-template.csv"
            data-testid="student-import-template-link"
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE_CSV)}`}
          >
            Download the template
          </a>
          . No invitations are sent; invite students from the list afterwards.
        </p>
        <div className="grid gap-1.5">
          <label htmlFor="students-file" className="text-[13px] font-medium text-text">
            CSV file
          </label>
          <input
            id="students-file"
            type="file"
            accept=".csv,text/csv"
            name="file"
            data-testid="student-import-file-input"
            className="text-sm"
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
        </div>
        {fileError && (
          <p role="alert" className="text-sm text-error" data-testid="student-import-file-error">
            {fileError}
          </p>
        )}
        {!fileError && rows.length > 0 && !check && (
          <p className="text-sm text-text">
            <strong>{rows.length}</strong> student{rows.length === 1 ? '' : 's'} found in {fileName}
            .
          </p>
        )}
        {check && (
          <div role="status" className="grid gap-3" data-testid="student-import-result">
            <p className="text-sm text-text">
              {check.dryRun ? (
                <>
                  <strong>{check.created}</strong> of {check.total} row(s) are ready to import
                  {check.failed.length ? (
                    <>
                      ; <strong>{check.failed.length}</strong> have problems and will be skipped.
                    </>
                  ) : (
                    '.'
                  )}
                </>
              ) : (
                <>
                  Imported <strong>{check.created}</strong> of {check.total}. Fix the rows below and
                  import them again.
                </>
              )}
            </p>
            <Problems result={check} />
          </div>
        )}
      </div>
    </InlinePanel>
  );
}
