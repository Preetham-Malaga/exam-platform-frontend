// PURPOSE: Split-screen frame for sign-in / sign-up / password / verification pages: a branded hero on the left
//          (desktop only) and the form card on the right.
// WHY: All authentication pages look and behave the same; one h1 per page (the card title), the hero is decoration.
// DEPENDS ON: lib/constants.ts, components/ui/Icon.tsx, AuthIllustration.tsx.

import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';
import { APP_NAME } from '@/lib/constants';
import { AuthIllustration } from './AuthIllustration';

const FEATURES: Array<{ icon: IconName; title: string; text: string }> = [
  { icon: 'clipboard', title: 'Take Online Exams', text: 'Anytime, Anywhere' },
  { icon: 'chart', title: 'Track Your Progress', text: 'Detailed Analytics' },
  { icon: 'trophy', title: 'Achieve Your Goals', text: 'Build a Brighter Future' },
];

function Brand({ light }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${light ? 'bg-white/15 text-white' : 'bg-primary text-white'}`}
      >
        <Icon name="cap" size={24} />
      </span>
      <span>
        <span
          className={`block text-lg font-bold leading-tight ${light ? 'text-white' : 'text-text'}`}
        >
          {APP_NAME}
        </span>
        <span className={`block text-xs ${light ? 'text-white/75' : 'text-muted'}`}>
          Examination &amp; Assessment Platform
        </span>
      </span>
    </div>
  );
}

function Hero() {
  return (
    <aside className="relative hidden overflow-hidden bg-[linear-gradient(135deg,#3439a8_0%,#5a5fe0_50%,#9a9cf2_100%)] p-10 text-white lg:flex lg:flex-col xl:p-12">
      {/* soft light blobs */}
      <span className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
      <span className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-white/10 blur-3xl" />

      <Brand light />
      <div className="relative mt-10 grid flex-1 items-center gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <p className="text-[40px] font-extrabold leading-[1.1] tracking-tight 2xl:text-[50px]">
            Learn.
            <br />
            Practice.
            <br />
            <span className="whitespace-nowrap bg-gradient-to-r from-[#a5d8ff] to-[#e5dbff] bg-clip-text text-transparent">
              Achieve More.
            </span>
          </p>
          <p className="mt-5 max-w-sm text-base text-white/85">
            Your complete platform for creating, managing and taking online exams with ease and
            confidence.
          </p>
          <ul className="mt-8 grid gap-4">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <Icon name={f.icon} size={20} />
                </span>
                <span>
                  <span className="block font-semibold">{f.title}</span>
                  <span className="block text-xs text-white/75">{f.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <AuthIllustration className="hidden w-full max-w-[520px] justify-self-center xl:block" />
      </div>
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
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="min-h-screen bg-[#eceefb] lg:p-6">
      <div className="mx-auto grid min-h-screen max-w-[1440px] grid-cols-1 overflow-hidden bg-[#f5f6fd] lg:min-h-[calc(100vh-3rem)] lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:rounded-[28px] lg:shadow-xl">
        <Hero />
        <div className="flex min-w-0 items-center justify-center px-4 py-10 sm:px-8">
          <main
            className={`w-full ${wide ? 'max-w-xl' : 'max-w-md'} rounded-2xl border border-border/60 bg-card p-6 shadow-lg sm:p-10`}
          >
            <div className="mb-6 flex justify-center lg:hidden">
              <Brand />
            </div>
            <h1 className="text-center text-[28px] font-bold text-text">{title}</h1>
            {subtitle && <p className="mt-1.5 text-center text-sm text-muted">{subtitle}</p>}
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
          </main>
        </div>
      </div>
    </div>
  );
}
