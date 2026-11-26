import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowUpFromLine } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Input, Textarea } from '../components/Input';
import { Select } from '../components/Select';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';
import { BatchStatusBadge } from '../components/Badge';
import { ConfirmModal } from '../components/Modal';
import { EXIT_REASONS } from '../data/mockData';
import { useStockCare } from '../hooks/useStockCare';
import type { ExitReason } from '../types';
import {
  diffDaysFromToday,
  formatDateDisplay,
  getTodayLocalISO,
  isValidNotFutureDate,
} from '../utils/date';
import {
  getBatchExpiryStatus,
  getExpiryStatusLabel,
  getProductActiveBatches,
  getProductTotalStock,
} from '../utils/inventory';

export const ExitCreatePage: React.FC = () => {
  const { products, batches, settings, registerExit } = useStockCare();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialProductId = searchParams.get('productId') ?? '';
  const initialBatchId = searchParams.get('batchId') ?? '';
  const initialReason =
    (searchParams.get('reason') as ExitReason | null) ?? 'Venta';

  const [productId, setProductId] = useState(initialProductId);
  const [batchId, setBatchId] = useState(initialBatchId);
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState<ExitReason>(
    EXIT_REASONS.includes(initialReason) ? initialReason : 'Venta'
  );
  const [reference, setReference] = useState('');
  const [date, setDate] = useState(getTodayLocalISO());
  const [notes, setNotes] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const productOptions = useMemo(() => {
    return products
      .filter((p) => p.status === 'Activo')
      .map((p) => {
        const stock = getProductTotalStock(p.id, batches);
        return {
          value: p.id,
          label: `${p.code} — ${p.name} (Disponible: ${stock} uds.)`,
        };
      });
  }, [products, batches]);

  const availableBatches = useMemo(() => {
    if (!productId) return [];
    return getProductActiveBatches(productId, batches);
  }, [productId, batches]);

  const selectedProduct = products.find((p) => p.id === productId);
  const selectedBatch = availableBatches.find((b) => b.id === batchId);
  const totalProductStock = productId
    ? getProductTotalStock(productId, batches)
    : 0;

  const selectedBatchStatus = selectedBatch
    ? getBatchExpiryStatus(selectedBatch.expiryDate, settings.expiryAlertDays)
    : null;

  const handleProductChange = (nextProdId: string) => {
    setProductId(nextProdId);
    setBatchId('');
    setErrors({});
    setSubmitError(null);
  };

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};
    let bannerError: string | null = null;

    if (!productId) {
      nextErrors.productId = 'Seleccione un producto.';
    } else if (totalProductStock <= 0) {
      nextErrors.productId =
        'El producto seleccionado no cuenta con existencias disponibles.';
      bannerError = `No es posible registrar una salida para "${selectedProduct?.name}" porque su existencia actual es 0.`;
    }

    if (productId && totalProductStock > 0 && !batchId) {
      nextErrors.batchId = 'Seleccione el lote del cual se descontará la salida.';
    }

    const qty = Number(quantity);
    if (!quantity.trim() || Number.isNaN(qty) || !Number.isInteger(qty)) {
      nextErrors.quantity = 'Ingrese una cantidad numérica entera.';
    } else if (qty <= 0) {
      nextErrors.quantity = 'La cantidad debe ser mayor que cero.';
    } else if (selectedBatch && qty > selectedBatch.quantity) {
      nextErrors.quantity = `Supera el stock del lote (${selectedBatch.quantity} uds. disponibles).`;
      bannerError = `Cantidad inválida: solicitó ${qty} unidades, pero el lote ${selectedBatch.batchNumber} solo dispone de ${selectedBatch.quantity} unidades.`;
    }

    if (selectedBatchStatus === 'Vencido' && reason === 'Venta') {
      nextErrors.reason =
        'No se puede vender un lote vencido. Seleccione "Descarte por vencimiento".';
      bannerError =
        'El lote seleccionado está vencido. Por normativa farmacéutica solo puede salir por "Descarte por vencimiento" o "Devolución a proveedor".';
    }

    if (!date) {
      nextErrors.date = 'La fecha de salida es obligatoria.';
    } else if (!isValidNotFutureDate(date)) {
      nextErrors.date =
        'La fecha de salida no puede ser posterior al día actual.';
    }

    setErrors(nextErrors);
    setSubmitError(bannerError);
    return Object.keys(nextErrors).length === 0;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setConfirmOpen(true);
  };

  const handleConfirmedSave = async () => {
    const res = await registerExit({
      productId,
      batchId,
      quantity: Number(quantity),
      reason,
      reference,
      date,
      notes,
    });
    setConfirmOpen(false);
    if (!res.ok) {
      setSubmitError(res.error ?? 'No se pudo registrar la salida.');
      return;
    }
    navigate('/salidas');
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Registrar Salida de Inventario"
        description="Descuente existencias de un lote específico validando disponibilidad en tiempo real (RF-04)."
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Salidas', to: '/salidas' },
          { label: 'Registrar salida' },
        ]}
        useCaseCode="CU-10"
      />

      {submitError && (
        <Alert variant="error" title="Validación de salida" className="mb-5">
          {submitError}
        </Alert>
      )}

      <form onSubmit={handleFormSubmit} noValidate className="space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-5">
          <Select
            label="Producto"
            required
            placeholder="Seleccione un producto..."
            value={productId}
            onChange={(e) => handleProductChange(e.target.value)}
            error={errors.productId}
            options={productOptions}
          />

          {productId && availableBatches.length === 0 && (
            <Alert variant="warning" title="Sin existencias disponibles">
              Este producto no posee lotes con unidades disponibles para registrar
              una salida.
            </Alert>
          )}

          {availableBatches.length > 0 && (
            <Select
              label="Lote a descontar (ordenado por próximo vencimiento - FEFO)"
              required
              placeholder="Seleccione un lote..."
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              error={errors.batchId}
              options={availableBatches.map((b) => ({
                value: b.id,
                label: `${b.batchNumber} • Disponible: ${b.quantity} uds. • Vence: ${formatDateDisplay(b.expiryDate)}`,
              }))}
            />
          )}

          {selectedBatch && selectedBatchStatus && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
              <div>
                <p className="font-semibold text-slate-500">Lote seleccionado</p>
                <p className="mt-0.5 font-mono text-sm font-bold text-slate-900">
                  {selectedBatch.batchNumber}
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-500">Stock del lote</p>
                <p className="mt-0.5 text-sm font-bold text-teal-700">
                  {selectedBatch.quantity} unidades
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-500">Vencimiento</p>
                <p className="mt-0.5 font-medium text-slate-800">
                  {formatDateDisplay(selectedBatch.expiryDate)}
                </p>
              </div>
              <div>
                <BatchStatusBadge
                  status={selectedBatchStatus}
                  labelOverride={getExpiryStatusLabel(
                    selectedBatchStatus,
                    diffDaysFromToday(selectedBatch.expiryDate)
                  )}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Cantidad a retirar"
              type="number"
              min={1}
              step={1}
              required
              placeholder="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              error={errors.quantity}
              helperText={
                selectedBatch
                  ? `Máximo permitido en este lote: ${selectedBatch.quantity} uds.`
                  : undefined
              }
            />

            <Select
              label="Motivo de salida"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value as ExitReason)}
              error={errors.reason}
              options={EXIT_REASONS.map((r) => ({ value: r, label: r }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="N.º de comprobante / referencia"
              placeholder="Ej. VTA-2026-1305 (opcional, se autogenera)"
              value={reference}
              onChange={(e) => setReference(e.target.value.toUpperCase())}
            />

            <Input
              label="Fecha de salida"
              type="date"
              required
              max={getTodayLocalISO()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              error={errors.date}
            />
          </div>

          <Textarea
            label="Observaciones"
            rows={2}
            placeholder="Detalles adicionales del despacho o motivo de descarte..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </section>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button variant="outline" onClick={() => navigate('/salidas')}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            leftIcon={<ArrowUpFromLine className="h-4 w-4" />}
          >
            Registrar salida
          </Button>
        </div>
      </form>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmedSave}
        title="Confirmar salida de inventario"
        message={
          selectedProduct && selectedBatch ? (
            <span>
              Se descontarán <strong>{quantity} unidades</strong> de{' '}
              <strong>{selectedProduct.name}</strong> (Lote{' '}
              <span className="font-mono font-semibold">
                {selectedBatch.batchNumber}
              </span>
              ) por motivo <strong>{reason}</strong>. El stock del lote quedará en{' '}
              <strong>{selectedBatch.quantity - Number(quantity)} uds.</strong>
            </span>
          ) : (
            '¿Confirma el registro de esta salida?'
          )
        }
        confirmText="Confirmar salida"
      />
    </div>
  );
};

