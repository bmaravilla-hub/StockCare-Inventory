import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

const STYLES: Record<
  AlertVariant,
  { container: string; icon: React.ReactNode; titleColor: string }
> = {
  info: {
    container: 'border-teal-200 bg-teal-50/70 text-teal-900',
    icon: <Info className="h-5 w-5 text-teal-700 shrink-0" aria-hidden="true" />,
    titleColor: 'text-teal-950',
  },
  success: {
    container: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0" aria-hidden="true" />,
    titleColor: 'text-emerald-950',
  },
  warning: {
    container: 'border-amber-200 bg-amber-50 text-amber-900',
    icon: <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0" aria-hidden="true" />,
    titleColor: 'text-amber-950',
  },
  error: {
    container: 'border-rose-200 bg-rose-50 text-rose-900',
    icon: <AlertCircle className="h-5 w-5 text-rose-700 shrink-0" aria-hidden="true" />,
    titleColor: 'text-rose-950',
  },
};

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  children,
  action,
  className = '',
}) => {
  const style = STYLES[variant];

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-start sm:justify-between ${style.container} ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{style.icon}</div>
        <div className="text-sm leading-relaxed">
          {title && (
            <p className={`font-semibold mb-0.5 ${style.titleColor}`}>{title}</p>
          )}
          <div>{children}</div>
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

