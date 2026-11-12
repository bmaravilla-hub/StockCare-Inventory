import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useStockCare } from '../hooks/useStockCare';
import type { ToastMessage } from '../types';

const TOAST_ICON: Record<ToastMessage['type'], React.ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />,
  error: <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />,
  info: <Info className="h-5 w-5 text-teal-600 shrink-0" />,
};

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useStockCare();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2.5 px-4 sm:px-0 no-print"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg"
        >
          {TOAST_ICON[toast.type]}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
            {toast.message && (
              <p className="mt-0.5 text-xs text-slate-600">{toast.message}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label="Cerrar notificación"
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

