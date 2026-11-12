import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { KeyRound, Lock, ShieldCheck, User, Warehouse } from 'lucide-react';
import { StockCareLogo } from '../components/StockCareLogo';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';
import { DEMO_ACCOUNTS } from '../data/mockData';
import { useStockCare } from '../hooks/useStockCare';
import type { UserRole } from '../types';

export const LoginPage: React.FC = () => {
  const { login } = useStockCare();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || '/dashboard';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    password?: string;
  }>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const errors: { username?: string; password?: string } = {};
    if (!username.trim()) {
      errors.username = 'Ingrese su nombre de usuario o correo.';
    }
    if (!password.trim()) {
      errors.password = 'Ingrese la clave de acceso.';
    } else if (password.trim().length < 4) {
      errors.password = 'La clave debe contener al menos 4 caracteres.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    const result = await login(username);
    setIsSubmitting(false);

    if (!result.ok) {
      setAuthError(result.error ?? 'No fue posible iniciar sesión.');
      return;
    }

    navigate(from, { replace: true });
  };

  const handleQuickDemoLogin = async (role: UserRole) => {
    setAuthError(null);
    setFieldErrors({});
    setIsSubmitting(true);
    const result = await login('', role);
    setIsSubmitting(false);
    if (result.ok) {
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl grid grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:grid-cols-12">
        {/* Panel izquierdo institucional */}
        <div className="flex flex-col justify-between bg-gradient-to-b from-[#0E3B66] via-[#0E4F6C] to-[#0E6D6B] p-8 text-white md:col-span-5">
          <div>
            <StockCareLogo size="lg" card />
            <h1 className="mt-6 text-2xl font-bold tracking-tight">
              Control centralizado de inventario farmacéutico
            </h1>
            <p className="mt-3 text-sm text-teal-100 leading-relaxed">
              Gestione productos, entradas por proveedor, salidas por lote,
              fechas de vencimiento y trazabilidad de movimientos en una sola
              plataforma.
            </p>
          </div>

          <div className="mt-8 space-y-3 border-t border-teal-700/80 pt-5 text-xs text-teal-100">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 shrink-0 text-teal-300 mt-0.5" />
              <span>
                Prototipo académico Fase II • Análisis y Diseño de Sistemas (UDB).
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <Lock className="h-4 w-4 shrink-0 text-teal-300 mt-0.5" />
              <span>
                Sesión simulada con control de acceso por roles. No se almacenan
                contraseñas reales.
              </span>
            </div>
          </div>
        </div>

        {/* Panel derecho formulario */}
        <div className="p-6 sm:p-8 md:col-span-7">
          <div className="mb-6">
            <span className="inline-block rounded-md bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-800">
              CU-01 • Inicio de Sesión
            </span>
            <h2 className="mt-2 text-xl font-bold text-slate-900">
              Acceso al sistema
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Ingrese sus credenciales o utilice un perfil de demostración.
            </p>
          </div>

          {authError && (
            <Alert variant="error" title="Error de autenticación" className="mb-5">
              {authError}
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Input
              label="Usuario"
              required
              placeholder="Ej. admin o bodega"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              error={fieldErrors.username}
              leftIcon={<User className="h-4 w-4" />}
              autoComplete="username"
            />

            <Input
              label="Contraseña"
              type="password"
              required
              placeholder="Ingrese cualquier clave (mín. 4 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              leftIcon={<KeyRound className="h-4 w-4" />}
              autoComplete="current-password"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              className="w-full"
            >
              Iniciar sesión
            </Button>
          </form>

          <div className="mt-7 border-t border-slate-200 pt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Acceso rápido por rol (Prototipo)
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleQuickDemoLogin(acc.role)}
                  className="flex flex-col items-start rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-left hover:border-teal-400 hover:bg-teal-50/40 transition-colors disabled:opacity-50"
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    {acc.role === 'ADMIN' ? (
                      <ShieldCheck className="h-4 w-4 text-teal-700" />
                    ) : (
                      <Warehouse className="h-4 w-4 text-teal-700" />
                    )}
                    <span>{acc.roleLabel}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Usuario: <code className="font-semibold text-slate-700">{acc.username}</code>
                  </p>
                  <p className="mt-1.5 text-[11px] text-slate-600 leading-snug">
                    {acc.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

