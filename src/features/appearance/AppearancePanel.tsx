// PURPOSE: The "Appearance" control in the sidebar: mode pills (Light / Dark / System) and the four colour themes.
// WHY: Opens in place under its button (no pop-up). Changes apply immediately and are remembered on this browser.
// DEPENDS ON: appearance.ts, ui/Icon.tsx.

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/utils/cn';
import { BRANDS, MODES, readAppearance, saveAppearance, type Appearance } from './appearance';

export function AppearancePanel() {
  const [open, setOpen] = useState(false);
  const [a, setA] = useState<Appearance>(readAppearance);
  const set = (next: Partial<Appearance>) => {
    const v = { ...a, ...next };
    setA(v);
    saveAppearance(v);
  };
  return (
    <div className="flex flex-col gap-2" data-testid="appearance">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="appearance-panel"
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-[38px] w-full items-center gap-2.5 rounded-xl px-3 text-[13px] font-semibold text-muted hover:bg-bg hover:text-ink"
        data-testid="appearance-toggle-btn"
      >
        <Icon name={a.mode === 'dark' ? 'moon' : 'sun'} size={16} />
        <span className="flex-1 text-left">Appearance</span>
        <Icon name={open ? 'chevronDown' : 'chevronRight'} size={14} />
      </button>
      {open && (
        <div id="appearance-panel" className="flex flex-col gap-3 rounded-row bg-row p-3">
          <div
            role="radiogroup"
            aria-label="Mode"
            className="flex gap-1 rounded-full bg-surface p-1"
            data-testid="appearance-mode"
          >
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={a.mode === m.value}
                onClick={() => set({ mode: m.value })}
                className={cn(
                  'min-h-[32px] flex-1 rounded-full text-xs font-bold',
                  a.mode === m.value ? 'bg-primary text-on-primary' : 'text-muted',
                )}
                data-testid="appearance-mode-radio"
                data-value={m.value}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div
            role="radiogroup"
            aria-label="Colour theme"
            className="grid grid-cols-2 gap-2"
            data-testid="appearance-theme"
          >
            {BRANDS.map((b) => (
              <button
                key={b.value}
                type="button"
                role="radio"
                aria-checked={a.brand === b.value}
                onClick={() => set({ brand: b.value })}
                className={cn(
                  'flex flex-col items-start gap-1.5 rounded-xl border-2 bg-surface-2 p-2 text-left text-xs font-bold',
                  a.brand === b.value ? 'border-focus' : 'border-border',
                )}
                data-testid="appearance-theme-option"
                data-value={b.value}
              >
                <span className="flex gap-1">
                  {b.dots.map((c) => (
                    <i key={c} className="block h-4 w-4 rounded-full" style={{ background: c }} />
                  ))}
                </span>
                {b.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
