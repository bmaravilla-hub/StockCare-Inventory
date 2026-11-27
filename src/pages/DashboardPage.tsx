import React, { useMemo, useState } from 'react';
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
  Loader2,
  Pill,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { MetricCard } from '../components/MetricCard';
import { Button } from '../components/Button';
import { DataTable, type TableColumn } from '../components/DataTable';
import { BatchStatusBadge, MovementTypeBadge } from '../components/Badge';
import { Alert } from '../components/Alert';
import { useStockCare } from '../hooks/useStockCare';
import { formatDateDisplay } from '../utils/date';
import {
  getExpiryStatusLabel,
  getInventoryAlerts,
} from '../utils/inventory';
import type { EntryRecord, ExitRecord, MovementRecord } from '../types';

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

type RecentActivityTab = 'movements' | 'entries' | 'exits';

export const DashboardPage: React.FC = () => {
  const {
    session,
    products,
    batches,
    movements,
    entries,
    exits,
    settings,
    isLoadingProducts,
    isBatchesLoading,
    isMovementsLoading,
    isEntriesLoading,
    isExitsLoading,
    productsError,
    batchesError,
    movementsError,
    entriesError,
    exitsError,
  } = useStockCare();

  const [activityTab, setActivityTab] = useState<RecentActivityTab>('movements');

  const isBodega = session?.role === 'BODEGA';
  const isAdmin = session?.role === 'ADMIN';

  const isLoading =
    isLoadingProducts ||
    isBatchesLoading ||
    isMovementsLoading ||
    isEntriesLoading ||
    isExitsLoading;

  const loadError =
    productsError ||
    batchesError ||
    movementsError ||
    entriesError ||
    exitsError;

  const metrics = useMemo(() => {
    const activeProducts = products.filter((p) => p.status === 'Activo');

    // Existencia total: suma de currentStock de productos activos
    const totalUnits = activeProducts.reduce(
      (sum, p) => sum + (typeof p.currentStock === 'number' ? p.currentStock : 0),
      0
    );

    // Alertas centralizadas (exactamente igual a AlertsPage)
    const alerts = getInventoryAlerts(products, batches, settings.expiryAlertDays);

    const expiringBatches: ExpiringBatchRow[] = [
      ...alerts.expiredBatches.map((b) => ({
        id: b.id,
        productCode: b.productCode,
        productName: b.productName,
        batchNumber: b.batchNumber,
        quantity: b.quantity,
        expiryDate: b.expiryDate,
        daysRemaining: b.daysRemaining,
        status: 'Vencido' as const,
      })),
      ...alerts.expiringSoonBatches.map((b) => ({
        id: b.id,
        productCode: b.productCode,
        productName: b.productName,
        batchNumber: b.batchNumber,
        quantity: b.quantity,
        expiryDate: b.expiryDate,
        daysRemaining: b.daysRemaining,
        status: 'ProximoAVencer' as const,
      })),
    ].sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

    // Actividades recientes ordenadas por fecha/creación descendente
    const recentMovements = [...movements]
      .sort((a, b) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date))
      .slice(0, 5);

    const recentEntries = [...entries]
      .sort((a, b) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date))
      .slice(0, 5);

    const recentExits = [...exits]
      .sort((a, b) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date))
      .slice(0, 5);

    return {
      totalRegisteredProducts: products.length,
      activeProductsCount: activeProducts.length,
      totalUnits,
      outOfStockCount: alerts.outOfStockProducts.length,
      lowStockCount: alerts.lowStockProducts.length,
      expiredCount: alerts.expiredBatches.length,
      soonCount: alerts.expiringSoonBatches.length,
      expiringBatches,
      recentMovements,
      recentEntries,
      recentExits,
    };
  }, [products, batches, movements, entries, exits, settings.expiryAlertDays]);

  // Columnas para tabla de lotes críticos (próximos a vencer y vencidos)
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

  // Columnas para Movimientos recientes (Kardex)
  const movementColumns: TableColumn<MovementRecord>[] = [
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
        const name = row.productName || prod?.name || 'Producto';
        return (
          <div>
            <p className="font-medium text-slate-900 text-xs sm:text-sm">{name}</p>
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

  // Columnas para Entradas recientes
  const entryColumns: TableColumn<EntryRecord>[] = [
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
      key: 'doc',
      header: 'Documento',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-slate-800">
          {row.documentNumber}
        </span>
      ),
    },
    {
      key: 'supplier',
      header: 'Proveedor',
      render: (row) => (
        <span className="text-xs font-medium text-slate-700">
          {row.supplierName || row.provider}
        </span>
      ),
    },
    {
      key: 'units',
      header: 'Unidades',
      align: 'right',
      render: (row) => {
        const units = row.items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0;
        return <span className="font-semibold text-teal-700">+{units} uds.</span>;
      },
    },
    {
      key: 'user',
      header: 'Registrado por',
      render: (row) => (
        <span className="text-xs text-slate-500">{row.registeredBy}</span>
      ),
    },
  ];

  // Columnas para Salidas recientes
  const exitColumns: TableColumn<ExitRecord>[] = [
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
        const name = row.productName || prod?.name || 'Producto';
        return (
          <div>
            <p className="font-medium text-slate-900 text-xs sm:text-sm">{name}</p>
            <p className="text-[11px] text-slate-500 font-mono">Lote: {row.batchNumber}</p>
          </div>
        );
      },
    },
    {
      key: 'quantity',
      header: 'Cantidad',
      align: 'right',
      render: (row) => (
        <span className="font-semibold text-amber-700">-{row.quantity} uds.</span>
      ),
    },
    {
      key: 'reason',
      header: 'Motivo',
      render: (row) => (
        <span className="text-xs text-slate-700">{row.reason}</span>
      ),
    },
    {
      key: 'user',
      header: 'Responsable',
      render: (row) => (
        <span className="text-xs text-slate-500">{row.registeredBy}</span>
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

      {/* Indicador de carga inicial */}
      {isLoading && (
        <div className="mb-6 flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white p-6 text-slate-500 shadow-2xs">
          <Loader2 className="h-5 w-5 animate-spin text-[#0E3B66]" />
          <span className="text-sm font-medium">Sincronizando panel con Firestore...</span>
        </div>
      )}

      {/* Manejo de error de sincronización */}
      {loadError && (
        <Alert variant="error" title="Error de sincronización con Firestore" className="mb-6">
          {loadError}
        </Alert>
      )}

      {/* Alerta de lotes vencidos */}
      {!isLoading && metrics.expiredCount > 0 && (
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

      {/* Tarjetas de métricas principales */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-6">
        <MetricCard
          title="Productos registrados"
          value={isLoading ? '-' : metrics.totalRegisteredProducts}
          subtitle={`${metrics.activeProductsCount} activos en catálogo`}
          icon={<Pill className="h-5 w-5" />}
          accent="teal"
          to="/productos"
        />
        <MetricCard
          title="Unidades en inventario"
          value={isLoading ? '-' : metrics.totalUnits}
          subtitle="Existencia física activa"
          icon={<Boxes className="h-5 w-5" />}
          accent="emerald"
          to="/inventario"
        />
        <MetricCard
          title="Stock bajo / agotado"
          value={isLoading ? '-' : metrics.lowStockCount + metrics.outOfStockCount}
          subtitle={`${metrics.outOfStockCount} agotados • ${metrics.lowStockCount} con stock bajo`}
          icon={<AlertTriangle className="h-5 w-5" />}
          accent={metrics.lowStockCount + metrics.outOfStockCount > 0 ? 'amber' : 'slate'}
          to="/alertas"
        />
        <MetricCard
          title="Próximos a vencer"
          value={isLoading ? '-' : metrics.soonCount + metrics.expiredCount}
          subtitle={`${metrics.expiredCount} vencido(s) • ${metrics.soonCount} por vencer`}
          icon={<CalendarClock className="h-5 w-5" />}
          accent={metrics.expiredCount > 0 ? 'rose' : 'amber'}
          to="/alertas"
        />
        <MetricCard
          title="Movimientos Kardex"
          value={isLoading ? '-' : movements.length}
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
        {/* Tabla 1: Lotes próximos a vencer y vencidos */}
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
              to="/alertas"
              className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800"
            >
              Ver todas las alertas
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <DataTable
            columns={expiringColumns}
            data={metrics.expiringBatches.slice(0, 5)}
            rowKey={(r) => r.id}
            isLoading={isLoading}
            emptyTitle="Sin lotes próximos a vencer"
            emptyDescription="Todos los lotes con existencias cuentan con fecha de vencimiento vigente."
          />
        </section>

        {/* Tabla 2: Actividad operativa reciente con pestañas */}
        <section className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Actividad operativa reciente
              </h2>
              <p className="text-xs text-slate-500">
                Últimas transacciones registradas en tiempo real
              </p>
            </div>

            {/* Selector de pestaña para actividad reciente */}
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setActivityTab('movements')}
                className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${
                  activityTab === 'movements'
                    ? 'bg-white text-teal-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Movimientos
              </button>
              <button
                type="button"
                onClick={() => setActivityTab('entries')}
                className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${
                  activityTab === 'entries'
                    ? 'bg-white text-teal-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Entradas
              </button>
              <button
                type="button"
                onClick={() => setActivityTab('exits')}
                className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${
                  activityTab === 'exits'
                    ? 'bg-white text-teal-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Salidas
              </button>
            </div>
          </div>

          {activityTab === 'movements' && (
            <div>
              <DataTable
                columns={movementColumns}
                data={metrics.recentMovements}
                rowKey={(r) => r.id}
                isLoading={isLoading}
                emptyTitle="No hay movimientos registrados"
                emptyDescription="Aún no se han registrado transacciones de inventario."
              />
              <div className="mt-2 text-right">
                <Link
                  to="/movimientos"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800"
                >
                  Ver Kardex completo
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}

          {activityTab === 'entries' && (
            <div>
              <DataTable
                columns={entryColumns}
                data={metrics.recentEntries}
                rowKey={(r) => r.id}
                isLoading={isLoading}
                emptyTitle="No hay entradas registradas"
                emptyDescription="Aún no se han recibido recepciones de inventario."
              />
              <div className="mt-2 text-right">
                <Link
                  to="/entradas"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800"
                >
                  Ver historial de entradas
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}

          {activityTab === 'exits' && (
            <div>
              <DataTable
                columns={exitColumns}
                data={metrics.recentExits}
                rowKey={(r) => r.id}
                isLoading={isLoading}
                emptyTitle="No hay salidas registradas"
                emptyDescription="Aún no se han registrado despachos ni salidas de mercadería."
              />
              <div className="mt-2 text-right">
                <Link
                  to="/salidas"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800"
                >
                  Ver historial de salidas
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
