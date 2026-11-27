import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Menu, ShieldCheck, UserCircle2 } from 'lucide-react';
import { useStockCare } from '../hooks/useStockCare';
import { getInventoryAlerts } from '../utils/inventory';

interface TopbarProps {
  onOpenSidebar: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onOpenSidebar }) => {
  const { session, settings, batches, products } = useStockCare();

  const { totalAlerts } = useMemo(() => {
    return getInventoryAlerts(products, batches, settings.expiryAlertDays);
  }, [products, batches, settings.expiryAlertDays]);

  return (
    <header className="sticky top-3 z-20 flex items-center justify-between px-4 pt-3 sm:px-6 lg:px-8 lg:justify-end pointer-events-none no-print">
      <button
        type="button"
        onClick={onOpenSidebar}
        aria-label="Abrir menú lateral"
        className="pointer-events-auto rounded-xl border border-slate-200 bg-white/95 p-2.5 text-slate-700 shadow-sm backdrop-blur-xs hover:bg-slate-50 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="pointer-events-auto flex items-center gap-2.5">
        <Link
          to="/alertas"
          className="relative inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/95 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-xs hover:bg-amber-50 hover:border-amber-200 hover:text-amber-900 transition-colors"
          title="Ver alertas de vencimiento y existencias"
        >
          <Bell className="h-4 w-4 text-amber-600" />
          <span className="hidden md:inline">Alertas</span>
          {totalAlerts > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-600 px-1.5 text-[11px] font-bold text-white">
              {totalAlerts}
            </span>
          )}
        </Link>

        {session && (
          <Link
            to="/perfil"
            className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white/95 px-3 py-1.5 shadow-sm backdrop-blur-xs hover:bg-slate-50 transition-colors"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0E3B66] text-xs font-bold text-white">
              {session.role === 'ADMIN' ? 'AD' : 'EB'}
            </div>
            <div className="hidden md:block text-left leading-tight">
              <p className="text-xs font-semibold text-slate-900">
                {session.fullName}
              </p>
              <p className="flex items-center gap-1 text-[11px] text-teal-700 font-medium">
                <ShieldCheck className="h-3 w-3" />
                {session.roleLabel}
              </p>
            </div>
            <UserCircle2 className="h-4 w-4 text-slate-400 md:hidden" />
          </Link>
        )}
      </div>
    </header>
  );
};
