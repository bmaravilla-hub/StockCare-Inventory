import React from 'react';
import { Navigate, Outlet, useLocation, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useStockCare } from '../hooks/useStockCare';
import type { UserRole } from '../types';
import { Button } from './Button';

export const ProtectedRoute: React.FC = () => {
  const { session } = useStockCare();
  const location = useLocation();

  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
};

export const PublicOnlyRoute: React.FC = () => {
  const { session } = useStockCare();

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export const RoleRoute: React.FC<{ allowedRoles: UserRole[] }> = ({
  allowedRoles,
}) => {
  const { session } = useStockCare();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(session.role)) {
    const requiredLabel = allowedRoles
      .map((r) => (r === 'ADMIN' ? 'Administrador' : 'Encargado de Bodega / Dependiente'))
      .join(' o ');

    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-xs my-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-700">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-wider text-rose-700">
          Error 403 • Acceso Restringido
        </p>
        <h1 className="mt-1 text-xl font-bold text-slate-900">
          No cuenta con permisos para esta sección
        </h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          Su rol actual es <strong>{session.roleLabel}</strong>. Esta funcionalidad está reservada únicamente para el rol: <strong>{requiredLabel}</strong>.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/dashboard">
            <Button variant="primary" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Volver al Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

