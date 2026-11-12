import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  Clock,
  FileBarChart2,
  XCircle,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';
import { BatchStatusBadge, StockLevelBadge } from '../components/Badge';
import { useStockCare } from '../hooks/useStockCare';
import { diffDaysFromToday, formatDateDisplay } from '../utils/date';
import {
  getBatchExpiryStatus,
  getExpiryStatusLabel,
  getProductStockSummary,
} from '../utils/inventory';

export const AlertsPage: React.FC = () => {
  const { session, batches, products, settings } = useStockCare();
  const isBodega = session?.role === 'BODEGA';
  const isAdmin = session?.role === 'ADMIN';

  const { expiredBatches, expiringSoonBatches, lowStockProducts } = useMemo(() => {
    const expired: Array<{
      id: string;
      productId: string;
      productCode: string;
      productName: string;
      batchNumber: string;
      quantity: number;
      expiryDate: string;
      days: number;
    }> = [];

    const soon: typeof expired = [];

    for (const b of batches) {
      if (b.quantity <= 0) continue;
      const prod = products.find((p) => p.id === b.productId);
      const status = getBatchExpiryStatus(b.expiryDate, settings.expiryAlertDays);
      const days = diffDaysFromToday(b.expiryDate);
      const entry = {
        id: b.id,
        productId: b.productId,
        productCode: prod?.code ?? 'N/A',
        productName: prod?.name ?? 'Producto',
        batchNumber: b.batchNumber,
        quantity: b.quantity,
        expiryDate: b.expiryDate,
        days,
      };
      if (status === 'Vencido') expired.push(entry);
      else if (status === 'ProximoAVencer') soon.push(entry);
    }

    expired.sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
    soon.sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

    const lowStock = products
      .filter((p) => p.status === 'Activo')
      .map((p) => ({
        product: p,
        summary: getProductStockSummary(p, batches, settings.expiryAlertDays),
      }))
      .filter(
        ({ summary }) =>
          summary.stockStatus === 'StockBajo' ||
          summary.stockStatus === 'SinExistencias'
      );

    return {
      expiredBatches: expired,
      expiringSoonBatches: soon,
      lowStockProducts: lowStock,
    };
  }, [batches, products, settings.expiryAlertDays]);

  const noAlerts =
    expiredBatches.length === 0 &&
    expiringSoonBatches.length === 0 &&
    lowStockProducts.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alertas de Vencimiento y Existencias"
        description={`Monitoreo preventivo de lotes vencidos, próximos a vencer (≤ ${settings.expiryAlertDays} días) y productos con bajo nivel de stock (RF-07).`}
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Alertas' },
        ]}
        useCaseCode="CU-13"
        actions={
          isAdmin && (
            <Link to="/reportes?tab=vencimientos">
              <Button
                variant="primary"
                leftIcon={<FileBarChart2 className="h-4 w-4" />}
              >
                Ver reporte de vencimientos
              </Button>
            </Link>
          )
        }
      />

      {noAlerts && (
        <Alert variant="success" title="Sin alertas activas">
          Todos los lotes se encuentran vigentes y los productos activos cuentan
          con existencias por encima de su nivel mínimo.
        </Alert>
      )}

      {/* 1. Lotes vencidos */}
      <section className="rounded-xl border border-rose-200 bg-white overflow-hidden shadow-2xs">
        <div className="flex items-center justify-between border-b border-rose-100 bg-rose-50/70 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <XCircle className="h-5 w-5 text-rose-700" />
            <div>
              <h2 className="text-sm font-bold text-rose-950">
                Lotes vencidos con existencia física ({expiredBatches.length})
              </h2>
              <p className="text-xs text-rose-800">
                Deben retirarse de comercialización mediante salida por descarte o
                devolución al proveedor.
              </p>
            </div>
          </div>
        </div>

        {expiredBatches.length === 0 ? (
          <div className="flex items-center gap-2 px-5 py-6 text-xs text-slate-500">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            No hay lotes vencidos con unidades en bodega.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {expiredBatches.map((b) => (
              <div
                key={b.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-600">
                      {b.productCode}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {b.productName}
                    </span>
                    <BatchStatusBadge
                      status="Vencido"
                      labelOverride={getExpiryStatusLabel('Vencido', b.days)}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    Lote <span className="font-mono font-semibold">{b.batchNumber}</span> •{' '}
                    Existencia: <strong>{b.quantity} uds.</strong> • Venció el{' '}
                    {formatDateDisplay(b.expiryDate)}
                  </p>
                </div>

                {isBodega && (
                  <Link
                    to={`/salidas/nueva?productId=${b.productId}&batchId=${b.id}&reason=${encodeURIComponent(
                      'Descarte por vencimiento'
                    )}`}
                  >
                    <Button
                      size="sm"
                      variant="danger"
                      leftIcon={<ArrowUpFromLine className="h-3.5 w-3.5" />}
                    >
                      Registrar descarte
                    </Button>
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 2. Lotes próximos a vencer */}
      <section className="rounded-xl border border-amber-200 bg-white overflow-hidden shadow-2xs">
        <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50/70 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <Clock className="h-5 w-5 text-amber-700" />
            <div>
              <h2 className="text-sm font-bold text-amber-950">
                Lotes próximos a vencer ({expiringSoonBatches.length})
              </h2>
              <p className="text-xs text-amber-800">
                Priorizar rotación (FEFO) o gestionar cambio con el proveedor.
              </p>
            </div>
          </div>
        </div>

        {expiringSoonBatches.length === 0 ? (
          <div className="flex items-center gap-2 px-5 py-6 text-xs text-slate-500">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            No hay lotes próximos a vencer en la ventana configurada.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {expiringSoonBatches.map((b) => (
              <div
                key={b.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-600">
                      {b.productCode}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {b.productName}
                    </span>
                    <BatchStatusBadge
                      status="ProximoAVencer"
                      labelOverride={getExpiryStatusLabel(
                        'ProximoAVencer',
                        b.days
                      )}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    Lote <span className="font-mono font-semibold">{b.batchNumber}</span> •{' '}
                    Existencia: <strong>{b.quantity} uds.</strong> • Vence el{' '}
                    {formatDateDisplay(b.expiryDate)}
                  </p>
                </div>

                {isBodega && (
                  <Link
                    to={`/salidas/nueva?productId=${b.productId}&batchId=${b.id}&reason=Venta`}
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<ArrowUpFromLine className="h-3.5 w-3.5" />}
                    >
                      Priorizar salida
                    </Button>
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Stock bajo / Sin existencias */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Productos con bajo nivel de existencia o agotados (
                {lowStockProducts.length})
              </h2>
              <p className="text-xs text-slate-500">
                Existencia actual menor o igual al stock mínimo configurado.
              </p>
            </div>
          </div>
        </div>

        {lowStockProducts.length === 0 ? (
          <div className="flex items-center gap-2 px-5 py-6 text-xs text-slate-500">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Todos los productos activos mantienen stock saludable.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {lowStockProducts.map(({ product, summary }) => (
              <div
                key={product.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-600">
                      {product.code}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {product.name}
                    </span>
                    <StockLevelBadge status={summary.stockStatus} />
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    Existencia actual: <strong>{summary.totalStock} uds.</strong>{' '}
                    • Stock mínimo requerido: <strong>{product.minStock} uds.</strong>
                  </p>
                </div>

                {isBodega && (
                  <Link to="/entradas/nueva">
                    <Button
                      size="sm"
                      variant="primary"
                      leftIcon={<ArrowDownToLine className="h-3.5 w-3.5" />}
                    >
                      Registrar entrada
                    </Button>
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

