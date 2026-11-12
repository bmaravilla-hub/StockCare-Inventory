import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileQuestion } from 'lucide-react';
import { Button } from '../components/Button';
import { StockCareLogo } from '../components/StockCareLogo';
import { useStockCare } from '../hooks/useStockCare';

export const NotFoundPage: React.FC = () => {
  const { session } = useStockCare();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12 text-center">
      <div className="mb-6">
        <StockCareLogo size="md" />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xs">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-600">
          <FileQuestion className="h-7 w-7" />
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-wider text-teal-700">
          Error 404
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          Página no encontrada
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          La ruta solicitada no existe o fue movida dentro del sistema StockCare.
        </p>
        <div className="mt-6">
          <Link to={session ? '/dashboard' : '/login'}>
            <Button variant="primary" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              {session ? 'Volver al Dashboard' : 'Ir al inicio de sesión'}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

