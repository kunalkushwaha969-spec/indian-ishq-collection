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
  const isOrder = toast.type === 'order';
  const isError = toast.type === 'error';

  return (
    <aside
      aria-label="Notification"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 max-w-sm w-full mx-4 sm:mx-0 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div
        className={`p-4 rounded-xl shadow-2xl border backdrop-blur-md flex items-start gap-3 transition-all ${
          isError
            ? 'bg-red-950/90 border-red-700 text-white'
            : isOrder
            ? 'bg-emerald-950/90 border-emerald-700 text-white'
            : isCart
            ? 'bg-[#3b121e]/95 border-[#b78a4b]/50 text-white shadow-[#4c1727]/30'
            : 'bg-[#292222]/95 border-[#b78a4b]/40 text-white'
        }`}
      >
        <div className="shrink-0 mt-0.5">
          {isCart && (
            <div className="w-8 h-8 rounded-full bg-[#b78a4b]/20 flex items-center justify-center text-[#e8c593]">
              <ShoppingBag className="w-4 h-4" />
            </div>
          )}
          {isOrder && (
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          )}
          {isError && (
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-300">
              <AlertTriangle className="w-4 h-4" />
            </div>
          )}
          {!isCart && !isOrder && !isError && (
            <div className="w-8 h-8 rounded-full bg-[#b78a4b]/20 flex items-center justify-center text-[#e8c593]">
              <Sparkles className="w-4 h-4" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 pr-1">
          {toast.title && (
            <h4 className="font-serif text-sm font-semibold tracking-wide text-white mb-0.5">
              {toast.title}
            </h4>
          )}
          <p className="text-xs text-stone-200 leading-relaxed font-sans">
            {toast.message}
          </p>

          {toast.actionLabel && toast.onAction && (
            <button
              type="button"
              onClick={() => {
                toast.onAction?.();
                onClose();
              }}
              className="mt-2 text-xs font-semibold text-[#e8c593] hover:text-white underline underline-offset-2 flex items-center gap-1 cursor-pointer"
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
          className="shrink-0 p-1 text-stone-400 hover:text-white rounded transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
