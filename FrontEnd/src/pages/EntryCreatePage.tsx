import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ClipboardList, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Input, Textarea } from '../components/Input';
import { Select } from '../components/Select';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';
import { Modal } from '../components/Modal';
import { COMMON_PROVIDERS } from '../data/mockData';
import { useStockCare } from '../hooks/useStockCare';
import {
  formatDateDisplay,
  getTodayLocalISO,
  isValidFutureOrTodayDate,
  isValidNotFutureDate,
} from '../utils/date';
import { EntryReceiptModal } from '../features/entries/EntryReceiptModal';
import type { EntryRecord } from '../types';

interface DraftLine {
  key: string;
  productId: string;
  quantity: string;
  batchNumber: string;
  expiryDate: string;
}

function createEmptyLine(): DraftLine {
  return {
    key: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    productId: '',
    quantity: '',
    batchNumber: '',
    expiryDate: '',
  };
}

export const EntryCreatePage: React.FC = () => {
  const { products, settings, registerEntry } = useStockCare();
  const navigate = useNavigate();

  const activeProducts = useMemo(
    () => products.filter((p) => p.status === 'Activo'),
    [products]
  );

  const [provider, setProvider] = useState('');
  const [customProvider, setCustomProvider] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [date, setDate] = useState(getTodayLocalISO());
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([createEmptyLine()]);

  const [headerErrors, setHeaderErrors] = useState<Record<string, string>>({});
  const [lineErrors, setLineErrors] = useState<
    Record<string, Record<string, string>>
  >({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [savedReceipt, setSavedReceipt] = useState<EntryRecord | null>(null);

  const effectiveProvider =
    provider === '__OTHER__' ? customProvider.trim() : provider.trim();

  const updateLine = (key: string, field: keyof DraftLine, value: string) => {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, [field]: value } : l))
    );
  };

  const removeLine = (key: string) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((l) => l.key !== key));
  };

  const validateAll = (): boolean => {
    const nextHeaderErrors: Record<string, string> = {};
    const nextLineErrors: Record<string, Record<string, string>> = {};

    if (!effectiveProvider) {
      nextHeaderErrors.provider = 'Seleccione o ingrese el proveedor.';
    }
    if (!documentNumber.trim()) {
      nextHeaderErrors.documentNumber =
        'El número de factura o documento es obligatorio.';
    }
    if (!date) {
      nextHeaderErrors.date = 'La fecha de recepción es obligatoria.';
    } else if (!isValidNotFutureDate(date)) {
      nextHeaderErrors.date =
        'La fecha de entrada no puede ser posterior al día actual.';
    }

    lines.forEach((line) => {
      const errs: Record<string, string> = {};
      if (!line.productId) {
        errs.productId = 'Seleccione un producto.';
      }
      const qty = Number(line.quantity);
      if (
        !line.quantity.trim() ||
        Number.isNaN(qty) ||
        !Number.isInteger(qty) ||
        qty <= 0
      ) {
        errs.quantity = 'Ingrese una cantidad entera mayor a 0.';
      }
      if (!line.batchNumber.trim()) {
        errs.batchNumber = 'Ingrese el número de lote.';
      }
      if (!line.expiryDate) {
        errs.expiryDate = 'Ingrese la fecha de vencimiento.';
      } else if (!isValidFutureOrTodayDate(line.expiryDate)) {
        errs.expiryDate =
          'Fecha inválida: no se permite ingresar productos ya vencidos.';
      }

      if (Object.keys(errs).length > 0) {
        nextLineErrors[line.key] = errs;
      }
    });

    setHeaderErrors(nextHeaderErrors);
    setLineErrors(nextLineErrors);

    return (
      Object.keys(nextHeaderErrors).length === 0 &&
      Object.keys(nextLineErrors).length === 0
    );
  };

  const handleOpenSummary = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validateAll()) return;
    setSummaryModalOpen(true);
  };

  const handleConfirmRegister = async () => {
    const res = await registerEntry({
    provider: effectiveProvider,
    documentNumber: documentNumber.trim(),
    date,
    notes: notes.trim() || undefined,
    items: lines.map((l) => ({
      productId: l.productId,
      quantity: Number(l.quantity),
      batchNumber: l.batchNumber.trim().toUpperCase(),
      expiryDate: l.expiryDate,
    })),
    });

    if (!res.ok) {
      setSubmitError(res.error ?? 'No se pudo registrar la entrada.');
      return;
    }

    setSummaryModalOpen(false);

    if (res.data) {
      setSavedReceipt(res.data);
    } else {
      navigate('/entradas');
    }

};

  const totalUnits = lines.reduce((sum, l) => {
    const n = Number(l.quantity);
    return sum + (Number.isFinite(n) && n > 0 ? n : 0);
  }, 0);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Registrar Entrada de Inventario"
        description="Registre mercadería recibida de proveedores con número de lote y fecha de vencimiento (RF-02, RF-03)."
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Entradas', to: '/entradas' },
          { label: 'Registrar entrada' },
        ]}
        useCaseCode="CU-08"
      />

      {submitError && (
        <Alert variant="error" title="Error al registrar entrada" className="mb-5">
          {submitError}
        </Alert>
      )}

      <form onSubmit={handleOpenSummary} noValidate className="space-y-6">
        {/* Datos de documento / recepción */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
            1. Datos de Recepción y Proveedor
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Select
              label="Proveedor"
              required
              placeholder="Seleccione un proveedor..."
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              error={provider !== '__OTHER__' ? headerErrors.provider : undefined}
              options={[
                ...COMMON_PROVIDERS.map((p) => ({ value: p, label: p })),
                { value: '__OTHER__', label: 'Otro proveedor (especificar)' },
              ]}
            />

            <Input
              label="N.º de factura o documento"
              required
              placeholder="Ej. FAC-2026-0610"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value.toUpperCase())}
              error={headerErrors.documentNumber}
            />

            <Input
              label="Fecha de recepción"
              type="date"
              required
              max={getTodayLocalISO()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              error={headerErrors.date}
            />
          </div>

          {provider === '__OTHER__' && (
            <Input
              label="Nombre del proveedor"
              required
              placeholder="Ingrese el nombre completo del proveedor"
              value={customProvider}
              onChange={(e) => setCustomProvider(e.target.value)}
              error={headerErrors.provider}
            />
          )}

          <Textarea
            label="Observaciones de recepción"
            rows={2}
            placeholder="Notas opcionales sobre estado de empaques o entrega..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </section>

        {/* Detalle de productos y lotes */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                2. Productos, Lotes y Fechas de Vencimiento
              </h2>
              <p className="text-xs text-slate-500">
                Puede incorporar varios productos dentro de la misma recepción.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setLines((prev) => [...prev, createEmptyLine()])}
            >
              Agregar producto
            </Button>
          </div>

          <div className="space-y-4">
            {lines.map((line, index) => {
              const errs = lineErrors[line.key] ?? {};
              return (
                <div
                  key={line.key}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Producto #{index + 1}
                    </span>
                    {lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLine(line.key)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Quitar
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                    <div className="sm:col-span-5">
                      <Select
                        label="Producto"
                        required
                        placeholder="Seleccione producto..."
                        value={line.productId}
                        onChange={(e) =>
                          updateLine(line.key, 'productId', e.target.value)
                        }
                        error={errs.productId}
                        options={activeProducts.map((p) => ({
                          value: p.id,
                          label: `${p.code} — ${p.name} (${p.presentation})`,
                        }))}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Input
                        label="Cantidad"
                        type="number"
                        min={1}
                        step={1}
                        required
                        placeholder="0"
                        value={line.quantity}
                        onChange={(e) =>
                          updateLine(line.key, 'quantity', e.target.value)
                        }
                        error={errs.quantity}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Input
                        label="N.º de Lote"
                        required
                        placeholder="LOT-2611"
                        value={line.batchNumber}
                        onChange={(e) =>
                          updateLine(
                            line.key,
                            'batchNumber',
                            e.target.value.toUpperCase()
                          )
                        }
                        error={errs.batchNumber}
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <Input
                        label="Fecha de vencimiento"
                        type="date"
                        required
                        min={getTodayLocalISO()}
                        value={line.expiryDate}
                        onChange={(e) =>
                          updateLine(line.key, 'expiryDate', e.target.value)
                        }
                        error={errs.expiryDate}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-6 py-4">
          <div className="text-sm text-slate-600">
            Resumen preliminar: <strong>{lines.length}</strong> línea(s) •{' '}
            <strong className="text-teal-700">{totalUnits}</strong> unidades a
            ingresar
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate('/entradas')}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              leftIcon={<ClipboardList className="h-4 w-4" />}
            >
              Revisar resumen y guardar
            </Button>
          </div>
        </div>
      </form>

      {/* Modal de Resumen antes de guardar */}
      <Modal
        isOpen={summaryModalOpen}
        onClose={() => setSummaryModalOpen(false)}
        title="Resumen de Entrada de Inventario"
        description="Verifique la información antes de actualizar las existencias automáticamente (RF-03)."
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setSummaryModalOpen(false)}
            >
              Volver a editar
            </Button>
            <Button
              variant="primary"
              leftIcon={<CheckCircle2 className="h-4 w-4" />}
              onClick={handleConfirmRegister}
            >
              Confirmar y registrar entrada
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs sm:grid-cols-3">
            <div>
              <span className="font-semibold text-slate-500">Proveedor:</span>
              <p className="mt-0.5 font-bold text-slate-900">{effectiveProvider}</p>
            </div>
            <div>
              <span className="font-semibold text-slate-500">Documento:</span>
              <p className="mt-0.5 font-mono font-bold text-slate-900">
                {documentNumber.trim().toUpperCase()}
              </p>
            </div>
            <div>
              <span className="font-semibold text-slate-500">Fecha:</span>
              <p className="mt-0.5 font-bold text-slate-900">
                {formatDateDisplay(date)}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600">
                    Producto
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600">
                    Lote
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-600">
                    Vencimiento
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-600">
                    Cantidad
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {lines.map((l) => {
                  const prod = products.find((p) => p.id === l.productId);
                  return (
                    <tr key={l.key}>
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {prod?.code} — {prod?.name}
                      </td>
                      <td className="px-3 py-2 font-mono font-semibold text-slate-700">
                        {l.batchNumber.trim().toUpperCase()}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {formatDateDisplay(l.expiryDate)}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-teal-700">
                        +{l.quantity} uds.
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* Comprobante generado tras confirmar */}
      <EntryReceiptModal
        entry={savedReceipt}
        products={products}
        settings={settings}
        onClose={() => {
          setSavedReceipt(null);
          navigate('/entradas');
        }}
      />
    </div>
  );
};

