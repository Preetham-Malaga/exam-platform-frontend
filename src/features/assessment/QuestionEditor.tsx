// PURPOSE: Create / edit form (shown in the page) for an objective question: subject, topic, type, text, 2-6 options with the correct one,
//          marks, negative marks, difficulty and explanation; "Save as draft" or "Save and publish".
// WHY: The same rules as the API (true/false has 2 options, the answer must be an option, options differ) are checked
//      here first so the teacher sees them next to the field.
// DEPENDS ON: features/academic/hooks.ts (subjects, topics), features/assessment/hooks.ts, shared form components.

import { useState } from 'react';
import { useToast } from '@/components/feedback/Toast';
import { Input, Select, Textarea } from '@/components/forms/Form';
import { InlinePanel } from '@/components/inline/Inline';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { usePermissions } from '@/contexts/PermissionContext';
import { useSubjects, useTopics } from '@/features/academic/hooks';
import { errorText } from '@/features/academic/ui';
import { questionService } from '@/services/assessmentService';
import type { Difficulty, Question, QuestionBody, QuestionType } from '@/types/assessment';
import { draftFromQuestion, validateQuestion, type QuestionDraft as Draft } from './questionRules';
import { useAssessmentMutation, useQuestion } from './hooks';

function Editor({
  question,
  defaultSubject,
  onClose,
  className,
}: {
  question: Question | null;
  defaultSubject: string;
  onClose: () => void;
  className?: string;
}) {
  const { toast } = useToast();
  const perms = usePermissions();
  const [d, setD] = useState<Draft>(() => draftFromQuestion(question, defaultSubject));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const subjects = useSubjects({ page: 1, pageSize: 100, sort: 'name', status: 'active' });
  const topics = useTopics(
    { page: 1, pageSize: 100, subjectId: d.subjectId },
    Boolean(d.subjectId),
  );
  const save = useAssessmentMutation((v: { body: QuestionBody; publish: boolean }) =>
    question
      ? questionService.update(question.id, v.body)
      : questionService.create({ ...v.body, publish: v.publish }),
  );
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setD((p) => ({ ...p, [key]: value }));
  const setType = (t: QuestionType) =>
    setD((p) => ({
      ...p,
      questionType: t,
      options:
        t === 'true_false'
          ? ['True', 'False']
          : p.options.length >= 2
            ? p.options
            : ['', '', '', ''],
      correctOption: Math.min(p.correctOption, t === 'true_false' ? 1 : 5),
    }));

  const submit = (publish: boolean) => {
    const e = validateQuestion(d);
    setErrors(e);
    if (Object.keys(e).length) return;
    save.mutate(
      {
        publish,
        body: {
          subjectId: d.subjectId,
          topicId: d.topicId || null,
          questionType: d.questionType,
          questionText: d.questionText.trim(),
          difficulty: d.difficulty,
          marks: Number(d.marks),
          negativeMarks: Number(d.negativeMarks),
          explanation: d.explanation.trim() || null,
          options: d.options.map((o) => o.trim()),
          correctOption: d.correctOption,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: question ? 'Question saved' : publish ? 'Question published' : 'Draft saved',
            variant: 'success',
          });
          onClose();
        },
        onError: (err) =>
          toast({
            title: 'Could not save the question',
            description: errorText(err),
            variant: 'error',
          }),
      },
    );
  };

  const subjectOptions = (subjects.data?.items ?? []).map((s) => ({
    value: s.id,
    label: `${s.name} (${s.code})`,
  }));
  const topicOptions = (topics.data?.items ?? []).map((t) => ({ value: t.id, label: t.name }));
  return (
    <InlinePanel
      open
      onClose={onClose}
      title={question ? 'Edit question' : 'New question'}
      testId="question-editor"
      {...(className ? { className } : {})}
      footer={
        <>
          <Button variant="outline" onClick={onClose} data-testid="question-editor-cancel-btn">
            Cancel
          </Button>
          {question ? (
            <Button
              loading={save.isPending}
              onClick={() => submit(false)}
              data-testid="question-editor-save-btn"
            >
              Save
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                loading={save.isPending}
                onClick={() => submit(false)}
                data-testid="question-editor-save-draft-btn"
              >
                Save as draft
              </Button>
              {perms.can('question.publish') && (
                <Button
                  loading={save.isPending}
                  onClick={() => submit(true)}
                  data-testid="question-editor-save-publish-btn"
                >
                  Save and publish
                </Button>
              )}
            </>
          )}
        </>
      }
    >
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Subject"
            required
            placeholder="Choose a subject"
            value={d.subjectId}
            options={subjectOptions}
            error={errors.subjectId}
            data-testid="question-editor-subject-select"
            onChange={(e) => setD((p) => ({ ...p, subjectId: e.target.value, topicId: '' }))}
          />
          <Select
            label="Topic"
            placeholder="No topic"
            value={d.topicId}
            options={topicOptions}
            disabled={!d.subjectId}
            data-testid="question-editor-topic-select"
            onChange={(e) => set('topicId', e.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Type"
            value={d.questionType}
            options={[
              { value: 'multiple_choice', label: 'Multiple choice' },
              { value: 'true_false', label: 'True / false' },
            ]}
            data-testid="question-editor-type-select"
            onChange={(e) => setType(e.target.value as QuestionType)}
          />
          <Select
            label="Difficulty"
            value={d.difficulty}
            options={[
              { value: 'easy', label: 'Easy' },
              { value: 'medium', label: 'Medium' },
              { value: 'hard', label: 'Hard' },
            ]}
            data-testid="question-editor-difficulty-select"
            onChange={(e) => set('difficulty', e.target.value as Difficulty)}
          />
        </div>
        <Textarea
          label="Question"
          required
          rows={3}
          value={d.questionText}
          error={errors.questionText}
          data-testid="question-editor-text-textarea"
          onChange={(e) => set('questionText', e.target.value)}
        />
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-[13px] font-medium text-text">
            Options <span className="font-normal text-muted">(select the correct answer)</span>
          </legend>
          {d.options.map((opt, i) => (
            <div
              key={i}
              className="flex items-center gap-2"
              data-testid="question-editor-option"
              data-entity-id={String(i + 1)}
              data-selected={d.correctOption === i}
            >
              <input
                type="radio"
                name="correct-option"
                data-testid={`question-editor-option-correct-radio-${i + 1}`}
                className="h-4 w-4 accent-primary"
                aria-label={`Option ${i + 1} is correct`}
                checked={d.correctOption === i}
                onChange={() => set('correctOption', i)}
              />
              <input
                className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/40"
                aria-label={`Option ${i + 1}`}
                name={`option-${i + 1}`}
                data-testid={`question-editor-option-input-${i + 1}`}
                value={opt}
                readOnly={d.questionType === 'true_false'}
                onChange={(e) =>
                  set(
                    'options',
                    d.options.map((o, j) => (j === i ? e.target.value : o)),
                  )
                }
              />
              {d.questionType === 'multiple_choice' && d.options.length > 2 && (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove option ${i + 1}`}
                  data-testid={`question-editor-option-remove-btn-${i + 1}`}
                  onClick={() =>
                    setD((p) => ({
                      ...p,
                      options: p.options.filter((_, j) => j !== i),
                      correctOption:
                        p.correctOption === i
                          ? 0
                          : p.correctOption > i
                            ? p.correctOption - 1
                            : p.correctOption,
                    }))
                  }
                >
                  <Icon name="trash" size={16} />
                </Button>
              )}
            </div>
          ))}
          {errors.options && (
            <p
              role="alert"
              className="text-xs text-error"
              data-testid="question-editor-options-error"
            >
              {errors.options}
            </p>
          )}
          {d.questionType === 'multiple_choice' && d.options.length < 6 && (
            <Button
              variant="ghost"
              size="sm"
              className="justify-self-start"
              leftIcon={<Icon name="plus" size={16} />}
              onClick={() => set('options', [...d.options, ''])}
              data-testid="question-editor-add-option-btn"
            >
              Add option
            </Button>
          )}
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Marks"
            type="number"
            min={0}
            step="0.5"
            value={d.marks}
            error={errors.marks}
            data-testid="question-editor-marks-input"
            onChange={(e) => set('marks', e.target.value)}
          />
          <Input
            label="Negative marks"
            type="number"
            min={0}
            step="0.25"
            hint="Deducted for a wrong answer."
            value={d.negativeMarks}
            error={errors.negativeMarks}
            data-testid="question-editor-negative-marks-input"
            onChange={(e) => set('negativeMarks', e.target.value)}
          />
        </div>
        <Textarea
          label="Explanation"
          rows={2}
          hint="Shown to students after the exam when the exam allows it."
          value={d.explanation}
          data-testid="question-editor-explanation-textarea"
          onChange={(e) => set('explanation', e.target.value)}
        />
      </div>
    </InlinePanel>
  );
}

/** Opens for a new question (questionId = null) or loads and edits an existing one. Shown in the page. */
export function QuestionEditor({
  open,
  questionId,
  defaultSubject,
  onClose,
  className,
}: {
  open: boolean;
  questionId: string | null;
  defaultSubject: string;
  onClose: () => void;
  className?: string;
}) {
  const extra = className ? { className } : {};
  const existing = useQuestion(open ? questionId : null);
  if (!open) return null;
  if (!questionId)
    return (
      <Editor
        key="new"
        question={null}
        defaultSubject={defaultSubject}
        onClose={onClose}
        {...extra}
      />
    );
  if (existing.isError)
    return (
      <InlinePanel open onClose={onClose} title="Edit question" testId="question-editor" {...extra}>
        <p role="alert" className="text-sm text-error" data-testid="question-editor-load-error">
          {errorText(existing.error)}
        </p>
      </InlinePanel>
    );
  if (!existing.data) return null;
  return (
    <Editor
      key={`${questionId}:${existing.dataUpdatedAt}`}
      question={existing.data}
      defaultSubject={defaultSubject}
      onClose={onClose}
      {...extra}
    />
  );
}
