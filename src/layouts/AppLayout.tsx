import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Topbar } from '../components/Topbar';

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:pl-64">
        <Topbar onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 px-4 pb-6 pt-3 sm:px-6 lg:px-8 lg:pb-8 lg:pt-2">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
        <footer className="border-t border-slate-200 bg-white px-6 py-3 text-xs text-slate-500 no-print">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span>StockCare — Sistema de Gestión y Control de Inventario de Farmacia</span>
            <span>Prototipo Fase II • Análisis y Diseño de Sistemas</span>
          </div>
        </footer>
      </div>
    </div>
  );
};
