import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Boxes,
  CalendarClock,
  Download,
  Printer,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { DataTable, type TableColumn } from '../components/DataTable';
import {
  BatchStatusBadge,
  MovementTypeBadge,
  StockLevelBadge,
} from '../components/Badge';
import { PRODUCT_CATEGORIES } from '../constants';
import { useStockCare } from '../hooks/useStockCare';
import { diffDaysFromToday, formatDateDisplay, getTodayLocalISO } from '../utils/date';
import { exportToCsv } from '../utils/exportCsv';
import {
  getBatchExpiryStatus,
  getExpiryStatusLabel,
  getProductStockSummary,
} from '../utils/inventory';

type ReportTab =
  | 'existencias'
  | 'entradas'
  | 'salidas'
  | 'movimientos'
  | 'vencimientos';

const REPORT_TABS: Array<{
  id: ReportTab;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    id: 'existencias',
    label: 'Existencias actuales',
    icon: <Boxes className="h-4 w-4" />,
  },
  {
    id: 'entradas',
    label: 'Entradas',
    icon: <ArrowDownToLine className="h-4 w-4" />,
  },
  {
    id: 'salidas',
    label: 'Salidas',
    icon: <ArrowUpFromLine className="h-4 w-4" />,
  },
  {
    id: 'movimientos',
    label: 'Movimientos',
    icon: <ArrowLeftRight className="h-4 w-4" />,
  },
  {
    id: 'vencimientos',
    label: 'Próximos a vencer',
    icon: <CalendarClock className="h-4 w-4" />,
  },
];

export const ReportsPage: React.FC = () => {
  const { products, batches, entries, exits, movements, settings, addToast } =
    useStockCare();
  const [searchParams, setSearchParams] = useSearchParams();

  const paramTab = searchParams.get('tab') as ReportTab | null;
  const activeTab: ReportTab =
    paramTab && REPORT_TABS.some((t) => t.id === paramTab)
      ? paramTab
      : 'existencias';

  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    setIsGenerating(true);
    const timer = setTimeout(() => setIsGenerating(false), 220);
    return () => clearTimeout(timer);
  }, [activeTab]);

  const setActiveTab = (tab: ReportTab) => {
    setSearchParams({ tab });
  };

  // Datos preparados por reporte
  const stockReportRows = useMemo(() => {
    return products
      .filter((p) => p.status === 'Activo')
      .filter((p) => !categoryFilter || p.category === categoryFilter)
      .map((p) => {
        const s = getProductStockSummary(p, batches, settings.expiryAlertDays);
        return {
          id: p.id,
          code: p.code,
          name: p.name,
          category: p.category,
          presentation: p.presentation,
          totalStock: s.totalStock,
          minStock: p.minStock,
          batchesCount: s.activeBatchesCount,
          status: s.stockStatus,
        };
      });
  }, [products, batches, settings.expiryAlertDays, categoryFilter]);

  const entryReportRows = useMemo(() => {
    return entries.filter((e) => {
      if (dateFrom && e.date < dateFrom) return false;
      if (dateTo && e.date > dateTo) return false;
      return true;
    });
  }, [entries, dateFrom, dateTo]);

  const exitReportRows = useMemo(() => {
    return exits.filter((s) => {
      if (dateFrom && s.date < dateFrom) return false;
      if (dateTo && s.date > dateTo) return false;
      return true;
    });
  }, [exits, dateFrom, dateTo]);

  const movementReportRows = useMemo(() => {
    return movements.filter((m) => {
      if (dateFrom && m.date < dateFrom) return false;
      if (dateTo && m.date > dateTo) return false;
      return true;
    });
  }, [movements, dateFrom, dateTo]);

  const expiryReportRows = useMemo(() => {
    return batches
      .filter((b) => b.quantity > 0)
      .map((b) => {
        const prod = products.find((p) => p.id === b.productId);
        const status = getBatchExpiryStatus(
          b.expiryDate,
          settings.expiryAlertDays
        );
        return {
          id: b.id,
          code: prod?.code ?? 'N/A',
          name: prod?.name ?? 'Producto',
          category: prod?.category ?? '',
          batchNumber: b.batchNumber,
          quantity: b.quantity,
          expiryDate: b.expiryDate,
          days: diffDaysFromToday(b.expiryDate),
          status,
        };
      })
      .filter(
        (r) =>
          (r.status === 'ProximoAVencer' || r.status === 'Vencido') &&
          (!categoryFilter || r.category === categoryFilter)
      )
      .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  }, [batches, products, settings.expiryAlertDays, categoryFilter]);

  const handleExportCsv = () => {
    const today = getTodayLocalISO();
    if (activeTab === 'existencias') {
      exportToCsv(
        `stockcare-existencias-${today}.csv`,
        ['Código', 'Producto', 'Categoría', 'Presentación', 'Lotes Activos', 'Existencia', 'Stock Mínimo', 'Nivel'],
        stockReportRows.map((r) => [
          r.code,
          r.name,
          r.category,
          r.presentation,
          r.batchesCount,
          r.totalStock,
          r.minStock,
          r.status,
        ])
      );
    } else if (activeTab === 'entradas') {
      exportToCsv(
        `stockcare-entradas-${today}.csv`,
        ['Documento', 'Fecha', 'Proveedor', 'Ítems', 'Total Unidades', 'Registrado Por'],
        entryReportRows.map((e) => [
          e.documentNumber,
          e.date,
          e.provider,
          e.items.length,
          e.items.reduce((s, i) => s + i.quantity, 0),
          e.registeredBy,
        ])
      );
    } else if (activeTab === 'salidas') {
      exportToCsv(
        `stockcare-salidas-${today}.csv`,
        ['Referencia', 'Fecha', 'Producto', 'Lote', 'Motivo', 'Cantidad', 'Responsable'],
        exitReportRows.map((s) => {
          const prod = products.find((p) => p.id === s.productId);
          return [
            s.reference,
            s.date,
            prod?.name ?? '',
            s.batchNumber,
            s.reason,
            s.quantity,
            s.registeredBy,
          ];
        })
      );
    } else if (activeTab === 'movimientos') {
      exportToCsv(
        `stockcare-movimientos-${today}.csv`,
        ['Fecha', 'Producto', 'Lote', 'Tipo', 'Cantidad', 'Referencia', 'Usuario', 'Existencia Resultante'],
        movementReportRows.map((m) => {
          const prod = products.find((p) => p.id === m.productId);
          return [
            m.date,
            prod?.name ?? '',
            m.batchNumber,
            m.type,
            m.quantity,
            m.reference,
            m.user,
            m.resultingStock,
          ];
        })
      );
    } else {
      exportToCsv(
        `stockcare-vencimientos-${today}.csv`,
        ['Código', 'Producto', 'Lote', 'Existencia', 'Fecha Vencimiento', 'Estado'],
        expiryReportRows.map((r) => [
          r.code,
          r.name,
          r.batchNumber,
          r.quantity,
          r.expiryDate,
          getExpiryStatusLabel(r.status, r.days),
        ])
      );
    }

    addToast({
      type: 'success',
      title: 'Reporte exportado en CSV',
      message: 'El archivo se ha descargado correctamente.',
    });
  };

  // Columnas por reporte
  const stockColumns: TableColumn<(typeof stockReportRows)[number]>[] = [
    {
      key: 'code',
      header: 'Código',
      render: (r) => <span className="font-mono text-xs font-bold">{r.code}</span>,
    },
    {
      key: 'name',
      header: 'Producto',
      render: (r) => (
        <div>
          <p className="font-semibold text-slate-900">{r.name}</p>
          <p className="text-xs text-slate-500">
            {r.category} • {r.presentation}
          </p>
        </div>
      ),
    },
    {
      key: 'batches',
      header: 'Lotes',
      align: 'center',
      render: (r) => <span>{r.batchesCount}</span>,
    },
    {
      key: 'stock',
      header: 'Existencia',
      align: 'right',
      render: (r) => <span className="font-bold">{r.totalStock} uds.</span>,
    },
    {
      key: 'minStock',
      header: 'Mínimo',
      align: 'right',
      render: (r) => <span className="text-slate-500">{r.minStock} uds.</span>,
    },
    {
      key: 'status',
      header: 'Estado',
      render: (r) => <StockLevelBadge status={r.status} />,
    },
  ];

  const entryColumns: TableColumn<(typeof entryReportRows)[number]>[] = [
    {
      key: 'doc',
      header: 'Documento',
      render: (e) => (
        <span className="font-mono text-xs font-bold">{e.documentNumber}</span>
      ),
    },
    {
      key: 'date',
      header: 'Fecha',
      render: (e) => <span>{formatDateDisplay(e.date)}</span>,
    },
    {
      key: 'provider',
      header: 'Proveedor',
      render: (e) => <span className="font-medium">{e.provider}</span>,
    },
    {
      key: 'lines',
      header: 'Líneas',
      align: 'center',
      render: (e) => <span>{e.items.length}</span>,
    },
    {
      key: 'units',
      header: 'Unidades ingresadas',
      align: 'right',
      render: (e) => (
        <span className="font-bold text-teal-700">
          +{e.items.reduce((s, i) => s + i.quantity, 0)} uds.
        </span>
      ),
    },
    {
      key: 'user',
      header: 'Registrado por',
      render: (e) => <span className="text-xs text-slate-600">{e.registeredBy}</span>,
    },
  ];

  const exitColumns: TableColumn<(typeof exitReportRows)[number]>[] = [
    {
      key: 'ref',
      header: 'Referencia',
      render: (s) => (
        <span className="font-mono text-xs font-bold">{s.reference}</span>
      ),
    },
    {
      key: 'date',
      header: 'Fecha',
      render: (s) => <span>{formatDateDisplay(s.date)}</span>,
    },
    {
      key: 'product',
      header: 'Producto / Lote',
      render: (s) => {
        const prod = products.find((p) => p.id === s.productId);
        return (
          <div>
            <p className="font-semibold text-slate-900">{prod?.name}</p>
            <p className="text-xs text-slate-500 font-mono">{s.batchNumber}</p>
          </div>
        );
      },
    },
    {
      key: 'reason',
      header: 'Motivo',
      render: (s) => <span className="text-xs font-medium">{s.reason}</span>,
    },
    {
      key: 'qty',
      header: 'Cantidad',
      align: 'right',
      render: (s) => (
        <span className="font-bold text-amber-700">-{s.quantity} uds.</span>
      ),
    },
  ];

  const movementColumns: TableColumn<(typeof movementReportRows)[number]>[] = [
    {
      key: 'date',
      header: 'Fecha',
      render: (m) => <span>{formatDateDisplay(m.date)}</span>,
    },
    {
      key: 'product',
      header: 'Producto / Lote',
      render: (m) => {
        const prod = products.find((p) => p.id === m.productId);
        return (
          <div>
            <p className="font-semibold text-slate-900">{prod?.name}</p>
            <p className="text-xs text-slate-500 font-mono">{m.batchNumber}</p>
          </div>
        );
      },
    },
    {
      key: 'type',
      header: 'Tipo',
      render: (m) => <MovementTypeBadge type={m.type} />,
    },
    {
      key: 'qty',
      header: 'Cantidad',
      align: 'right',
      render: (m) => (
        <span className="font-bold">
          {m.type === 'Entrada' ? `+${m.quantity}` : `-${m.quantity}`}
        </span>
      ),
    },
    {
      key: 'ref',
      header: 'Referencia',
      render: (m) => <span className="font-mono text-xs">{m.reference}</span>,
    },
    {
      key: 'resultingStock',
      header: 'Existencia resultante',
      align: 'right',
      render: (m) => (
        <span className="font-bold text-slate-900">{m.resultingStock} uds.</span>
      ),
    },
  ];

  const expiryColumns: TableColumn<(typeof expiryReportRows)[number]>[] = [
    {
      key: 'product',
      header: 'Producto',
      render: (r) => (
        <div>
          <p className="font-semibold text-slate-900">{r.name}</p>
          <p className="text-xs text-slate-500">{r.code}</p>
        </div>
      ),
    },
    {
      key: 'batch',
      header: 'Lote',
      render: (r) => (
        <span className="font-mono text-xs font-bold">{r.batchNumber}</span>
      ),
    },
    {
      key: 'qty',
      header: 'Existencia',
      align: 'right',
      render: (r) => <span className="font-bold">{r.quantity} uds.</span>,
    },
    {
      key: 'date',
      header: 'Vencimiento',
      render: (r) => <span>{formatDateDisplay(r.expiryDate)}</span>,
    },
    {
      key: 'status',
      header: 'Estado',
      render: (r) => (
        <BatchStatusBadge
          status={r.status}
          labelOverride={getExpiryStatusLabel(r.status, r.days)}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Reportes de Inventario"
        description="Consultas administrativas consolidables para control interno de existencias, movimientos y vencimientos (RF-10)."
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Reportes' },
        ]}
        useCaseCode="CU-15"
        actions={
          <>
            <Button
              variant="outline"
              leftIcon={<Printer className="h-4 w-4" />}
              onClick={() => window.print()}
            >
              Imprimir
            </Button>
            <Button
              variant="primary"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={handleExportCsv}
            >
              Exportar CSV
            </Button>
          </>
        }
      />

      {/* Selector de tipo de reporte */}
      <div className="mb-5 flex flex-wrap gap-2 no-print">
        {REPORT_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors ${
                isActive
                  ? 'border-teal-700 bg-teal-700 text-white shadow-xs'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filtros contextuales */}
      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs no-print">
        {(activeTab === 'existencias' || activeTab === 'vencimientos') ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Select
              label="Filtrar por categoría"
              placeholder="Todas las categorías"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={PRODUCT_CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input
              label="Fecha desde"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <Input
              label="Fecha hasta"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
            <div className="flex items-end">
              {(dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                  }}
                >
                  Limpiar fechas
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Vista del reporte */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs text-slate-600">
          <div>
            <span className="font-bold text-slate-900">
              {settings.pharmacyName}
            </span>{' '}
            • Reporte de{' '}
            <strong className="text-teal-800">
              {REPORT_TABS.find((t) => t.id === activeTab)?.label}
            </strong>
          </div>
          <span>Generado el {formatDateDisplay(getTodayLocalISO())}</span>
        </div>

        {activeTab === 'existencias' && (
          <DataTable
            isLoading={isGenerating}
            columns={stockColumns}
            data={stockReportRows}
            rowKey={(r) => r.id}
            emptyTitle="Sin productos activos"
          />
        )}

        {activeTab === 'entradas' && (
          <DataTable
            isLoading={isGenerating}
            columns={entryColumns}
            data={entryReportRows}
            rowKey={(r) => r.id}
            emptyTitle="Sin entradas en el rango de fechas"
          />
        )}

        {activeTab === 'salidas' && (
          <DataTable
            isLoading={isGenerating}
            columns={exitColumns}
            data={exitReportRows}
            rowKey={(r) => r.id}
            emptyTitle="Sin salidas en el rango de fechas"
          />
        )}

        {activeTab === 'movimientos' && (
          <DataTable
            isLoading={isGenerating}
            columns={movementColumns}
            data={movementReportRows}
            rowKey={(r) => r.id}
            emptyTitle="Sin movimientos en el rango de fechas"
          />
        )}

        {activeTab === 'vencimientos' && (
          <DataTable
            isLoading={isGenerating}
            columns={expiryColumns}
            data={expiryReportRows}
            rowKey={(r) => r.id}
            emptyTitle="Sin lotes vencidos ni próximos a vencer"
          />
        )}
      </div>
    </div>
  );
};

