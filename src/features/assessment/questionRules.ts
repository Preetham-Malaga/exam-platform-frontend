// PURPOSE: The question editor's form state and its validation (the same rules the API enforces).
// WHY: Pure functions: shared by the editor and unit-testable without rendering anything.
// DEPENDS ON: types/assessment.ts.

import type { Difficulty, Question, QuestionType } from '@/types/assessment';

export interface QuestionDraft {
  subjectId: string;
  topicId: string;
  questionType: QuestionType;
  questionText: string;
  difficulty: Difficulty;
  marks: string;
  negativeMarks: string;
  explanation: string;
  options: string[];
  correctOption: number;
}

export const draftFromQuestion = (q: Question | null, subjectId: string): QuestionDraft => ({
  subjectId: q?.subjectId ?? subjectId,
  topicId: q?.topicId ?? '',
  questionType: q?.questionType ?? 'multiple_choice',
  questionText: q?.questionText ?? '',
  difficulty: q?.difficulty ?? 'medium',
  marks: String(q?.marks ?? 1),
  negativeMarks: String(q?.negativeMarks ?? 0),
  explanation: q?.explanation ?? '',
  options: q ? q.options.map((o) => o.text) : ['', '', '', ''],
  correctOption: q
    ? Math.max(
        0,
        q.options.findIndex((o) => o.id === q.correctOptionId),
      )
    : 0,
});

/** Mirrors the API rules; returns field -> message (empty when valid). */
export function validateQuestion(d: QuestionDraft): Record<string, string> {
  const e: Record<string, string> = {};
  if (!d.subjectId) e.subjectId = 'Choose a subject';
  if (!d.questionText.trim()) e.questionText = 'Enter the question';
  const marks = Number(d.marks);
  const neg = Number(d.negativeMarks);
  if (!(marks > 0) || marks > 1000) e.marks = 'Enter marks greater than 0';
  if (!(neg >= 0)) e.negativeMarks = 'Enter 0 or more';
  else if (neg > marks) e.negativeMarks = 'Cannot exceed the marks';
  const opts = d.options.map((o) => o.trim());
  if (opts.some((o) => !o)) e.options = 'Fill in every option (or remove empty ones)';
  else if (new Set(opts.map((o) => o.toLowerCase())).size !== opts.length)
    e.options = 'Options must be different';
  if (d.questionType === 'true_false' && opts.length !== 2)
    e.options = 'True/false has exactly 2 options';
  return e;
}
