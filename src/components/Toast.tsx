import React from 'react';
import { ShoppingBag, CheckCircle2, Sparkles, X, AlertTriangle } from 'lucide-react';

export interface ToastData {
  id?: string;
  type?: 'cart' | 'order' | 'info' | 'error' | 'success';
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastProps {
  toast: ToastData | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  if (!toast) return null;

  const isCart = toast.type === 'cart';
  const isOrder = toast.type === 'order' || toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <aside
      aria-label="Notification"
      aria-live="polite"
      className="fixed bottom-20 sm:bottom-6 left-4 sm:left-6 z-[10001] max-w-sm w-[calc(100vw-2rem)] sm:w-full transition-all duration-200"
    >
      <div
        className="p-4 rounded-xl shadow-2xl border backdrop-blur-md flex items-start gap-3 transition-colors"
        style={{
          backgroundColor: isError
            ? 'var(--error-bg)'
            : isOrder
            ? 'var(--success-bg)'
            : 'var(--surface)',
          borderColor: isError
            ? 'var(--error-border)'
            : isOrder
            ? 'var(--success-border)'
            : 'var(--primary)',
          color: isError
            ? 'var(--error-text)'
            : isOrder
            ? 'var(--success-text)'
            : 'var(--text-main)',
        }}
      >
        <div className="shrink-0 mt-0.5">
          {isCart && (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--secondary)', color: 'var(--primary)' }}
            >
              <ShoppingBag className="w-4 h-4" />
            </div>
          )}
          {isOrder && (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success-text)' }}
            >
              <CheckCircle2 className="w-4 h-4" />
            </div>
          )}
          {isError && (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--error-bg)', color: 'var(--error-text)' }}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          )}
          {!isCart && !isOrder && !isError && (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--secondary)', color: 'var(--accent)' }}
            >
              <Sparkles className="w-4 h-4" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 pr-1">
          {toast.title && (
            <h4 className="font-serif text-sm font-semibold tracking-wide mb-0.5">
              {toast.title}
            </h4>
          )}
          <p className="text-xs leading-relaxed font-sans opacity-90">
            {toast.message}
          </p>

          {toast.actionLabel && toast.onAction && (
            <button
              type="button"
              onClick={() => {
                toast.onAction?.();
                onClose();
              }}
              className="mt-2 text-xs font-semibold underline underline-offset-2 flex items-center gap-1 cursor-pointer"
              style={{ color: 'var(--primary)' }}
            >
              <span>{toast.actionLabel}</span>
              <span>→</span>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss notification"
          className="shrink-0 p-1 rounded transition-opacity opacity-70 hover:opacity-100 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
