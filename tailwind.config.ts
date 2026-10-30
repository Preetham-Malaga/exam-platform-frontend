// PURPOSE: Maps Tailwind utility classes to the prototype's CSS variables (src/styles/theme.css).
// WHY: Colours, radii and the font are defined once, so a theme or brand change never touches components.
// DEPENDS ON: src/styles/theme.css. Used by PostCSS during dev and build.

import type { Config } from 'tailwindcss';

// color-mix keeps opacity modifiers working (bg-primary/10) while the colour itself stays a single CSS variable.
const v = (name: string) =>
  `color-mix(in srgb, var(--${name}) calc(<alpha-value> * 100%), transparent)`;
const PASTELS = ['lav', 'mint', 'peach', 'sky', 'butter', 'pink'] as const;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // prototype tokens
        bg: v('bg'),
        surface: v('surface'),
        'surface-2': v('surface-2'),
        row: v('row'),
        ink: v('ink'),
        accent: v('accent'),
        focus: v('focus'),
        'on-primary': v('on-primary'),
        hero: v('hero'),
        'on-hero': v('on-hero'),
        'hero-muted': v('hero-muted'),
        danger: v('danger'),
        'danger-bg': v('danger-bg'),
        dash: v('dash'),
        bar: v('bar'),
        'bar-peak': v('bar-peak'),
        ...Object.fromEntries(
          PASTELS.flatMap((p) => [
            [p, v(p)],
            [`${p}-ink`, v(`${p}-ink`)],
          ]),
        ),
        // names used by screens built before the prototype (theme.css points them at the tokens)
        primary: v('color-primary'),
        secondary: v('color-secondary'),
        background: v('color-background'),
        card: v('color-card'),
        text: v('color-text'),
        muted: v('color-muted'),
        success: v('color-success'),
        warning: v('color-warning'),
        error: v('color-error'),
        border: v('color-border'),
      },
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        display: ['var(--display)'],
      },
      borderRadius: { card: '28px', tile: '24px', row: '18px', input: '14px' },
      // spacing (not just width) so both w-sidebar and the content offset exist
      spacing: { sidebar: '260px' },
    },
  },
  plugins: [],
} satisfies Config;
