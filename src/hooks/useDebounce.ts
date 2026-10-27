// PURPOSE: Delays a fast-changing value (search text) so we do not call the API on every keystroke.
// WHY: Search boxes would otherwise fire a request per character.
// DEPENDS ON: React.

import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}
