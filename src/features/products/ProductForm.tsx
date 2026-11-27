import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { Input, Textarea } from '../../components/Input';
import { Select } from '../../components/Select';
import { Button } from '../../components/Button';
import { Alert } from '../../components/Alert';
import { ConfirmModal } from '../../components/Modal';
import { PRODUCT_CATEGORIES } from '../../constants';
import type { ProductStatus } from '../../types';
import type { ProductInput } from '../../services/StockCareContext';

interface ProductFormProps {
  mode: 'create' | 'edit';
  initialValues?: ProductInput;
  onSubmit: (values: ProductInput) => { ok: boolean; error?: string } | Promise<{ ok: boolean; error?: string }>;
  onCancel: () => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({
  mode,
  initialValues,
  onSubmit,
  onCancel,
}) => {
  const [code, setCode] = useState(initialValues?.code ?? '');
  const [name, setName] = useState(initialValues?.name ?? '');
  const [category, setCategory] = useState(initialValues?.category ?? '');
  const [presentation, setPresentation] = useState(
    initialValues?.presentation ?? ''
  );
  const [minStock, setMinStock] = useState(
    initialValues ? String(initialValues.minStock) : '15'
  );
  const [status, setStatus] = useState<ProductStatus>(
    initialValues?.status ?? 'Activo'
  );
  const [description, setDescription] = useState(
    initialValues?.description ?? ''
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): ProductInput | null => {
    const nextErrors: Record<string, string> = {};
    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();
    const cleanPres = presentation.trim();
    const parsedMin = Number(minStock);

    if (!cleanCode) {
      nextErrors.code = 'El código del producto es obligatorio (ej. MED-012).';
    } else if (!/^[A-Z0-9-]+$/.test(cleanCode)) {
      nextErrors.code = 'Use solo letras, números y guiones (sin espacios).';
    }

    if (!cleanName) {
      nextErrors.name = 'El nombre del producto es obligatorio.';
    } else if (cleanName.length < 3) {
      nextErrors.name = 'El nombre debe tener al menos 3 caracteres.';
    }

    if (!category) {
      nextErrors.category = 'Seleccione una categoría.';
    }

    if (!cleanPres) {
      nextErrors.presentation =
        'La presentación es obligatoria (ej. Caja x 20 tabletas).';
    }

    if (minStock.trim() === '' || Number.isNaN(parsedMin) || parsedMin < 0) {
      nextErrors.minStock = 'Ingrese un stock mínimo válido mayor o igual a 0.';
    } else if (!Number.isInteger(parsedMin)) {
      nextErrors.minStock = 'El stock mínimo debe ser un número entero.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return null;

    return {
      code: cleanCode,
      name: cleanName,
      category,
      presentation: cleanPres,
      minStock: parsedMin,
      status,
      description: description.trim() || undefined,
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
        setSubmitError(result.error ?? 'No se pudo guardar el producto.');
      } else {
        setConfirmOpen(false);
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      setSubmitError(error.message ?? 'Error inesperado al guardar el producto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleFormSubmit} noValidate className="space-y-6">
      {submitError && (
        <Alert variant="error" title="Validación de producto">
          {submitError}
        </Alert>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Input
            label="Código del producto"
            required
            placeholder="Ej. MED-012"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            error={errors.code}
            helperText="Identificador único en inventario."
          />

          <Select
            label="Categoría"
            required
            placeholder="Seleccione una categoría..."
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            error={errors.category}
            options={PRODUCT_CATEGORIES.map((c) => ({ value: c, label: c }))}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Input
            label="Nombre del producto"
            required
            placeholder="Ej. Acetaminofén 500 mg"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
          />

          <Input
            label="Presentación"
            required
            placeholder="Ej. Caja x 20 tabletas / Frasco 120 ml"
            value={presentation}
            onChange={(e) => setPresentation(e.target.value)}
            error={errors.presentation}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Input
            label="Stock mínimo de alerta"
            type="number"
            min={0}
            step={1}
            required
            value={minStock}
            onChange={(e) => setMinStock(e.target.value)}
            error={errors.minStock}
            helperText="Se mostrará alerta de stock bajo al llegar a este valor."
          />

          <Select
            label="Estado del producto"
            required
            value={status}
            onChange={(e) => setStatus(e.target.value as ProductStatus)}
            options={[
              { value: 'Activo', label: 'Activo (habilitado para entradas y salidas)' },
              { value: 'Inactivo', label: 'Inactivo (solo consulta histórica)' },
            ]}
          />
        </div>

        <Textarea
          label="Descripción / Indicaciones de almacenamiento"
          placeholder="Observaciones opcionales del producto..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
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
          {mode === 'create' ? 'Registrar producto' : 'Guardar cambios'}
        </Button>
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => !isSubmitting && setConfirmOpen(false)}
        onConfirm={handleConfirmedSave}
        isLoading={isSubmitting}
        title={
          mode === 'create'
            ? 'Confirmar registro de producto'
            : 'Confirmar actualización de producto'
        }
        message={
          mode === 'create'
            ? `¿Desea registrar el producto "${code.trim().toUpperCase()} — ${name.trim()}" en el catálogo de StockCare?`
            : `¿Desea guardar las modificaciones realizadas al producto "${code.trim().toUpperCase()} — ${name.trim()}"?`
        }
        confirmText={mode === 'create' ? 'Registrar' : 'Guardar cambios'}
      />
    </form>
  );
};

