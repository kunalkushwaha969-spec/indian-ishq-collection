import React, { useState, useEffect } from 'react';
import { ShoppingBag, CheckCircle2, Sparkles, X, AlertTriangle } from 'lucide-react';
import { useAnimatedMount } from '../utils/useAnimatedMount';

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
  const [renderedToast, setRenderedToast] = useState<ToastData | null>(toast);
  const { shouldRender, isEntered } = useAnimatedMount(Boolean(toast), 240);

  useEffect(() => {
    if (toast) {
      setRenderedToast(toast);
    }
  }, [toast]);

  if (!shouldRender || !renderedToast) return null;

  const isCart = renderedToast.type === 'cart';
  const isOrder = renderedToast.type === 'order' || renderedToast.type === 'success';
  const isError = renderedToast.type === 'error';

  return (
    <aside
      aria-label="Notification"
      aria-live="polite"
      className={`fixed bottom-20 sm:bottom-6 left-4 sm:left-6 z-[10001] max-w-sm w-[calc(100vw-2rem)] sm:w-full transition-all duration-240 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isEntered
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-3 scale-[0.98] pointer-events-none'
      }`}
    >
      <div
        className="p-4 rounded-xl shadow-2xl border backdrop-blur-md flex items-start gap-3 transition-colors duration-200"
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
          {renderedToast.title && (
            <h4 className="font-serif text-sm font-semibold tracking-wide mb-0.5">
              {renderedToast.title}
            </h4>
          )}
          <p className="text-xs leading-relaxed font-sans opacity-90">
            {renderedToast.message}
          </p>

          {renderedToast.actionLabel && renderedToast.onAction && (
            <button
              type="button"
              onClick={() => {
                renderedToast.onAction?.();
                onClose();
              }}
              className="mt-2 text-xs font-semibold underline underline-offset-2 flex items-center gap-1 cursor-pointer transition-opacity hover:opacity-80"
              style={{ color: 'var(--primary)' }}
            >
              <span>{renderedToast.actionLabel}</span>
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
