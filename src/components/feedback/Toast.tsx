// PURPOSE: Toast notifications (provider + useToast hook) announced to screen readers via aria-live.
// WHY: Save/delete/error feedback must be consistent and non-blocking everywhere.
// DEPENDS ON: components/ui/Icon.tsx. Provider is mounted in app/providers.tsx.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/utils/cn';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';
interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}
interface ToastApi {
  toast: (t: { title: string; description?: string; variant?: ToastVariant }) => void;
}

const Ctx = createContext<ToastApi | null>(null);
const STYLE: Record<ToastVariant, string> = {
  success: 'border-l-success',
  error: 'border-l-error',
  info: 'border-l-primary',
  warning: 'border-l-warning',
};

export function ToastProvider({
  children,
  durationMs = 4500,
}: {
  children: ReactNode;
  durationMs?: number;
}) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(1);
  const dismiss = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const toast = useCallback<ToastApi['toast']>(
    ({ title, description, variant = 'info' }) => {
      const id = next.current++;
      setItems((l) => [
        ...l.slice(-3),
        { id, title, ...(description ? { description } : {}), variant },
      ]);
      setTimeout(() => dismiss(id), durationMs);
    },
    [dismiss, durationMs],
  );
  const api = useMemo(() => ({ toast }), [toast]);
  return (
    <Ctx.Provider value={api}>
      {children}
      <div
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-lg border border-border border-l-4 bg-card p-3 shadow-lg',
              STYLE[t.variant],
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-text">{t.title}</p>
              {t.description && <p className="text-xs text-muted">{t.description}</p>}
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              className="text-muted hover:text-text"
              onClick={() => dismiss(t.id)}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook lives next to its provider on purpose
export function useToast(): ToastApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
