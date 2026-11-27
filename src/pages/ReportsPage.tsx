import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Boxes,
  CalendarClock,
  Download,
  Filter,
  Printer,
  RotateCcw,
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
import { EXIT_REASONS, PRODUCT_CATEGORIES } from '../constants';
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
    label: 'Movimientos (Kardex)',
    icon: <ArrowLeftRight className="h-4 w-4" />,
  },
  {
    id: 'vencimientos',
    label: 'Control de Vencimientos',
    icon: <CalendarClock className="h-4 w-4" />,
  },
];

export const ReportsPage: React.FC = () => {
  const {
    products,
    batches,
    entries,
    exits,
    movements,
    suppliers,
    settings,
    isLoadingProducts,
    isBatchesLoading,
    isEntriesLoading,
    isExitsLoading,
    isMovementsLoading,
    addToast,
  } = useStockCare();

  const [searchParams, setSearchParams] = useSearchParams();

  const paramTab = searchParams.get('tab') as ReportTab | null;
  const activeTab: ReportTab =
    paramTab && REPORT_TABS.some((t) => t.id === paramTab)
      ? paramTab
      : 'existencias';

  const isLoading =
    isLoadingProducts ||
    isBatchesLoading ||
    isEntriesLoading ||
    isExitsLoading ||
    isMovementsLoading;

  // Filtros generales
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [reasonFilter, setReasonFilter] = useState('');
  const [movementTypeFilter, setMovementTypeFilter] = useState('');
  const [expiryStatusFilter, setExpiryStatusFilter] = useState('');

  const setActiveTab = (tab: ReportTab) => {
    setSearchParams({ tab });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('');
    setDateFrom('');
    setDateTo('');
    setSupplierFilter('');
    setReasonFilter('');
    setMovementTypeFilter('');
    setExpiryStatusFilter('');
  };

  const hasActiveFilters = Boolean(
    searchTerm ||
    categoryFilter ||
    dateFrom ||
    dateTo ||
    supplierFilter ||
    reasonFilter ||
    movementTypeFilter ||
    expiryStatusFilter
  );

  // ==============================================================
  // 1. REPORTE DE EXISTENCIAS (INVENTARIO ACTUAL)
  // ==============================================================
  const stockReportRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return products
      .filter((p) => p.status === 'Activo')
      .filter((p) => !categoryFilter || p.category === categoryFilter)
      .filter((p) => {
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.presentation.toLowerCase().includes(q)
        );
      })
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
  }, [products, batches, settings.expiryAlertDays, categoryFilter, searchTerm]);

  const stockTotalUnits = useMemo(() => {
    return stockReportRows.reduce((acc, r) => acc + r.totalStock, 0);
  }, [stockReportRows]);

  // ==============================================================
  // 2. REPORTE DE ENTRADAS
  // ==============================================================
  const entryReportRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return entries.filter((e) => {
      // Rangos de fecha inclusivos
      if (dateFrom && e.date < dateFrom) return false;
      if (dateTo && e.date > dateTo) return false;
      if (supplierFilter && e.supplierId !== supplierFilter) return false;
      if (q) {
        const providerName = (e.supplierName || e.provider || '').toLowerCase();
        const docNum = (e.documentNumber || '').toLowerCase();
        const regBy = (e.registeredBy || '').toLowerCase();
        if (!providerName.includes(q) && !docNum.includes(q) && !regBy.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [entries, dateFrom, dateTo, supplierFilter, searchTerm]);

  const entryTotalUnits = useMemo(() => {
    return entryReportRows.reduce(
      (sum, e) => sum + e.items.reduce((s, i) => s + (i.quantity || 0), 0),
      0
    );
  }, [entryReportRows]);

  // ==============================================================
  // 3. REPORTE DE SALIDAS
  // ==============================================================
  const exitReportRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return exits.filter((s) => {
      // Rangos de fecha inclusivos
      if (dateFrom && s.date < dateFrom) return false;
      if (dateTo && s.date > dateTo) return false;
      if (reasonFilter && s.reason !== reasonFilter) return false;
      if (q) {
        const prod = products.find((p) => p.id === s.productId);
        const name = (s.productName || prod?.name || '').toLowerCase();
        const code = (s.productCode || prod?.code || '').toLowerCase();
        const batch = (s.batchNumber || '').toLowerCase();
        const ref = (s.reference || '').toLowerCase();
        const user = (s.registeredBy || '').toLowerCase();
        if (
          !name.includes(q) &&
          !code.includes(q) &&
          !batch.includes(q) &&
          !ref.includes(q) &&
          !user.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [exits, products, dateFrom, dateTo, reasonFilter, searchTerm]);

  const exitTotalUnits = useMemo(() => {
    return exitReportRows.reduce((sum, s) => sum + (s.quantity || 0), 0);
  }, [exitReportRows]);

  // ==============================================================
  // 4. REPORTE DE MOVIMIENTOS (KARDEX)
  // ==============================================================
  const movementReportRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return movements.filter((m) => {
      // Rangos de fecha inclusivos
      if (dateFrom && m.date < dateFrom) return false;
      if (dateTo && m.date > dateTo) return false;
      if (movementTypeFilter && m.type !== movementTypeFilter) return false;
      if (q) {
        const prod = products.find((p) => p.id === m.productId);
        const name = (m.productName || prod?.name || '').toLowerCase();
        const code = (m.productCode || prod?.code || '').toLowerCase();
        const batch = (m.batchNumber || '').toLowerCase();
        const ref = (m.reference || '').toLowerCase();
        const user = (m.user || '').toLowerCase();
        const detail = (m.detail || '').toLowerCase();
        if (
          !name.includes(q) &&
          !code.includes(q) &&
          !batch.includes(q) &&
          !ref.includes(q) &&
          !user.includes(q) &&
          !detail.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [movements, products, dateFrom, dateTo, movementTypeFilter, searchTerm]);

  const movementTotals = useMemo(() => {
    let entradasUnits = 0;
    let salidasUnits = 0;
    for (const m of movementReportRows) {
      if (m.type === 'Entrada') entradasUnits += m.quantity;
      else if (m.type === 'Salida') salidasUnits += m.quantity;
    }
    return {
      totalOps: movementReportRows.length,
      entradasUnits,
      salidasUnits,
    };
  }, [movementReportRows]);

  // ==============================================================
  // 5. REPORTE DE VENCIMIENTOS (SOLO LOTES CON EXISTENCIA > 0)
  // ==============================================================
  const expiryReportRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
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
      .filter((r) => !categoryFilter || r.category === categoryFilter)
      .filter((r) => {
        if (!expiryStatusFilter) return true;
        return r.status === expiryStatusFilter;
      })
      .filter((r) => {
        if (!q) return true;
        return (
          r.name.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q) ||
          r.batchNumber.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  }, [batches, products, settings.expiryAlertDays, categoryFilter, expiryStatusFilter, searchTerm]);

  const expiryTotals = useMemo(() => {
    let expiredUnits = 0;
    let soonUnits = 0;
    let vigentesUnits = 0;
    for (const r of expiryReportRows) {
      if (r.status === 'Vencido') expiredUnits += r.quantity;
      else if (r.status === 'ProximoAVencer') soonUnits += r.quantity;
      else vigentesUnits += r.quantity;
    }
    return {
      totalBatches: expiryReportRows.length,
      expiredUnits,
      soonUnits,
      vigentesUnits,
      totalUnits: expiredUnits + soonUnits + vigentesUnits,
    };
  }, [expiryReportRows]);

  // ==============================================================
  // EXPORTACIÓN A CSV CON SNAPSHOTS HISTÓRICOS Y FILTROS ACTIVOS
  // ==============================================================
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
        ['Documento', 'Fecha', 'Proveedor', 'Líneas', 'Total Unidades', 'Registrado Por'],
        entryReportRows.map((e) => [
          e.documentNumber,
          e.date,
          e.supplierName || e.provider,
          e.items.length,
          e.items.reduce((s, i) => s + i.quantity, 0),
          e.registeredBy,
        ])
      );
    } else if (activeTab === 'salidas') {
      exportToCsv(
        `stockcare-salidas-${today}.csv`,
        ['Referencia', 'Fecha', 'Código', 'Producto', 'Lote', 'Motivo', 'Cantidad', 'Responsable'],
        exitReportRows.map((s) => {
          const prod = products.find((p) => p.id === s.productId);
          return [
            s.reference,
            s.date,
            s.productCode || prod?.code || '',
            s.productName || prod?.name || '',
            s.batchNumber,
            s.reason,
            s.quantity,
            s.registeredBy,
          ];
        })
      );
    } else if (activeTab === 'movimientos') {
      exportToCsv(
        `stockcare-kardex-movimientos-${today}.csv`,
        ['Fecha', 'Código', 'Producto', 'Lote', 'Tipo', 'Cantidad', 'Saldo Resultante', 'Referencia', 'Detalle', 'Usuario'],
        movementReportRows.map((m) => {
          const prod = products.find((p) => p.id === m.productId);
          return [
            m.date,
            m.productCode || prod?.code || '',
            m.productName || prod?.name || '',
            m.batchNumber,
            m.type,
            m.quantity,
            m.resultingStock,
            m.reference,
            m.detail,
            m.user,
          ];
        })
      );
    } else {
      exportToCsv(
        `stockcare-vencimientos-${today}.csv`,
        ['Código', 'Producto', 'Categoría', 'Lote', 'Existencia', 'Fecha Vencimiento', 'Estado', 'Días Restantes'],
        expiryReportRows.map((r) => [
          r.code,
          r.name,
          r.category,
          r.batchNumber,
          r.quantity,
          r.expiryDate,
          r.status,
          r.days,
        ])
      );
    }

    addToast({
      type: 'success',
      title: 'Reporte exportado exitosamente',
      message: 'El archivo CSV se ha descargado con los datos filtrados actuales.',
    });
  };

  // ==============================================================
  // DEFINICIÓN DE COLUMNAS POR PESTAÑA
  // ==============================================================
  const stockColumns: TableColumn<(typeof stockReportRows)[number]>[] = [
    {
      key: 'code',
      header: 'Código',
      render: (r) => <span className="font-mono text-xs font-bold text-slate-700">{r.code}</span>,
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
      header: 'Lotes activos',
      align: 'center',
      render: (r) => <span className="text-xs font-medium">{r.batchesCount}</span>,
    },
    {
      key: 'stock',
      header: 'Existencia actual',
      align: 'right',
      render: (r) => <span className="font-bold text-slate-900">{r.totalStock} uds.</span>,
    },
    {
      key: 'minStock',
      header: 'Stock mínimo',
      align: 'right',
      render: (r) => <span className="text-xs text-slate-500">{r.minStock} uds.</span>,
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
        <span className="font-mono text-xs font-bold text-slate-800">{e.documentNumber}</span>
      ),
    },
    {
      key: 'date',
      header: 'Fecha',
      render: (e) => <span className="text-xs text-slate-600">{formatDateDisplay(e.date)}</span>,
    },
    {
      key: 'provider',
      header: 'Proveedor',
      render: (e) => (
        <span className="font-semibold text-slate-900 text-xs sm:text-sm">
          {e.supplierName || e.provider}
        </span>
      ),
    },
    {
      key: 'lines',
      header: 'Líneas',
      align: 'center',
      render: (e) => <span className="text-xs">{e.items.length}</span>,
    },
    {
      key: 'units',
      header: 'Unidades ingresadas',
      align: 'right',
      render: (e) => (
        <span className="font-bold text-teal-700">
          +{e.items.reduce((s, i) => s + (i.quantity || 0), 0)} uds.
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
        <span className="font-mono text-xs font-bold text-slate-800">{s.reference}</span>
      ),
    },
    {
      key: 'date',
      header: 'Fecha',
      render: (s) => <span className="text-xs text-slate-600">{formatDateDisplay(s.date)}</span>,
    },
    {
      key: 'product',
      header: 'Producto / Lote',
      render: (s) => {
        const prod = products.find((p) => p.id === s.productId);
        const name = s.productName || prod?.name || 'Producto';
        const code = s.productCode || prod?.code || '';
        return (
          <div>
            <p className="font-semibold text-slate-900 text-xs sm:text-sm">{name}</p>
            <p className="text-xs text-slate-500 font-mono">
              {code ? `${code} • ` : ''}Lote: {s.batchNumber}
            </p>
          </div>
        );
      },
    },
    {
      key: 'reason',
      header: 'Motivo',
      render: (s) => <span className="text-xs font-medium text-slate-700">{s.reason}</span>,
    },
    {
      key: 'qty',
      header: 'Cantidad despachada',
      align: 'right',
      render: (s) => (
        <span className="font-bold text-amber-700">-{s.quantity} uds.</span>
      ),
    },
    {
      key: 'user',
      header: 'Responsable',
      render: (s) => <span className="text-xs text-slate-600">{s.registeredBy}</span>,
    },
  ];

  const movementColumns: TableColumn<(typeof movementReportRows)[number]>[] = [
    {
      key: 'date',
      header: 'Fecha',
      render: (m) => <span className="text-xs text-slate-600">{formatDateDisplay(m.date)}</span>,
    },
    {
      key: 'product',
      header: 'Producto / Lote',
      render: (m) => {
        const prod = products.find((p) => p.id === m.productId);
        const name = m.productName || prod?.name || 'Producto';
        const code = m.productCode || prod?.code || '';
        return (
          <div>
            <p className="font-semibold text-slate-900 text-xs sm:text-sm">{name}</p>
            <p className="text-xs text-slate-500 font-mono">
              {code ? `${code} • ` : ''}Lote: {m.batchNumber}
            </p>
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
        <span
          className={`font-bold ${
            m.type === 'Entrada' ? 'text-teal-700' : 'text-amber-700'
          }`}
        >
          {m.type === 'Entrada' ? `+${m.quantity}` : `-${m.quantity}`}
        </span>
      ),
    },
    {
      key: 'resultingStock',
      header: 'Saldo resultante',
      align: 'right',
      render: (m) => (
        <span className="font-bold text-slate-900">{m.resultingStock} uds.</span>
      ),
    },
    {
      key: 'ref',
      header: 'Referencia / Detalle',
      render: (m) => (
        <div>
          <span className="font-mono text-xs font-semibold text-slate-700">{m.reference}</span>
          {m.detail && <p className="text-[11px] text-slate-500">{m.detail}</p>}
        </div>
      ),
    },
    {
      key: 'user',
      header: 'Usuario',
      render: (m) => <span className="text-xs text-slate-600">{m.user}</span>,
    },
  ];

  const expiryColumns: TableColumn<(typeof expiryReportRows)[number]>[] = [
    {
      key: 'product',
      header: 'Producto',
      render: (r) => (
        <div>
          <p className="font-semibold text-slate-900">{r.name}</p>
          <p className="text-xs text-slate-500 font-mono">{r.code}</p>
        </div>
      ),
    },
    {
      key: 'batch',
      header: 'Lote',
      render: (r) => (
        <span className="font-mono text-xs font-bold text-slate-700">{r.batchNumber}</span>
      ),
    },
    {
      key: 'qty',
      header: 'Existencia física',
      align: 'right',
      render: (r) => <span className="font-bold text-slate-900">{r.quantity} uds.</span>,
    },
    {
      key: 'date',
      header: 'Fecha de vencimiento',
      render: (r) => <span>{formatDateDisplay(r.expiryDate)}</span>,
    },
    {
      key: 'status',
      header: 'Estado de vencimiento',
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
        description="Consultas administrativas y de auditoría interna de existencias, recepciones, despachos, Kardex y vencimientos (RF-10)."
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

      {/* Selector de pestañas */}
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
      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs no-print space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Filter className="h-3.5 w-3.5 text-teal-700" />
            <span>Filtros de consulta ({REPORT_TABS.find((t) => t.id === activeTab)?.label})</span>
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RotateCcw className="h-3 w-3" />}
              onClick={clearFilters}
            >
              Limpiar filtros
            </Button>
          )}
        </div>

        {/* 1. Filtros para Existencias */}
        {activeTab === 'existencias' && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Input
              label="Buscar por producto o código"
              placeholder="Nombre, código, presentación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select
              label="Categoría terapéutica"
              placeholder="Todas las categorías"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={PRODUCT_CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
          </div>
        )}

        {/* 2. Filtros para Entradas */}
        {activeTab === 'entradas' && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="Búsqueda rápida"
              placeholder="Documento, usuario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select
              label="Proveedor"
              placeholder="Todos los proveedores"
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
            />
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
          </div>
        )}

        {/* 3. Filtros para Salidas */}
        {activeTab === 'salidas' && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="Búsqueda rápida"
              placeholder="Producto, lote, referencia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select
              label="Motivo de salida"
              placeholder="Todos los motivos"
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
              options={EXIT_REASONS.map((r) => ({ value: r, label: r }))}
            />
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
          </div>
        )}

        {/* 4. Filtros para Movimientos */}
        {activeTab === 'movimientos' && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="Búsqueda rápida"
              placeholder="Producto, lote, referencia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select
              label="Tipo de transacción"
              placeholder="Todos (Entrada / Salida)"
              value={movementTypeFilter}
              onChange={(e) => setMovementTypeFilter(e.target.value)}
              options={[
                { value: 'Entrada', label: 'Entrada (+)' },
                { value: 'Salida', label: 'Salida (-)' },
              ]}
            />
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
          </div>
        )}

        {/* 5. Filtros para Vencimientos */}
        {activeTab === 'vencimientos' && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input
              label="Buscar por producto o lote"
              placeholder="Nombre, código, lote..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select
              label="Estado de vencimiento"
              placeholder="Todos los estados con stock"
              value={expiryStatusFilter}
              onChange={(e) => setExpiryStatusFilter(e.target.value)}
              options={[
                { value: 'Vencido', label: 'Lotes vencidos' },
                { value: 'ProximoAVencer', label: `Próximos a vencer (≤ ${settings.expiryAlertDays} días)` },
                { value: 'Vigente', label: 'Lotes vigentes' },
              ]}
            />
            <Select
              label="Categoría terapéutica"
              placeholder="Todas las categorías"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={PRODUCT_CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
          </div>
        )}
      </div>

      {/* Barra de cabecera con totalizadores y metadatos */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-xs text-slate-600 shadow-2xs">
          <div>
            <span className="font-bold text-slate-900">{settings.pharmacyName}</span> •{' '}
            <span>{settings.branchName}</span> • Reporte de{' '}
            <strong className="text-teal-800">
              {REPORT_TABS.find((t) => t.id === activeTab)?.label}
            </strong>
          </div>

          {/* Totalizadores contextuales por reporte */}
          <div className="flex flex-wrap items-center gap-3 font-semibold text-slate-800">
            {activeTab === 'existencias' && (
              <span>
                Total productos:{' '}
                <strong className="text-teal-700">{stockReportRows.length}</strong> •{' '}
                Total existencia física:{' '}
                <strong className="text-teal-700">{stockTotalUnits} uds.</strong>
              </span>
            )}

            {activeTab === 'entradas' && (
              <span>
                Documentos registrados:{' '}
                <strong className="text-teal-700">{entryReportRows.length}</strong> •{' '}
                Total unidades ingresadas:{' '}
                <strong className="text-teal-700">+{entryTotalUnits} uds.</strong>
              </span>
            )}

            {activeTab === 'salidas' && (
              <span>
                Despachos registrados:{' '}
                <strong className="text-amber-700">{exitReportRows.length}</strong> •{' '}
                Total unidades despachadas:{' '}
                <strong className="text-amber-700">-{exitTotalUnits} uds.</strong>
              </span>
            )}

            {activeTab === 'movimientos' && (
              <span>
                Operaciones:{' '}
                <strong className="text-slate-900">{movementTotals.totalOps}</strong> •{' '}
                Entradas: <strong className="text-teal-700">+{movementTotals.entradasUnits}</strong> •{' '}
                Salidas: <strong className="text-amber-700">-{movementTotals.salidasUnits}</strong>
              </span>
            )}

            {activeTab === 'vencimientos' && (
              <span>
                Lotes activos:{' '}
                <strong className="text-slate-900">{expiryTotals.totalBatches}</strong> •{' '}
                Vencidos: <strong className="text-rose-700">{expiryTotals.expiredUnits} uds.</strong> •{' '}
                Próximos: <strong className="text-amber-700">{expiryTotals.soonUnits} uds.</strong> •{' '}
                Vigentes: <strong className="text-emerald-700">{expiryTotals.vigentesUnits} uds.</strong>
              </span>
            )}

            <span className="text-slate-400">|</span>
            <span className="text-slate-500 font-normal">
              Generado: {formatDateDisplay(getTodayLocalISO())}
            </span>
          </div>
        </div>

        {/* Tablas de resultados */}
        {activeTab === 'existencias' && (
          <DataTable
            isLoading={isLoading}
            columns={stockColumns}
            data={stockReportRows}
            rowKey={(r) => r.id}
            emptyTitle={hasActiveFilters ? "Sin productos en los filtros aplicados" : "No hay productos activos"}
            emptyDescription={hasActiveFilters ? "Modifique la categoría o el término de búsqueda para ver existencias." : "El catálogo no cuenta con productos activos en este momento."}
          />
        )}

        {activeTab === 'entradas' && (
          <DataTable
            isLoading={isLoading}
            columns={entryColumns}
            data={entryReportRows}
            rowKey={(r) => r.id}
            emptyTitle={hasActiveFilters ? "Sin entradas en el rango o filtros seleccionados" : "No hay entradas registradas"}
            emptyDescription={hasActiveFilters ? "Ajuste el proveedor o el rango de fechas para visualizar recepciones." : "Aún no se han recibido recepciones de inventario."}
          />
        )}

        {activeTab === 'salidas' && (
          <DataTable
            isLoading={isLoading}
            columns={exitColumns}
            data={exitReportRows}
            rowKey={(r) => r.id}
            emptyTitle={hasActiveFilters ? "Sin salidas en el rango o filtros seleccionados" : "No hay salidas registradas"}
            emptyDescription={hasActiveFilters ? "Ajuste el motivo o el rango de fechas para visualizar despachos." : "Aún no se han registrado salidas de mercadería."}
          />
        )}

        {activeTab === 'movimientos' && (
          <DataTable
            isLoading={isLoading}
            columns={movementColumns}
            data={movementReportRows}
            rowKey={(r) => r.id}
            emptyTitle={hasActiveFilters ? "Sin movimientos en el rango seleccionado" : "No hay movimientos registrados"}
            emptyDescription={hasActiveFilters ? "Ajuste el tipo de transacción o el rango de fechas para ver el Kardex." : "Aún no se han registrado movimientos de inventario."}
          />
        )}

        {activeTab === 'vencimientos' && (
          <DataTable
            isLoading={isLoading}
            columns={expiryColumns}
            data={expiryReportRows}
            rowKey={(r) => r.id}
            emptyTitle={hasActiveFilters ? "Sin lotes en los filtros seleccionados" : "No hay lotes con existencias físicas"}
            emptyDescription={hasActiveFilters ? "Ajuste el estado de vencimiento o la categoría seleccionada." : "Todos los lotes con existencias se encuentran vigentes o no hay lotes registrados."}
          />
        )}
      </div>
    </div>
  );
};
