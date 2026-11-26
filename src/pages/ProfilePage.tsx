import React, { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Save,
  ShieldCheck,
  UserCircle2,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';
import { useStockCare } from '../hooks/useStockCare';
import { formatDateTimeDisplay } from '../utils/date';

export const ProfilePage: React.FC = () => {
  const {
    session,
    settings,
    updateProfile,
    updateSettings,
  } = useStockCare();

  const [fullName, setFullName] = useState(session?.fullName ?? '');
  const [email, setEmail] = useState(session?.email ?? '');
  const [profileErrors, setProfileErrors] = useState<{
    fullName?: string;
    email?: string;
  }>({});

  const [sysForm, setSysForm] = useState(settings);
  const [sysError, setSysError] = useState<string | null>(null);

  if (!session) return null;

  const isAdmin = session.role === 'ADMIN';

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: { fullName?: string; email?: string } = {};
    if (!fullName.trim()) errs.fullName = 'El nombre completo es obligatorio.';
    if (!email.trim() || !email.includes('@')) {
      errs.email = 'Ingrese un correo institucional válido.';
    }
    if (Object.keys(errs).length > 0) {
      setProfileErrors(errs);
      return;
    }
    setProfileErrors({});
    updateProfile({ fullName, email });
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sysForm.pharmacyName.trim() || !sysForm.branchName.trim()) {
      setSysError('El nombre de la farmacia y sucursal son obligatorios.');
      return;
    }
    setSysError(null);
    updateSettings({
      ...sysForm,
      pharmacyName: sysForm.pharmacyName.trim(),
      branchName: sysForm.branchName.trim(),
      branchAddress: sysForm.branchAddress.trim(),
      phone: sysForm.phone.trim(),
    });
  };

  const permissions = isAdmin
    ? [
        'Visualizar el panel de control (Dashboard)',
        'Consultar inventario, existencias y lotes',
        'Consultar historial completo de movimientos',
        'Monitorear alertas de productos próximos a vencer y stock bajo',
        'Generar y exportar reportes del sistema',
        'Gestionar información general del sistema',
      ]
    : [
        'Registrar y actualizar catálogo de productos',
        'Registrar entradas de inventario por proveedor y factura',
        'Registrar salidas de productos por lote con validación de stock',
        'Registrar números de lote y fechas de vencimiento',
        'Consultar existencias disponibles y alertas',
        'Consultar historial de movimientos relacionados con inventario',
      ];

  return (
    <div>
      <PageHeader
        title="Perfil del Usuario"
        description="Información de la cuenta activa, permisos asignados y parámetros generales."
        breadcrumbs={[
          { label: 'Inicio', to: '/dashboard' },
          { label: 'Perfil del usuario' },
        ]}
        useCaseCode="CU-03"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Tarjeta de perfil */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs lg:col-span-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-700 text-base font-bold text-white">
              {isAdmin ? 'AD' : 'EB'}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Datos de la sesión activa
              </h2>
              <p className="text-xs text-slate-500">
                Último acceso: {formatDateTimeDisplay(session.lastLogin)}
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} noValidate className="space-y-4">
            <Input
              label="Nombre completo"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              error={profileErrors.fullName}
              leftIcon={<UserCircle2 className="h-4 w-4" />}
            />

            <Input
              label="Correo electrónico"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={profileErrors.email}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Usuario"
                value={session.username}
                disabled
                helperText="Identificador de sesión simulada"
              />
              <Input
                label="Rol asignado"
                value={session.roleLabel}
                disabled
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                leftIcon={<Save className="h-4 w-4" />}
              >
                Guardar cambios de perfil
              </Button>
            </div>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-5">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-600 mb-3">
              <ShieldCheck className="h-4 w-4 text-teal-700" />
              Permisos del rol activo
            </h3>
            <ul className="space-y-2">
              {permissions.map((perm) => (
                <li
                  key={perm}
                  className="flex items-start gap-2 text-xs text-slate-700"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                  <span>{perm}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Información general del sistema */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs lg:col-span-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Información General del Sistema
              </h2>
              <p className="text-xs text-slate-500">
                Datos de la farmacia y umbral de alertas de vencimiento.
              </p>
            </div>
          </div>

          {!isAdmin && (
            <Alert variant="info" className="mb-4">
              Solo el rol <strong>Administrador</strong> puede modificar la
              configuración general de la farmacia y los parámetros de alerta.
            </Alert>
          )}

          {sysError && (
            <Alert variant="error" className="mb-4">
              {sysError}
            </Alert>
          )}

          <form onSubmit={handleSaveSettings} noValidate className="space-y-4">
            <Input
              label="Nombre de la farmacia"
              required
              disabled={!isAdmin}
              value={sysForm.pharmacyName}
              onChange={(e) =>
                setSysForm((s) => ({ ...s, pharmacyName: e.target.value }))
              }
            />
            <Input
              label="Sucursal"
              required
              disabled={!isAdmin}
              value={sysForm.branchName}
              onChange={(e) =>
                setSysForm((s) => ({ ...s, branchName: e.target.value }))
              }
            />
            <Input
              label="Dirección"
              disabled={!isAdmin}
              value={sysForm.branchAddress}
              onChange={(e) =>
                setSysForm((s) => ({ ...s, branchAddress: e.target.value }))
              }
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Teléfono de contacto"
                disabled={!isAdmin}
                value={sysForm.phone}
                onChange={(e) =>
                  setSysForm((s) => ({ ...s, phone: e.target.value }))
                }
              />
              <Select
                label="Ventana de alerta por vencimiento"
                disabled={!isAdmin}
                value={String(sysForm.expiryAlertDays)}
                onChange={(e) =>
                  setSysForm((s) => ({
                    ...s,
                    expiryAlertDays: Number(e.target.value),
                  }))
                }
                options={[
                  { value: '30', label: '30 días antes de vencer' },
                  { value: '60', label: '60 días antes de vencer' },
                  { value: '90', label: '90 días antes de vencer' },
                ]}
              />
            </div>

            {isAdmin && (
              <div className="flex flex-wrap items-center justify-start gap-3 pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  leftIcon={<Save className="h-4 w-4" />}
                >
                  Guardar configuración
                </Button>
              </div>
            )}
          </form>
        </section>
      </div>
    </div>
  );
};

