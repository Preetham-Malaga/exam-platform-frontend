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
const MIN_TOAST_MS = 4000;
const STYLE: Record<ToastVariant, string> = {
  success: 'bg-primary text-on-primary',
  error: 'bg-danger text-surface',
  info: 'bg-primary text-on-primary',
  warning: 'bg-primary text-on-primary',
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
      // Never shorter than 4 s, so people (and automated tests) can read and assert it before it goes.
      setTimeout(() => dismiss(id), Math.max(MIN_TOAST_MS, durationMs));
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
        data-testid="toast-region"
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            data-testid={`toast-${t.variant}`}
            data-state={t.variant}
            className={cn(
              'pointer-events-auto flex items-center gap-3 rounded-2xl px-3.5 py-3 font-semibold shadow-[0_10px_30px_rgba(0,0,0,.18)]',
              STYLE[t.variant],
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm" data-testid="toast-title">
                {t.title}
              </p>
              {t.description && (
                <p className="text-xs font-medium opacity-85" data-testid="toast-description">
                  {t.description}
                </p>
              )}
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              data-testid="toast-close-btn"
              className="opacity-80 hover:opacity-100"
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
