// PURPOSE: Maps Tailwind utility classes to the theme CSS variables.
// WHY: Colours are defined once in src/styles/theme.css, so a re-brand never touches components.
// DEPENDS ON: src/styles/theme.css. Used by PostCSS during dev and build.

import type { Config } from 'tailwindcss';

// color-mix keeps opacity modifiers working (bg-primary/10) while the colour itself stays a single CSS variable.
const token = (name: string) =>
  `color-mix(in srgb, var(--color-${name}) calc(<alpha-value> * 100%), transparent)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: token('primary'),
        secondary: token('secondary'),
        background: token('background'),
        card: token('card'),
        text: token('text'),
        muted: token('muted'),
        success: token('success'),
        warning: token('warning'),
        error: token('error'),
        border: token('border'),
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
      },
      borderRadius: { card: '12px' },
      // spacing (not just width) so both w-sidebar and the content offset lg:pl-sidebar exist
      spacing: { sidebar: '236px' },
    },
  },
  plugins: [],
} satisfies Config;
