import React from 'react';
import { Link } from 'react-router-dom';

export type MetricAccent = 'teal' | 'slate' | 'amber' | 'rose' | 'emerald';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  accent?: MetricAccent;
  to?: string;
}

const ACCENT_ICON_BG: Record<MetricAccent, string> = {
  teal: 'bg-teal-50 text-teal-700 border-teal-100',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  rose: 'bg-rose-50 text-rose-700 border-rose-100',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
};

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  accent = 'teal',
  to,
}) => {
  const cardBody = (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-2xs transition-all ${
        to ? 'hover:border-teal-300 hover:shadow-sm cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {title}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {value}
          </p>
          {subtitle && (
            <p className="mt-1.5 text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${ACCENT_ICON_BG[accent]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded-xl">
        {cardBody}
      </Link>
    );
  }

  return cardBody;
};

