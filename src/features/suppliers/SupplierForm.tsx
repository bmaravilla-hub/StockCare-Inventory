import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { Button } from '../../components/Button';
import { Alert } from '../../components/Alert';
import { ConfirmModal } from '../../components/Modal';
import type { SupplierInput, SupplierStatus } from '../../types';

interface SupplierFormProps {
  mode: 'create' | 'edit';
  initialValues?: SupplierInput;
  onSubmit: (values: SupplierInput) => { ok: boolean; error?: string } | Promise<{ ok: boolean; error?: string }>;
  onCancel: () => void;
}

export const SupplierForm: React.FC<SupplierFormProps> = ({
  mode,
  initialValues,
  onSubmit,
  onCancel,
}) => {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [nit, setNit] = useState(initialValues?.nit ?? '');
  const [nrc, setNrc] = useState(initialValues?.nrc ?? '');
  const [phone, setPhone] = useState(initialValues?.phone ?? '');
  const [email, setEmail] = useState(initialValues?.email ?? '');
  const [contactName, setContactName] = useState(initialValues?.contactName ?? '');
  const [status, setStatus] = useState<SupplierStatus>(initialValues?.status ?? 'Activo');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): SupplierInput | null => {
    const nextErrors: Record<string, string> = {};
    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (!cleanName) {
      nextErrors.name = 'El nombre de la empresa o proveedor es obligatorio.';
    } else if (cleanName.length < 3) {
      nextErrors.name = 'El nombre debe tener al menos 3 caracteres.';
    }

    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      nextErrors.email = 'Ingrese una dirección de correo electrónico válida (ej. contacto@proveedor.com).';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return null;

    return {
      name: cleanName,
      nit: nit.trim() || undefined,
      nrc: nrc.trim() || undefined,
      phone: phone.trim() || undefined,
      email: cleanEmail || undefined,
      contactName: contactName.trim() || undefined,
      status,
    };
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const validated = validate();
    if (!validated) return;
    setConfirmOpen(true);
  };

  const handleConfirmedSave = async () => {
    const validated = validate();
    if (!validated) {
      setConfirmOpen(false);
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await onSubmit(validated);
      if (!result.ok) {
        setSubmitError(result.error ?? 'No se pudo guardar el proveedor.');
      } else {
        setConfirmOpen(false);
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      setSubmitError(error.message ?? 'Error inesperado al guardar el proveedor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleFormSubmit} noValidate className="space-y-6">
      {submitError && (
        <Alert variant="error" title="Validación de proveedor">
          {submitError}
        </Alert>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              label="Nombre o Razón Social del Proveedor"
              required
              placeholder="Ej. Droguería Santa María S.A. de C.V."
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              helperText="Nombre comercial o jurídico con el que emite comprobantes de recepción."
            />
          </div>

          <Input
            label="NIT"
            placeholder="Ej. 0614-120590-101-2"
            value={nit}
            onChange={(e) => setNit(e.target.value)}
            error={errors.nit}
            helperText="Número de Identificación Tributaria (opcional)."
          />

          <Input
            label="NRC"
            placeholder="Ej. 254890-4"
            value={nrc}
            onChange={(e) => setNrc(e.target.value)}
            error={errors.nrc}
            helperText="Número de Registro de Contribuyente (opcional)."
          />

          <Input
            label="Teléfono de Contacto"
            placeholder="Ej. +503 2222-3333"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={errors.phone}
            helperText="Línea directa o PBX comercial."
          />

          <Input
            label="Correo Electrónico"
            type="email"
            placeholder="Ej. ventas@santamaria.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            helperText="Correo para gestión de pedidos y comprobantes."
          />

          <Input
            label="Persona o Ejecutivo de Contacto"
            placeholder="Ej. Licda. Mariana Rivas"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            error={errors.contactName}
            helperText="Nombre del representante comercial de la farmacéutica."
          />

          <Select
            label="Estado del Proveedor"
            required
            value={status}
            onChange={(e) => setStatus(e.target.value as SupplierStatus)}
            options={[
              { value: 'Activo', label: 'Activo (habilitado para recepción de mercadería)' },
              { value: 'Inactivo', label: 'Inactivo (deshabilitado para compras, conserva histórico)' },
            ]}
            helperText="Los proveedores inactivos no se eliminan físicamente para preservar el historial."
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
          disabled={isSubmitting}
          leftIcon={<Save className="h-4 w-4" />}
        >
          {mode === 'create' ? 'Registrar proveedor' : 'Guardar cambios'}
        </Button>
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => !isSubmitting && setConfirmOpen(false)}
        onConfirm={handleConfirmedSave}
        isLoading={isSubmitting}
        title={
          mode === 'create'
            ? 'Confirmar registro de proveedor'
            : 'Confirmar actualización de proveedor'
        }
        message={
          mode === 'create'
            ? `¿Desea registrar al proveedor "${name.trim()}" en el catálogo de StockCare?`
            : `¿Desea guardar las modificaciones realizadas al proveedor "${name.trim()}"?`
        }
        confirmText={mode === 'create' ? 'Registrar' : 'Guardar cambios'}
      />
    </form>
  );
};
