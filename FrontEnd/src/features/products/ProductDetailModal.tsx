import React from 'react';
import { Link } from 'react-router-dom';
import { Edit3 } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import {
  BatchStatusBadge,
  ProductStatusBadge,
  StockLevelBadge,
} from '../../components/Badge';
import type { Batch, Product } from '../../types';
import { diffDaysFromToday, formatDateDisplay } from '../../utils/date';
import {
  getBatchExpiryStatus,
  getExpiryStatusLabel,
  getProductStockSummary,
} from '../../utils/inventory';

interface ProductDetailModalProps {
  product: Product | null;
  batches: Batch[];
  alertThresholdDays: number;
  canEdit: boolean;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  batches,
  alertThresholdDays,
  canEdit,
  onClose,
}) => {
  if (!product) return null;

  const summary = getProductStockSummary(product, batches, alertThresholdDays);

  return (
    <Modal
      isOpen={Boolean(product)}
      onClose={onClose}
      title={`${product.code} — ${product.name}`}
      description="Detalle general del producto y lotes disponibles en inventario"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          {canEdit && (
            <Link to={`/productos/${product.id}/editar`} onClick={onClose}>
              <Button variant="primary" leftIcon={<Edit3 className="h-4 w-4" />}>
                Editar producto
              </Button>
            </Link>
          )}
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Categoría
            </p>
            <p className="mt-0.5 text-sm font-medium text-slate-900">
              {product.category}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Presentación
            </p>
            <p className="mt-0.5 text-sm font-medium text-slate-900">
              {product.presentation}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Existencia total / Mínimo
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-base font-bold text-slate-900">
                {summary.totalStock} uds.
              </span>
              <span className="text-xs text-slate-500">
                (Mín: {product.minStock})
              </span>
              <StockLevelBadge status={summary.stockStatus} />
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Estado en catálogo
            </p>
            <div className="mt-1">
              <ProductStatusBadge status={product.status} />
            </div>
          </div>
          {product.description && (
            <div className="sm:col-span-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Descripción
              </p>
              <p className="mt-0.5 text-sm text-slate-700">
                {product.description}
              </p>
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-2.5">
            Lotes asociados con existencia ({summary.batches.length})
          </h3>
          {summary.batches.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
              Este producto no tiene lotes con existencia disponible actualmente.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">
                      Número de lote
                    </th>
                    <th className="px-3 py-2 text-right font-semibold text-slate-600">
                      Existencia
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">
                      Vencimiento
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {summary.batches.map((b) => {
                    const st = getBatchExpiryStatus(b.expiryDate, alertThresholdDays);
                    const days = diffDaysFromToday(b.expiryDate);
                    return (
                      <tr key={b.id}>
                        <td className="px-3 py-2.5 font-mono font-semibold text-slate-800">
                          {b.batchNumber}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold text-slate-900">
                          {b.quantity} uds.
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">
                          {formatDateDisplay(b.expiryDate)}
                        </td>
                        <td className="px-3 py-2.5">
                          <BatchStatusBadge
                            status={st}
                            labelOverride={getExpiryStatusLabel(st, days)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

