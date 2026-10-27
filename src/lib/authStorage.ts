// PURPOSE: Where supabase-js keeps the session: localStorage ("Remember me") or sessionStorage (ends with the tab).
// WHY: The login screen's "Remember me" must really change how long you stay signed in on a shared computer.
// DEPENDS ON: Nothing. Used by lib/supabaseClient.ts (auth.storage) and the login page.

const PREF = 'ep.rememberMe';

const safe = (pick: () => Storage): Storage | null => {
  try {
    return pick();
  } catch {
    return null; // storage disabled (private mode, blocked cookies)
  }
};
const local = () => safe(() => window.localStorage);
const session = () => safe(() => window.sessionStorage);

/** Remembered unless the user unticked "Remember me" at their last sign-in. */
export const getRememberMe = (): boolean => local()?.getItem(PREF) !== 'false';

/** Call before signing in: the session that sign-in saves goes to the chosen storage. */
export function setRememberMe(remember: boolean): void {
  local()?.setItem(PREF, String(remember));
}

/** supabase-js storage adapter: writes to the chosen storage and keeps the other one clean. */
export const authStorage = {
  getItem(key: string): string | null {
    return session()?.getItem(key) ?? local()?.getItem(key) ?? null;
  },
  setItem(key: string, value: string): void {
    const [target, other] = getRememberMe() ? [local(), session()] : [session(), local()];
    target?.setItem(key, value);
    other?.removeItem(key);
  },
  removeItem(key: string): void {
    local()?.removeItem(key);
    session()?.removeItem(key);
  },
};
