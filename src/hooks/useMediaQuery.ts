// PURPOSE: Tells components whether a CSS media query currently matches (e.g. desktop width).
// WHY: The sidebar behaves differently on desktop (collapse) and mobile (drawer).
// DEPENDS ON: window.matchMedia (falls back to false when unavailable, e.g. in tests).

import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const get = () =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false;
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return matches;
}
