import React from 'react';
import { Printer } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { StockCareLogo } from '../../components/StockCareLogo';
import type { EntryRecord, Product, SystemSettings } from '../../types';
import { formatDateDisplay, formatDateTimeDisplay } from '../../utils/date';

interface EntryReceiptModalProps {
  entry: EntryRecord | null;
  products: Product[];
  settings: SystemSettings;
  onClose: () => void;
}

export const EntryReceiptModal: React.FC<EntryReceiptModalProps> = ({
  entry,
  products,
  settings,
  onClose,
}) => {
  if (!entry) return null;

  const totalUnits = entry.items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <Modal
      isOpen={Boolean(entry)}
      onClose={onClose}
      title={`Comprobante de Recepción • ${entry.documentNumber}`}
      description="Constancia de ingreso de mercadería y actualización de existencias (DFD 1.5)"
      size="lg"
      footer={
        <>
          <Button
            variant="outline"
            leftIcon={<Printer className="h-4 w-4" />}
            onClick={() => window.print()}
          >
            Imprimir comprobante
          </Button>
          <Button variant="primary" onClick={onClose}>
            Cerrar
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <StockCareLogo size="sm" subtitle={settings.pharmacyName} />
          <div className="text-left sm:text-right text-xs text-slate-600">
            <p className="font-bold text-slate-900">{entry.documentNumber}</p>
            <p>Fecha recepción: {formatDateDisplay(entry.date)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="font-semibold uppercase tracking-wider text-slate-400">
              Proveedor
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {entry.supplierName || entry.provider}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="font-semibold uppercase tracking-wider text-slate-400">
              Registrado por
            </p>
            <p className="mt-1 text-sm font-medium text-slate-800">
              {entry.registeredBy}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="font-semibold uppercase tracking-wider text-slate-400">
              Fecha de registro
            </p>
            <p className="mt-1 text-sm font-medium text-slate-800">
              {formatDateTimeDisplay(entry.createdAt)}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200">
          {/* Vista móvil: tarjetas de ítems del comprobante */}
          <div className="divide-y divide-slate-100 sm:hidden bg-white">
            {entry.items.map((item) => {
              const product = products.find((p) => p.id === item.productId);
              const displayName = item.productName || product?.name || 'Producto';
              const displayCode = item.productCode || product?.code || '';
              const displayPresentation = product?.presentation || '';
              return (
                <div key={item.id} className="p-3 text-xs space-y-1.5">
                  <div>
                    <p className="font-semibold text-slate-900">{displayName}</p>
                    <p className="text-[11px] text-slate-500">
                      {displayCode}{displayPresentation ? ` • ${displayPresentation}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-slate-700">
                    <span>Lote: <strong className="font-mono">{item.batchNumber}</strong></span>
                    <span className="font-bold text-teal-700">+{item.quantity} uds.</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Vence: {formatDateDisplay(item.expiryDate)}
                  </p>
                </div>
              );
            })}
            <div className="bg-slate-50 p-3 text-xs font-semibold text-slate-900 flex justify-between items-center">
              <span>Total recibido ({entry.items.length} ítems):</span>
              <span className="text-teal-800 font-bold">{totalUnits} unidades</span>
            </div>
          </div>

          {/* Vista escritorio: tabla compacta */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-600">
                    Producto
                  </th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-600">
                    Lote
                  </th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-600">
                    Vencimiento
                  </th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-600">
                    Cantidad
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {entry.items.map((item) => {
                  const product = products.find((p) => p.id === item.productId);
                  const displayName = item.productName || product?.name || 'Producto';
                  const displayCode = item.productCode || product?.code || '';
                  const displayPresentation = product?.presentation || '';
                  return (
                    <tr key={item.id}>
                      <td className="px-3 py-2.5">
                        <p className="font-semibold text-slate-900">
                          {displayName}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {displayCode}{displayPresentation ? ` • ${displayPresentation}` : ''}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 font-mono font-semibold text-slate-700">
                        {item.batchNumber}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">
                        {formatDateDisplay(item.expiryDate)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-teal-700">
                        +{item.quantity} uds.
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 font-semibold text-slate-900">
                <tr>
                  <td colSpan={3} className="px-3 py-2.5 text-right">
                    Total recibido ({entry.items.length} ítem(s)):
                  </td>
                  <td className="px-3 py-2.5 text-right text-teal-800">
                    {totalUnits} unidades
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {entry.notes && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Observaciones: </span>
            {entry.notes}
          </div>
        )}
      </div>
    </Modal>
  );
};

