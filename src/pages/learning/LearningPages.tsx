// PURPOSE: The prototype's Learning screens: Live Classes (vLive: Today / Upcoming / Past, Join from 10 minutes before the
//          start), Recorded Classes (vRecorded: video cards) and Materials (vMaterials: grouped by subject).
//          Staff see Add / Edit / Delete; students see their own batch only and Join / Watch / Open.
// WHY: Mounted under /org, /teacher and /student. Add and edit open their own page; delete is confirmed in place.
// DEPENDS ON: features/learning/learning.ts, utils/dates.ts.

import { useState, type ReactNode } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useToast } from '@/components/feedback/Toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageRoot } from '@/components/layout/PageRoot';
import { InlineConfirm } from '@/components/inline/Inline';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { usePermissions } from '@/contexts/PermissionContext';
import { errorText } from '@/features/academic/ui';
import {
  learningService,
  liveState,
  useLearning,
  useLearningMutation,
  type LearningKind,
} from '@/features/learning/learning';
import { cn } from '@/utils/cn';
import { fmtDate, fmtTime } from '@/utils/dates';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TONES = ['lav', 'mint', 'peach', 'sky', 'butter', 'pink'] as const;
const TONE_BG: Record<(typeof TONES)[number], string> = {
  lav: 'bg-lav text-lav-ink',
  mint: 'bg-mint text-mint-ink',
  peach: 'bg-peach text-peach-ink',
  sky: 'bg-sky text-sky-ink',
  butter: 'bg-butter text-butter-ink',
  pink: 'bg-pink text-pink-ink',
};
const pill =
  'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold';
const btn =
  'inline-flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-bold hover:no-underline';
const row = 'flex flex-wrap items-center gap-3 rounded-row bg-row px-3 py-2.5';

/** /org, /teacher or /student: the area the page is mounted in. */
function useBase() {
  const p = useLocation().pathname;
  return p.startsWith('/student') ? '/student' : p.startsWith('/teacher') ? '/teacher' : '/org';
}

function Frame({
  id,
  title,
  description,
  addTo,
  addLabel,
  addTestId,
  ready,
  children,
}: {
  id: `page-${string}`;
  title: string;
  description: string;
  addTo?: string;
  addLabel: string;
  addTestId: string;
  ready: boolean;
  children: ReactNode;
}) {
  return (
    <PageRoot testId={id} ready={ready} className="flex flex-col gap-[18px]">
      <PageHeader
        breadcrumb={[{ label: 'Learning' }, { label: title }]}
        title={title}
        description={description}
        actions={
          addTo && (
            <Link
              to={addTo}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-primary px-[18px] font-bold text-on-primary hover:no-underline"
              data-testid={addTestId}
            >
              <Icon name="plus" size={16} />
              {addLabel}
            </Link>
          )
        }
      />
      {children}
    </PageRoot>
  );
}

/** Edit + Delete (confirmed in place) for one item; nothing for students. */
function StaffActions({
  kind,
  id,
  name,
  editTo,
}: {
  kind: LearningKind;
  id: string;
  name: string;
  editTo: string;
}) {
  const perms = usePermissions();
  const { toast } = useToast();
  const [confirm, setConfirm] = useState(false);
  const remove = useLearningMutation(() => learningService.remove(kind, id));
  if (!perms.can('learning.manage')) return null;
  if (confirm)
    return (
      <InlineConfirm
        open
        testId={`${kind}-delete`}
        title={`Delete ${name}?`}
        message="Students will no longer see it."
        confirmLabel="Delete"
        loading={remove.isPending}
        onCancel={() => setConfirm(false)}
        onConfirm={() =>
          remove.mutate(undefined, {
            onSuccess: () => toast({ title: `${name} deleted`, variant: 'success' }),
            onError: (e) => {
              setConfirm(false);
              toast({ title: 'Could not delete', description: errorText(e), variant: 'error' });
            },
          })
        }
        className="w-full"
      />
    );
  return (
    <>
      <Link to={editTo} className={cn(btn, 'bg-bg text-ink')} data-testid={`${kind}-row-edit-btn`}>
        <Icon name="edit" size={14} />
        Edit
      </Link>
      <button
        type="button"
        className="inline-grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-bg hover:text-ink"
        aria-label={`Delete ${name}`}
        onClick={() => setConfirm(true)}
        data-testid={`${kind}-row-delete-btn`}
      >
        <Icon name="trash" size={16} />
      </button>
    </>
  );
}

// ---------------- Live classes ----------------
/** Join: a link while the class is live, otherwise a disabled button saying when it opens. One locator for both. */
function JoinButton({ link, label = 'Join' }: { link?: string; label?: string }) {
  const live = Boolean(link);
  const Tag = live ? 'a' : 'button';
  return (
    <Tag
      {...(live
        ? { href: link, target: '_blank', rel: 'noopener noreferrer' }
        : {
            type: 'button' as const,
            disabled: true,
            'aria-disabled': true,
            title: 'Opens 10 minutes before start',
          })}
      className={cn(
        btn,
        live ? 'bg-primary text-on-primary' : 'cursor-not-allowed bg-border text-muted',
      )}
      data-testid="live-row-join-btn"
      data-state={live ? 'open' : 'not-yet'}
    >
      {label}
    </Tag>
  );
}

const WHEN = [
  { value: 'today', label: 'Today' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
] as const;

export function LiveClassesPage() {
  const base = useBase();
  const perms = usePermissions();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const when = (WHEN.some((w) => w.value === params.get('when')) ? params.get('when') : 'today')!;
  const q = useLearning('live-classes', { when });
  const [now] = useState(() => Date.now());
  const staff = perms.can('learning.manage');
  const items = q.data?.items ?? [];
  return (
    <Frame
      id="page-live"
      title="Live Classes"
      description={
        staff
          ? 'Schedule classes on Zoom, Google Meet or Teams. Students in the chosen batch see them.'
          : 'Join from here when your class starts. Join opens 10 minutes before the start time.'
      }
      {...(staff ? { addTo: `${base}/live/new` } : {})}
      addLabel="Schedule class"
      addTestId="live-schedule-btn"
      ready={!q.isPending}
    >
      <div
        role="tablist"
        aria-label="When"
        className="flex flex-wrap gap-1.5 self-start rounded-full bg-surface p-[5px]"
      >
        {WHEN.map((w) => (
          <button
            key={w.value}
            type="button"
            role="tab"
            aria-selected={when === w.value}
            onClick={() => setParams(w.value === 'today' ? {} : { when: w.value })}
            className={cn(
              'min-h-[38px] rounded-full px-4 font-bold',
              when === w.value ? 'bg-primary text-on-primary' : 'text-muted',
            )}
            data-testid={`live-tab-${w.value}`}
          >
            {w.label}
          </button>
        ))}
      </div>
      <section
        className="flex flex-col gap-2 rounded-card bg-surface p-[22px]"
        data-testid="live-list"
      >
        {q.isError && <p className="text-danger">{errorText(q.error)}</p>}
        {items.map((l) => {
          const s = l.status === 'cancelled' ? 'cancelled' : liveState(l, now);
          const d = new Date(l.startsAt);
          const hrs = Math.round((d.getTime() - now) / 3_600_000);
          return (
            <div
              key={l.id}
              className={row}
              data-testid="live-row"
              data-entity-id={l.id}
              data-state={s}
            >
              <div
                className={cn(
                  'flex w-16 flex-col items-center rounded-xl py-2 font-extrabold',
                  s === 'live' ? TONE_BG.pink : TONE_BG.lav,
                )}
              >
                <span className="text-[11px]">{MON[d.getMonth()]}</span>
                <span className="text-xl">{d.getDate()}</span>
              </div>
              <span className="min-w-0 flex-[1_1_180px]">
                <b>{l.title}</b>
                <span className="block text-xs text-muted">
                  {fmtTime(l.startsAt)} · {l.durationMinutes} min · {l.subjectName ?? 'No subject'}{' '}
                  · {l.batchName}
                  {l.teacherName ? ` · ${l.teacherName}` : ''} · {l.platform}
                </span>
              </span>
              {s === 'cancelled' ? (
                <span className={cn(pill, 'bg-bg text-muted')}>Cancelled</span>
              ) : s === 'live' ? (
                <>
                  <span
                    className={cn(pill, 'bg-danger-bg text-danger')}
                    data-testid="live-row-live-badge"
                  >
                    ● Live now
                  </span>
                  <JoinButton link={l.meetingLink} />
                </>
              ) : s === 'upcoming' ? (
                <JoinButton
                  label={`Join · in ${hrs < 24 ? `${Math.max(1, hrs)} h` : `${Math.round(hrs / 24)} days`}`}
                />
              ) : l.hasRecording ? (
                <Link
                  to={`${base}/recorded`}
                  className={cn(btn, 'bg-bg text-ink')}
                  data-testid="live-row-recording-link"
                >
                  <Icon name="play" size={14} />
                  Recording
                </Link>
              ) : staff ? (
                <Link
                  to={`${base}/recorded/new?liveClass=${l.id}`}
                  className={cn(btn, 'bg-lav text-lav-ink')}
                  data-testid="live-row-add-recording-btn"
                >
                  Add recording
                </Link>
              ) : (
                <span className="text-xs font-semibold text-muted">Recording not added yet</span>
              )}
              {staff && s !== 'past' && (
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<Icon name="link" size={14} />}
                  onClick={() =>
                    void navigator.clipboard
                      ?.writeText(l.meetingLink)
                      .then(() => toast({ title: 'Meeting link copied', variant: 'success' }))
                      .catch(() => toast({ title: l.meetingLink, variant: 'info' }))
                  }
                  data-testid="live-row-copy-link-btn"
                >
                  Copy link
                </Button>
              )}
              <StaffActions
                kind="live-classes"
                id={l.id}
                name={l.title}
                editTo={`${base}/live/${l.id}/edit`}
              />
            </div>
          );
        })}
        {!q.isPending && !items.length && (
          <div
            className="flex flex-col items-center gap-2 py-7 text-center text-muted"
            data-testid="live-empty"
          >
            <b className="text-ink">No classes {when === 'today' ? 'today' : when}</b>
            {staff ? 'Use “Schedule class” to add one.' : 'Your teacher schedules classes here.'}
          </div>
        )}
      </section>
    </Frame>
  );
}

// ---------------- Recorded classes ----------------
export function RecordedPage() {
  const base = useBase();
  const perms = usePermissions();
  const q = useLearning('recordings');
  const staff = perms.can('learning.manage');
  const items = q.data?.items ?? [];
  return (
    <Frame
      id="page-recorded"
      title="Recorded Classes"
      description={
        staff
          ? 'Add YouTube, Vimeo or Drive links. Only the chosen batch can watch.'
          : 'Watch at your own pace.'
      }
      {...(staff ? { addTo: `${base}/recorded/new` } : {})}
      addLabel="Add recording"
      addTestId="recorded-add-btn"
      ready={!q.isPending}
    >
      {q.isError && <p className="text-danger">{errorText(q.error)}</p>}
      <section
        className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]"
        data-testid="recorded-grid"
      >
        {items.map((r, i) => (
          <article
            key={r.id}
            className="flex flex-col gap-2.5 rounded-card bg-surface p-3.5"
            data-testid="recorded-card"
            data-entity-id={r.id}
            data-state={r.status}
          >
            <a
              href={r.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'grid aspect-video place-items-center rounded-[18px]',
                TONE_BG[TONES[i % TONES.length]!],
              )}
              aria-label={`Watch ${r.title}`}
              data-testid="recorded-card-thumb-link"
            >
              <Icon name="play" size={44} />
            </a>
            <div>
              <b className="block">{r.title}</b>
              <span className="text-xs font-semibold text-muted">
                {r.subjectName ?? 'No subject'}
                {r.duration ? ` · ${r.duration}` : ''}
                {staff ? ` · ${r.batchName}` : ''}
                {r.status === 'draft' ? ' · Draft' : ''}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <a
                href={r.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(btn, 'bg-lav text-lav-ink')}
                data-testid="recorded-card-watch-btn"
              >
                <Icon name="play" size={14} />
                Watch
              </a>
              <StaffActions
                kind="recordings"
                id={r.id}
                name={r.title}
                editTo={`${base}/recorded/${r.id}/edit`}
              />
            </div>
          </article>
        ))}
      </section>
      {!q.isPending && !items.length && (
        <div
          className="flex flex-col items-center gap-2 rounded-card bg-surface py-7 text-center text-muted"
          data-testid="recorded-empty"
        >
          <b className="text-ink">No recordings yet</b>
        </div>
      )}
    </Frame>
  );
}

// ---------------- Materials ----------------
export function MaterialsPage() {
  const base = useBase();
  const perms = usePermissions();
  const q = useLearning('materials');
  const staff = perms.can('learning.manage');
  const items = q.data?.items ?? [];
  const groups = new Map<string, typeof items>();
  for (const m of items) {
    const k = m.subjectName ?? 'General';
    groups.set(k, [...(groups.get(k) ?? []), m]);
  }
  return (
    <Frame
      id="page-materials"
      title="Materials"
      description={
        staff
          ? 'Share notes, slides and papers (as links) with a batch. They are filed by subject.'
          : 'Notes, slides and papers shared with your batch.'
      }
      {...(staff ? { addTo: `${base}/materials/new` } : {})}
      addLabel="Add material"
      addTestId="materials-add-btn"
      ready={!q.isPending}
    >
      {q.isError && <p className="text-danger">{errorText(q.error)}</p>}
      {[...groups.entries()].map(([subject, list]) => (
        <section
          key={subject}
          className="flex flex-col gap-2 rounded-card bg-surface p-[22px]"
          data-testid="materials-subject-group"
          data-value={subject}
        >
          <h2 className="font-display text-lg font-extrabold">
            {subject}{' '}
            <span className="text-[13px] font-medium text-muted">{list.length} files</span>
          </h2>
          {list.map((m) => (
            <div
              key={m.id}
              className={row}
              data-testid="material-row"
              data-entity-id={m.id}
              data-state={m.status}
            >
              <span
                className={cn(
                  'grid h-[38px] w-[38px] shrink-0 place-items-center rounded-xl text-[10px] font-extrabold',
                  TONE_BG.pink,
                )}
              >
                {m.materialType.slice(0, 4).toUpperCase()}
              </span>
              <span className="min-w-0 flex-[1_1_180px]">
                <b>{m.title}</b>
                <span className="block text-xs text-muted">
                  {m.materialType} · added {fmtDate(m.createdAt)}
                  {staff ? ` · ${m.batchName}` : ''}
                  {m.status === 'draft' ? ' · Draft' : ''}
                </span>
              </span>
              <a
                href={m.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(btn, 'bg-bg text-ink')}
                data-testid="material-row-open-btn"
              >
                <Icon name="eye" size={14} />
                Open
              </a>
              {!m.allowDownload && (
                <span
                  className={cn(pill, 'bg-bg text-ink')}
                  data-testid="material-row-view-only-badge"
                >
                  View only
                </span>
              )}
              <StaffActions
                kind="materials"
                id={m.id}
                name={m.title}
                editTo={`${base}/materials/${m.id}/edit`}
              />
            </div>
          ))}
        </section>
      ))}
      {!q.isPending && !items.length && (
        <div
          className="flex flex-col items-center gap-2 rounded-card bg-surface py-7 text-center text-muted"
          data-testid="materials-empty"
        >
          <b className="text-ink">No materials yet</b>
        </div>
      )}
    </Frame>
  );
}
