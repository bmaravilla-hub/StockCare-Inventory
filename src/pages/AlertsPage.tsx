import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  Clock,
  FileBarChart2,
  Loader2,
  PackageX,
  XCircle,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';
import { BatchStatusBadge, StockLevelBadge } from '../components/Badge';
import { useStockCare } from '../hooks/useStockCare';
import { formatDateDisplay } from '../utils/date';
import {
  getExpiryStatusLabel,
  getInventoryAlerts,
} from '../utils/inventory';

export const AlertsPage: React.FC = () => {
  const {
    session,
    batches,
    products,
    settings,
    isLoadingProducts,
    isBatchesLoading,
    productsError,
    batchesError,
  } = useStockCare();

  const isBodega = session?.role === 'BODEGA';
  const isAdmin = session?.role === 'ADMIN';

  const isLoading = isLoadingProducts || isBatchesLoading;
  const loadError = productsError || batchesError;

  const alerts = useMemo(() => {
    return getInventoryAlerts(products, batches, settings.expiryAlertDays);
  }, [products, batches, settings.expiryAlertDays]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alertas de Vencimiento y Existencias"
        description={`Monitoreo preventivo en tiempo real de lotes vencidos, productos agotados, stock bajo y próximos a vencer (≤ ${settings.expiryAlertDays} días) (RF-07).`}
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

      {/* Manejo de estados de carga y error */}
      {isLoading && (
        <div className="flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white p-8 text-slate-500 shadow-2xs">
          <Loader2 className="h-5 w-5 animate-spin text-[#0E3B66]" />
          <span className="text-sm font-medium">Sincronizando alertas con Firestore...</span>
        </div>
      )}

      {loadError && (
        <Alert variant="error" title="Error de sincronización">
          Ocurrió un problema al sincronizar los datos en tiempo real: {loadError}
        </Alert>
      )}

      {/* Resumen numérico de alertas por categoría */}
      {!isLoading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-900">1. Vencidos</span>
              <XCircle className="h-4 w-4 text-rose-600" />
            </div>
            <p className="mt-1 text-2xl font-black text-rose-950">
              {alerts.expiredBatches.length}
            </p>
            <p className="text-[11px] text-rose-700">Lotes con existencia física</p>
          </div>

          <div className="rounded-xl border border-red-200 bg-red-50/50 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-900">2. Agotados</span>
              <PackageX className="h-4 w-4 text-red-600" />
            </div>
            <p className="mt-1 text-2xl font-black text-red-950">
              {alerts.outOfStockProducts.length}
            </p>
            <p className="text-[11px] text-red-700">Productos con 0 unidades</p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900">3. Stock bajo</span>
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-1 text-2xl font-black text-amber-950">
              {alerts.lowStockProducts.length}
            </p>
            <p className="text-[11px] text-amber-700">Existencia ≤ stock mínimo</p>
          </div>

          <div className="rounded-xl border border-yellow-200 bg-yellow-50/50 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-yellow-900">4. Próx. a vencer</span>
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
            <p className="mt-1 text-2xl font-black text-yellow-950">
              {alerts.expiringSoonBatches.length}
            </p>
            <p className="text-[11px] text-yellow-700">≤ {settings.expiryAlertDays} días restantes</p>
          </div>
        </div>
      )}

      {/* Empty state general */}
      {!isLoading && alerts.totalAlerts === 0 && (
        <Alert variant="success" title="No hay alertas activas.">
          Todos los lotes se encuentran vigentes y los productos activos cuentan
          con existencias por encima de su nivel mínimo requerido.
        </Alert>
      )}

      {/* ============================================================== */}
      {/* PRIORIDAD 1: LOTES VENCIDOS                                   */}
      {/* ============================================================== */}
      {!isLoading && (
        <section className="rounded-xl border border-rose-200 bg-white overflow-hidden shadow-2xs">
          <div className="flex items-center justify-between border-b border-rose-100 bg-rose-50/70 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <XCircle className="h-5 w-5 text-rose-700" />
              <div>
                <h2 className="text-sm font-bold text-rose-950">
                  1. Lotes vencidos con existencia física ({alerts.expiredBatches.length})
                </h2>
                <p className="text-xs text-rose-800">
                  Deben retirarse de inmediato de comercialización mediante salida por descarte o devolución.
                </p>
              </div>
            </div>
          </div>

          {alerts.expiredBatches.length === 0 ? (
            <div className="flex items-center gap-2 px-5 py-6 text-xs text-slate-500">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              No hay lotes vencidos con existencias en bodega.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {alerts.expiredBatches.map((b) => (
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
                        labelOverride={getExpiryStatusLabel('Vencido', b.daysRemaining)}
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
      )}

      {/* ============================================================== */}
      {/* PRIORIDAD 2: PRODUCTOS AGOTADOS (STOCK == 0)                   */}
      {/* ============================================================== */}
      {!isLoading && (
        <section className="rounded-xl border border-red-200 bg-white overflow-hidden shadow-2xs">
          <div className="flex items-center justify-between border-b border-red-100 bg-red-50/70 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <PackageX className="h-5 w-5 text-red-700" />
              <div>
                <h2 className="text-sm font-bold text-red-950">
                  2. Productos activos agotados ({alerts.outOfStockProducts.length})
                </h2>
                <p className="text-xs text-red-800">
                  Productos activos sin existencias físicas disponibles en bodega.
                </p>
              </div>
            </div>
          </div>

          {alerts.outOfStockProducts.length === 0 ? (
            <div className="flex items-center gap-2 px-5 py-6 text-xs text-slate-500">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              No hay productos activos completamente agotados.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {alerts.outOfStockProducts.map(({ product, minStock }) => (
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
                      <StockLevelBadge status="SinExistencias" />
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      Existencia actual: <strong className="text-red-700">0 uds.</strong> • Stock mínimo requerido:{' '}
                      <strong>{minStock} uds.</strong>
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
      )}

      {/* ============================================================== */}
      {/* PRIORIDAD 3: PRODUCTOS CON STOCK BAJO (0 < STOCK <= MIN)       */}
      {/* ============================================================== */}
      {!isLoading && (
        <section className="rounded-xl border border-amber-200 bg-white overflow-hidden shadow-2xs">
          <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div>
                <h2 className="text-sm font-bold text-amber-950">
                  3. Productos con stock bajo ({alerts.lowStockProducts.length})
                </h2>
                <p className="text-xs text-amber-800">
                  Existencia actual menor o igual al stock mínimo configurado.
                </p>
              </div>
            </div>
          </div>

          {alerts.lowStockProducts.length === 0 ? (
            <div className="flex items-center gap-2 px-5 py-6 text-xs text-slate-500">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Todos los productos con inventario superan el stock de seguridad.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {alerts.lowStockProducts.map(({ product, currentStock, minStock }) => (
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
                      <StockLevelBadge status="StockBajo" />
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      Existencia actual: <strong className="text-amber-800">{currentStock} uds.</strong> • Stock mínimo requerido:{' '}
                      <strong>{minStock} uds.</strong>
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
      )}

      {/* ============================================================== */}
      {/* PRIORIDAD 4: LOTES PRÓXIMOS A VENCER                          */}
      {/* ============================================================== */}
      {!isLoading && (
        <section className="rounded-xl border border-yellow-200 bg-white overflow-hidden shadow-2xs">
          <div className="flex items-center justify-between border-b border-yellow-100 bg-yellow-50/70 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <Clock className="h-5 w-5 text-yellow-700" />
              <div>
                <h2 className="text-sm font-bold text-yellow-950">
                  4. Lotes próximos a vencer ({alerts.expiringSoonBatches.length})
                </h2>
                <p className="text-xs text-yellow-800">
                  Priorizar rotación de despacho (FEFO) o gestionar reemplazo preventivo.
                </p>
              </div>
            </div>
          </div>

          {alerts.expiringSoonBatches.length === 0 ? (
            <div className="flex items-center gap-2 px-5 py-6 text-xs text-slate-500">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              No hay lotes próximos a vencer dentro del horizonte de {settings.expiryAlertDays} días.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {alerts.expiringSoonBatches.map((b) => (
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
                          b.daysRemaining
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
      )}
    </div>
  );
};
