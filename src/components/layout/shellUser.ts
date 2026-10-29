// PURPOSE: The signed-in person shown by the shell (sidebar footer) and every page header (user pill).
// WHY: Page headers are shared components; they read the user from here instead of depending on the auth context.
// DEPENDS ON: React context. Provided by AppShell.

import { createContext, useContext } from 'react';

export interface ShellUser {
  name: string;
  email?: string;
  /** "Owner", "Teacher", "Student · B.Tech Sec A" … */
  role?: string;
}

export const ShellUserContext = createContext<ShellUser | null>(null);

export const useShellUser = (): ShellUser | null => useContext(ShellUserContext);
