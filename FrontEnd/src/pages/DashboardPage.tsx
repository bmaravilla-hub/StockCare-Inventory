import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpFromLine,
  Boxes,
  CalendarClock,
  FileBarChart2,
  Pill,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { MetricCard } from '../components/MetricCard';
import { Button } from '../components/Button';
import { DataTable, type TableColumn } from '../components/DataTable';
import { BatchStatusBadge, MovementTypeBadge } from '../components/Badge';
import { Alert } from '../components/Alert';
import { useStockCare } from '../hooks/useStockCare';
import { diffDaysFromToday, formatDateDisplay } from '../utils/date';
import {
  getBatchExpiryStatus,
  getExpiryStatusLabel,
  getProductStockSummary,
} from '../utils/inventory';

interface ExpiringBatchRow {
  id: string;
  productCode: string;
  productName: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
  daysRemaining: number;
  status: 'Vigente' | 'ProximoAVencer' | 'Vencido';
}

export const DashboardPage: React.FC = () => {
  const { session, products, batches, movements, settings } = useStockCare();

  const isBodega = session?.role === 'BODEGA';
  const isAdmin = session?.role === 'ADMIN';

  const metrics = useMemo(() => {
    const activeProducts = products.filter((p) => p.status === 'Activo');
    const totalUnits = batches.reduce((sum, b) => sum + b.quantity, 0);

    const lowStockProducts = activeProducts.filter((p) => {
      const summary = getProductStockSummary(p, batches, settings.expiryAlertDays);
      return summary.stockStatus === 'StockBajo' || summary.stockStatus === 'SinExistencias';
    });

    const expiringBatches = batches
      .filter((b) => {
        if (b.quantity <= 0) return false;
        const st = getBatchExpiryStatus(b.expiryDate, settings.expiryAlertDays);
        return st === 'ProximoAVencer' || st === 'Vencido';
      })
      .map((b): ExpiringBatchRow => {
        const prod = products.find((p) => p.id === b.productId);
        return {
          id: b.id,
          productCode: prod?.code ?? 'N/A',
          productName: prod?.name ?? 'Producto desconocido',
          batchNumber: b.batchNumber,
          quantity: b.quantity,
          expiryDate: b.expiryDate,
          daysRemaining: diffDaysFromToday(b.expiryDate),
          status: getBatchExpiryStatus(b.expiryDate, settings.expiryAlertDays),
        };
      })
      .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

    const expiredCount = expiringBatches.filter((b) => b.status === 'Vencido').length;
    const soonCount = expiringBatches.filter((b) => b.status === 'ProximoAVencer').length;

    return {
      totalRegisteredProducts: products.length,
      activeProductsCount: activeProducts.length,
      totalUnits,
      lowStockCount: lowStockProducts.length,
      expiringBatches,
      expiredCount,
      soonCount,
      recentMovements: movements.slice(0, 6),
    };
  }, [products, batches, movements, settings.expiryAlertDays]);

  const expiringColumns: TableColumn<ExpiringBatchRow>[] = [
    {
      key: 'product',
      header: 'Producto',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.productName}</p>
          <p className="text-xs text-slate-500">{row.productCode}</p>
        </div>
      ),
    },
    {
      key: 'batch',
      header: 'Lote',
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-slate-700">
          {row.batchNumber}
        </span>
      ),
    },
    {
      key: 'quantity',
      header: 'Existencia',
      align: 'right',
      render: (row) => <span className="font-semibold">{row.quantity} uds.</span>,
    },
    {
      key: 'expiryDate',
      header: 'Vencimiento',
      render: (row) => <span>{formatDateDisplay(row.expiryDate)}</span>,
    },
    {
      key: 'status',
      header: 'Estado',
      render: (row) => (
        <BatchStatusBadge
          status={row.status}
          labelOverride={getExpiryStatusLabel(row.status, row.daysRemaining)}
        />
      ),
    },
  ];

  const movementColumns: TableColumn<(typeof metrics.recentMovements)[number]>[] = [
    {
      key: 'date',
      header: 'Fecha',
      render: (row) => (
        <span className="text-xs font-medium text-slate-600">
          {formatDateDisplay(row.date)}
        </span>
      ),
    },
    {
      key: 'product',
      header: 'Producto',
      render: (row) => {
        const prod = products.find((p) => p.id === row.productId);
        return (
          <div>
            <p className="font-medium text-slate-900 text-xs sm:text-sm">
              {prod?.name ?? 'Producto'}
            </p>
            <p className="text-[11px] text-slate-500">Lote: {row.batchNumber}</p>
          </div>
        );
      },
    },
    {
      key: 'type',
      header: 'Tipo',
      render: (row) => <MovementTypeBadge type={row.type} />,
    },
    {
      key: 'quantity',
      header: 'Cantidad',
      align: 'right',
      render: (row) => (
        <span
          className={`font-semibold ${
            row.type === 'Entrada' ? 'text-teal-700' : 'text-amber-700'
          }`}
        >
          {row.type === 'Entrada' ? `+${row.quantity}` : `-${row.quantity}`}
        </span>
      ),
    },
    {
      key: 'resultingStock',
      header: 'Stock final',
      align: 'right',
      render: (row) => (
        <span className="font-semibold text-slate-800">{row.resultingStock}</span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Panel de Control (Dashboard)"
        description="Resumen operativo del inventario, vencimientos y movimientos recientes de la farmacia."
        useCaseCode="CU-02"
        actions={
          <>
            {isBodega && (
              <>
                <Link to="/entradas/nueva">
                  <Button
                    variant="primary"
                    leftIcon={<ArrowDownToLine className="h-4 w-4" />}
                  >
                    Registrar entrada
                  </Button>
                </Link>
                <Link to="/salidas/nueva">
                  <Button
                    variant="outline"
                    leftIcon={<ArrowUpFromLine className="h-4 w-4" />}
                  >
                    Registrar salida
                  </Button>
                </Link>
              </>
            )}
            {isAdmin && (
              <>
                <Link to="/reportes">
                  <Button
                    variant="primary"
                    leftIcon={<FileBarChart2 className="h-4 w-4" />}
                  >
                    Generar reportes
                  </Button>
                </Link>
                <Link to="/alertas">
                  <Button
                    variant="outline"
                    leftIcon={<AlertTriangle className="h-4 w-4" />}
                  >
                    Ver alertas
                  </Button>
                </Link>
              </>
            )}
          </>
        }
      />

      {metrics.expiredCount > 0 && (
        <Alert
          variant="error"
          title="Atención prioritaria: existen lotes vencidos en inventario"
          className="mb-6"
          action={
            <Link to="/alertas">
              <Button variant="danger" size="sm">
                Revisar alertas
              </Button>
            </Link>
          }
        >
          Se detectaron <strong>{metrics.expiredCount}</strong> lote(s) vencido(s) con
          existencia física y <strong>{metrics.soonCount}</strong> lote(s) próximos a
          vencer dentro de los próximos {settings.expiryAlertDays} días.
        </Alert>
      )}

      {/* Tarjetas de métricas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-6">
        <MetricCard
          title="Productos registrados"
          value={metrics.totalRegisteredProducts}
          subtitle={`${metrics.activeProductsCount} activos en catálogo`}
          icon={<Pill className="h-5 w-5" />}
          accent="teal"
          to="/productos"
        />
        <MetricCard
          title="Unidades en inventario"
          value={metrics.totalUnits}
          subtitle="Existencia física total"
          icon={<Boxes className="h-5 w-5" />}
          accent="emerald"
          to="/inventario"
        />
        <MetricCard
          title="Stock bajo / agotado"
          value={metrics.lowStockCount}
          subtitle="Requieren reposición"
          icon={<AlertTriangle className="h-5 w-5" />}
          accent={metrics.lowStockCount > 0 ? 'amber' : 'slate'}
          to="/inventario?nivel=bajo"
        />
        <MetricCard
          title="Próximos a vencer"
          value={metrics.soonCount + metrics.expiredCount}
          subtitle={`${metrics.expiredCount} vencido(s) • ${metrics.soonCount} por vencer`}
          icon={<CalendarClock className="h-5 w-5" />}
          accent={metrics.expiredCount > 0 ? 'rose' : 'amber'}
          to="/alertas"
        />
        <MetricCard
          title="Movimientos recientes"
          value={movements.length}
          subtitle="Trazabilidad entrada/salida"
          icon={<ArrowLeftRight className="h-5 w-5" />}
          accent="slate"
          to="/movimientos"
        />
      </div>

      {/* Accesos rápidos operativos */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Accesos rápidos del inventario
            </h2>
            <p className="text-xs text-slate-500">
              {isBodega
                ? 'Registre recepciones de proveedores o salidas de mercadería de forma inmediata.'
                : 'Consulte existencias, lotes vigentes y reportes administrativos del inventario.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isBodega ? (
              <>
                <Link to="/entradas/nueva">
                  <Button
                    size="sm"
                    variant="primary"
                    leftIcon={<ArrowDownToLine className="h-3.5 w-3.5" />}
                  >
                    Nueva entrada
                  </Button>
                </Link>
                <Link to="/salidas/nueva">
                  <Button
                    size="sm"
                    variant="secondary"
                    leftIcon={<ArrowUpFromLine className="h-3.5 w-3.5" />}
                  >
                    Nueva salida
                  </Button>
                </Link>
                <Link to="/productos/nuevo">
                  <Button size="sm" variant="outline">
                    Nuevo producto
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/inventario">
                  <Button size="sm" variant="outline">
                    Consultar existencias
                  </Button>
                </Link>
                <Link to="/lotes">
                  <Button size="sm" variant="outline">
                    Control de lotes
                  </Button>
                </Link>
                <Link to="/movimientos">
                  <Button size="sm" variant="outline">
                    Historial de movimientos
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tablas del Dashboard */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Productos próximos a vencer y vencidos
              </h2>
              <p className="text-xs text-slate-500">
                Lotes con vencimiento menor o igual a {settings.expiryAlertDays} días
              </p>
            </div>
            <Link
              to="/lotes"
              className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800"
            >
              Ver todos los lotes
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <DataTable
            columns={expiringColumns}
            data={metrics.expiringBatches.slice(0, 6)}
            rowKey={(r) => r.id}
            emptyTitle="Sin lotes próximos a vencer"
            emptyDescription="Todos los lotes con existencias cuentan con fecha de vencimiento vigente."
          />
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Últimos movimientos registrados
              </h2>
              <p className="text-xs text-slate-500">
                Entradas y salidas recientes con existencia resultante
              </p>
            </div>
            <Link
              to="/movimientos"
              className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800"
            >
              Ver historial completo
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <DataTable
            columns={movementColumns}
            data={metrics.recentMovements}
            rowKey={(r) => r.id}
            emptyTitle="Sin movimientos registrados"
            emptyDescription="Aún no se han registrado entradas ni salidas."
          />
        </section>
      </div>
    </div>
  );
};

