// PURPOSE: Turns a question CSV into rows for POST /questions/import, checking each line before anything is sent.
// WHY: People fix their file faster when every problem is listed with its line number up front; the server checks again.
// DEPENDS ON: features/students/csv.ts (parseCsv), types/academic.ts (catalog tree), types/assessment.ts.

import { parseCsv } from '@/features/students/csv';
import type { CatalogTree } from '@/types/academic';
import type { Difficulty, QuestionImportRow } from '@/types/assessment';

export const QUESTION_TEMPLATE_CSV =
  'subject_code,topic,question,option_a,option_b,option_c,option_d,option_e,option_f,correct,difficulty,marks,negative_marks,explanation\n' +
  'MACH,Motors,What is the slip of an induction motor at standstill?,0,0.5,1,Infinity,,,C,medium,4,1,At standstill rotor speed is zero so slip = 1\n' +
  'MACH,,True or false: a transformer works on DC.,True,False,,,,,B,easy,1,0,\n';

const COLUMNS = ['subject_code', 'question', 'option_a', 'option_b', 'correct'] as const;

export interface CheckedQuestion {
  row: number;
  text: string;
  subject: string;
  problems: string[];
  body: QuestionImportRow | null;
}

export function checkQuestionCsv(
  text: string,
  tree: CatalogTree,
): { rows: CheckedQuestion[]; missingColumns: string[] } {
  const [head = [], ...lines] = parseCsv(text);
  const h = head.map((x) => x.trim().toLowerCase());
  const missingColumns = COLUMNS.filter((c) => !h.includes(c));
  if (missingColumns.length) return { rows: [], missingColumns: [...missingColumns] };
  const col = (r: string[], name: string) => (r[h.indexOf(name)] ?? '').trim();
  const subjects = new Map(tree.subjects.map((s) => [s.code.toLowerCase(), s]));
  const rows: CheckedQuestion[] = [];
  lines.forEach((r, i) => {
    if (r.every((c) => !c.trim())) return;
    const row = i + 2;
    const problems: string[] = [];
    const subject = subjects.get(col(r, 'subject_code').toLowerCase());
    if (!subject) problems.push(`subject ${col(r, 'subject_code') || '(empty)'} not found`);
    const topicName = col(r, 'topic');
    const topic = topicName
      ? tree.topics.find(
          (t) => t.subjectId === subject?.id && t.name.toLowerCase() === topicName.toLowerCase(),
        )
      : undefined;
    if (topicName && subject && !topic) problems.push(`topic ${topicName} not in ${subject.name}`);
    const questionText = col(r, 'question');
    if (!questionText) problems.push('question is empty');
    const options = ['a', 'b', 'c', 'd', 'e', 'f']
      .map((k) => col(r, `option_${k}`))
      .filter(Boolean);
    if (options.length < 2) problems.push('at least 2 options');
    const correct = 'ABCDEF'.indexOf(col(r, 'correct').toUpperCase());
    if (correct < 0 || correct >= options.length)
      problems.push('correct must be the letter of a filled option');
    const diff = (col(r, 'difficulty').toLowerCase() || 'medium') as Difficulty;
    if (!['easy', 'medium', 'hard'].includes(diff))
      problems.push('difficulty must be easy, medium or hard');
    const marks = Number(col(r, 'marks') || '1');
    const neg = Number(col(r, 'negative_marks') || '0');
    if (!(marks > 0)) problems.push('marks must be more than 0');
    if (!(neg >= 0) || neg > marks) problems.push('negative marks must be 0 to marks');
    const isTf =
      options.length === 2 && options.map((o) => o.toLowerCase()).join() === 'true,false';
    rows.push({
      row,
      text: questionText,
      subject: subject?.name ?? col(r, 'subject_code'),
      problems,
      body: problems.length
        ? null
        : {
            row,
            subjectId: subject!.id,
            topicId: topic?.id ?? null,
            questionType: isTf ? 'true_false' : 'multiple_choice',
            questionText,
            difficulty: diff,
            marks,
            negativeMarks: neg,
            explanation: col(r, 'explanation') || null,
            options,
            correctOption: correct,
          },
    });
  });
  return { rows, missingColumns: [] };
}
