// PURPOSE: Light / dark / system mode and the colour theme (prototype Settings › Branding presets), applied as
//          data-theme and data-brand on <html> and remembered on this browser.
// WHY: theme.css already defines every token for both modes and all four presets; this only chooses which applies.
//      Applied before the first render (main.tsx) so the page never flashes in the wrong colours.
// DEPENDS ON: styles/theme.css selectors :root[data-theme], :root[data-brand].

export type Mode = 'light' | 'dark' | 'system';
export type Brand = 'violet' | 'ocean' | 'forest' | 'sunset';
export interface Appearance {
  mode: Mode;
  brand: Brand;
}

export const MODES: Array<{ value: Mode; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];
/** Swatches as in the prototype: accent, light tint, dark. */
export const BRANDS: Array<{ value: Brand; label: string; dots: [string, string, string] }> = [
  { value: 'violet', label: 'Pastel Bento', dots: ['#5B3FD6', '#E5DEFF', '#221D3A'] },
  { value: 'ocean', label: 'Ocean', dots: ['#0B6B8A', '#D3EEF6', '#0B3B4F'] },
  { value: 'forest', label: 'Forest', dots: ['#2D7A4F', '#D9EFD9', '#173B28'] },
  { value: 'sunset', label: 'Sunset', dots: ['#B5471B', '#FFE1D1', '#4A1E10'] },
];

const KEY = 'appearance';
const DEFAULT: Appearance = { mode: 'system', brand: 'violet' };

export function readAppearance(): Appearance {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Appearance>;
    return {
      mode: MODES.some((m) => m.value === v.mode) ? v.mode! : DEFAULT.mode,
      brand: BRANDS.some((b) => b.value === v.brand) ? v.brand! : DEFAULT.brand,
    };
  } catch {
    return DEFAULT;
  }
}

export function applyAppearance(a: Appearance): void {
  const root = document.documentElement;
  if (a.mode === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', a.mode);
  if (a.brand === 'violet') root.removeAttribute('data-brand');
  else root.setAttribute('data-brand', a.brand);
}

/** Has this person picked a colour theme themselves? If not, the organization's theme applies. */
export function hasOwnBrand(): boolean {
  try {
    return Boolean((JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Appearance>).brand);
  } catch {
    return false;
  }
}

/** The organization's theme (Settings › Branding), unless the person chose their own in Appearance. */
export function applyOrgBrand(brand: Brand | undefined): void {
  if (!brand || hasOwnBrand()) return;
  applyAppearance({ ...readAppearance(), brand });
}

export function saveAppearance(a: Appearance): void {
  applyAppearance(a);
  try {
    localStorage.setItem(KEY, JSON.stringify(a));
  } catch {
    /* private window: the choice applies until the page is closed */
  }
}
