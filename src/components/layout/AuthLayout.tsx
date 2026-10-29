// PURPOSE: Frame for login / sign-up / password / verification pages, as in the prototype (.auth, .auth-card): a dark
//          hero ("Learn. Practice. Achieve more.") beside the form, wrapping under it on narrow screens.
// WHY: All authentication pages look and behave the same; one h1 per page (the form title), the hero is decoration.
// DEPENDS ON: lib/constants.ts, components/ui/Icon.tsx, theme tokens (hero / on-hero).

import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';
import { APP_NAME } from '@/lib/constants';
import { cn } from '@/utils/cn';

const FEATURES: Array<{ icon: IconName; title: string; text: string }> = [
  { icon: 'file', title: 'Take online exams', text: 'Timed, auto-saved, scored on the server' },
  {
    icon: 'video',
    title: 'Live & recorded classes',
    text: 'Join from your timetable, rewatch anytime',
  },
  { icon: 'trophy', title: 'Track your progress', text: 'Ranks and topic-wise reports' },
];

function Hero() {
  return (
    <aside className="flex flex-[1_1_360px] flex-col justify-between gap-7 bg-hero p-10 text-on-hero">
      <div className="flex items-center gap-2.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-on-hero/[.12]">
          <Icon name="book" size={20} />
        </span>
        <div>
          <b className="block font-display text-base font-extrabold">{APP_NAME}</b>
          <span className="text-xs text-hero-muted">Examination &amp; Assessment Platform</span>
        </div>
      </div>
      <p
        aria-hidden="true"
        className="font-display text-[clamp(34px,5vw,54px)] font-extrabold leading-[1.02] tracking-[-0.03em]"
      >
        Learn.
        <br />
        Practice.
        <br />
        <em className="not-italic text-hero-muted">Achieve more.</em>
      </p>
      <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
        {FEATURES.map((f) => (
          <li key={f.title} className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-on-hero/[.12]">
              <Icon name={f.icon} size={18} />
            </span>
            <div>
              <b className="block">{f.title}</b>
              <small className="block text-hero-muted">{f.text}</small>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  wide,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Longer forms (sign-up) give the form more room than the hero. */
  wide?: boolean;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-6">
      <div className="flex w-full max-w-[1080px] flex-wrap overflow-hidden rounded-[32px] bg-surface">
        <Hero />
        <main
          className={cn(
            'flex min-w-0 flex-col justify-center gap-4 p-10',
            wide ? 'flex-[1.4_1_420px]' : 'flex-[1_1_360px]',
          )}
        >
          <div>
            <h1 className="font-display text-[30px] font-extrabold tracking-[-0.02em]">{title}</h1>
            {subtitle && <p className="mt-1.5 text-muted">{subtitle}</p>}
          </div>
          {children}
          {footer && <p className="m-0 text-center text-muted">{footer}</p>}
        </main>
      </div>
    </div>
  );
}
