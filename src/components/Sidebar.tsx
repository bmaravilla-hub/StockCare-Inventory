import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Boxes,
  CalendarClock,
  FileBarChart2,
  LayoutDashboard,
  LogOut,
  Pill,
  Truck,
  UserCircle2,
  X,
} from 'lucide-react';
import { StockCareLogo } from './StockCareLogo';
import { useStockCare } from '../hooks/useStockCare';
import { getBatchExpiryStatus, getProductStockSummary } from '../utils/inventory';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  badgeCount?: number;
  roles?: Array<'ADMIN' | 'BODEGA'>;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { session, logout, batches, products, settings } = useStockCare();

  const expiryAlertsCount = batches.filter((b) => {
    if (b.quantity <= 0) return false;
    const status = getBatchExpiryStatus(b.expiryDate, settings.expiryAlertDays);
    return status === 'Vencido' || status === 'ProximoAVencer';
  }).length;

  const lowStockCount = products.filter((p) => {
    if (p.status !== 'Activo') return false;
    const summary = getProductStockSummary(p, batches, settings.expiryAlertDays);
    return summary.stockStatus !== 'Normal';
  }).length;

  const totalAlerts = expiryAlertsCount + lowStockCount;

  const navSections: Array<{ title: string; items: NavItem[] }> = [
    {
      title: 'Principal',
      items: [
        {
          label: 'Dashboard',
          to: '/dashboard',
          icon: <LayoutDashboard className="h-4 w-4" />,
        },
        {
          label: 'Alertas y Vencimientos',
          to: '/alertas',
          icon: <AlertTriangle className="h-4 w-4" />,
          badgeCount: totalAlerts,
        },
      ],
    },
    {
      title: 'Catálogo y Control',
      items: [
        {
          label: 'Productos',
          to: '/productos',
          icon: <Pill className="h-4 w-4" />,
        },
        {
          label: 'Proveedores',
          to: '/proveedores',
          icon: <Truck className="h-4 w-4" />,
        },
        {
          label: 'Inventario / Existencias',
          to: '/inventario',
          icon: <Boxes className="h-4 w-4" />,
        },
        {
          label: 'Lotes y Vencimientos',
          to: '/lotes',
          icon: <CalendarClock className="h-4 w-4" />,
        },
      ],
    },
    {
      title: 'Operaciones',
      items: [
        {
          label: 'Entradas',
          to: '/entradas',
          icon: <ArrowDownToLine className="h-4 w-4" />,
        },
        {
          label: 'Salidas',
          to: '/salidas',
          icon: <ArrowUpFromLine className="h-4 w-4" />,
        },
        {
          label: 'Movimientos',
          to: '/movimientos',
          icon: <ArrowLeftRight className="h-4 w-4" />,
        },
      ],
    },
    {
      title: 'Administración',
      items: [
        {
          label: 'Reportes',
          to: '/reportes',
          icon: <FileBarChart2 className="h-4 w-4" />,
          roles: ['ADMIN'],
        },
        {
          label: 'Perfil del Usuario',
          to: '/perfil',
          icon: <UserCircle2 className="h-4 w-4" />,
        },
      ],
    },
  ];

  const userRole = session?.role;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden no-print"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Menú lateral principal"
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-gradient-to-b from-[#0E3B66] via-[#0E4F6C] to-[#0E6D6B] text-white shadow-lg transition-transform duration-200 lg:translate-x-0 no-print ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-center relative border-b border-slate-200 bg-white px-4 py-4">
          <StockCareLogo size="lg" subtitle="Control de Inventario" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú lateral"
            className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {navSections.map((section) => {
            const visibleItems = section.items.filter(
              (item) => !item.roles || (userRole && item.roles.includes(userRole))
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title}>
                <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-teal-200/80">
                  {section.title}
                </p>
                <nav className="space-y-1">
                  {visibleItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-white text-[#0E3B66] font-semibold shadow-xs'
                            : 'text-slate-100/90 hover:bg-white/12 hover:text-white'
                        }`
                      }
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span className="shrink-0">{item.icon}</span>
                        <span className="truncate">{item.label}</span>
                      </span>
                      {typeof item.badgeCount === 'number' && item.badgeCount > 0 && (
                        <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1.5 text-[11px] font-bold text-slate-950">
                          {item.badgeCount}
                        </span>
                      )}
                    </NavLink>
                  ))}
                </nav>
              </div>
            );
          })}
        </div>

        {session && (
          <div className="border-t border-white/15 bg-black/15 p-3">
            <div className="mb-2.5 rounded-lg border border-white/15 bg-white/10 px-3 py-2">
              <p className="truncate text-xs font-semibold text-white">
                {session.fullName}
              </p>
              <p className="truncate text-[11px] font-medium text-teal-200">
                {session.roleLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-medium text-white hover:bg-rose-600 hover:border-rose-500 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Cerrar sesión
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
