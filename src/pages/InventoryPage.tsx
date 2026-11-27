import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowDownToLine, Eye, Search } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Button } from '../components/Button';
import { DataTable, type TableColumn } from '../components/DataTable';
import { BatchStatusBadge, StockLevelBadge } from '../components/Badge';
import { ProductDetailModal } from '../features/products/ProductDetailModal';
import { PRODUCT_CATEGORIES } from '../constants';
import { useStockCare } from '../hooks/useStockCare';
import type { BatchExpiryStatus, Product, StockLevelStatus } from '../types';
import { formatDateDisplay } from '../utils/date';
import { getProductStockSummary } from '../utils/inventory';

interface InventoryRow {
  product: Product;
  totalStock: number;
  stockStatus: StockLevelStatus;
  activeBatchesCount: number;
  nearestExpiry: string | null;
  nearestStatus: BatchExpiryStatus | null;
}

export const InventoryPage: React.FC = () => {
  const { session, products, batches, settings } = useStockCare();
  const [searchParams] = useSearchParams();
  const isBodega = session?.role === 'BODEGA';

  const initialLevel =
    searchParams.get('nivel') === 'bajo' ? 'BAJO_O_AGOTADO' : '';

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState(initialLevel);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const rows: InventoryRow[] = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((p) => p.status === 'Activo')
      .map((product) => {
        const summary = getProductStockSummary(
          product,
          batches,
          settings.expiryAlertDays
        );
        return {
          product,
          totalStock: summary.totalStock,
          stockStatus: summary.stockStatus,
          activeBatchesCount: summary.activeBatchesCount,
          nearestExpiry: summary.nearestExpiry,
          nearestStatus: summary.nearestStatus,
        };
      })
      .filter((r) => {
        if (
          q &&
          !r.product.code.toLowerCase().includes(q) &&
          !r.product.name.toLowerCase().includes(q)
        ) {
          return false;
        }
        if (categoryFilter && r.product.category !== categoryFilter) {
          return false;
        }
        if (levelFilter === 'BAJO_O_AGOTADO') {
          return (
            r.stockStatus === 'StockBajo' || r.stockStatus === 'SinExistencias'
          );
        }
        if (levelFilter && r.stockStatus !== levelFilter) return false;
        return true;
      });
  }, [
    products,
    batches,
    settings.expiryAlertDays,
    search,
    categoryFilter,
    levelFilter,
  ]);

  const columns: TableColumn<InventoryRow>[] = [
    {
      key: 'code',
      header: 'Código',
      render: (r) => (
        <span className="font-mono text-xs font-bold text-slate-800">
          {r.product.code}
        </span>
      ),
    },
    {
      key: 'product',
      header: 'Producto',
      render: (r) => (
        <div>
          <p className="font-semibold text-slate-900">{r.product.name}</p>
          <p className="text-xs text-slate-500">
            {r.product.category} • {r.product.presentation}
          </p>
        </div>
      ),
    },
    {
      key: 'batches',
      header: 'Lotes activos',
      align: 'center',
      render: (r) => (
        <span className="font-semibold text-slate-700">
          {r.activeBatchesCount}
        </span>
      ),
    },
    {
      key: 'nearestExpiry',
      header: 'Próx. vencimiento',
      render: (r) =>
        r.nearestExpiry && r.nearestStatus ? (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-700">
              {formatDateDisplay(r.nearestExpiry)}
            </span>
            <BatchStatusBadge status={r.nearestStatus} />
          </div>
        ) : (
          <span className="text-xs text-slate-400">Sin lotes activos</span>
        ),
    },
    {
      key: 'stock',
      header: 'Existencia / Mínimo',
      align: 'right',
      render: (r) => (
        <div>
          <p className="font-bold text-slate-900">{r.totalStock} uds.</p>
          <p className="text-[11px] text-slate-500">Mín: {r.product.minStock}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Nivel de stock',
      render: (r) => <StockLevelBadge status={r.stockStatus} />,
    },
    {
      key: 'actions',
      header: 'Lotes',
      align: 'right',
      render: (r) => (
        <Button
          size="sm"
          variant="outline"
          leftIcon={<Eye className="h-3.5 w-3.5" />}
          onClick={() => setSelectedProduct(r.product)}
        >
          Ver desglose
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Inventario y Existencias Disponibles"
        description="Consulta en tiempo real de unidades disponibles por producto activo y nivel mínimo (RF-08)."
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Inventario' },
        ]}
        useCaseCode="CU-11"
        actions={
          isBodega && (
            <Link to="/entradas/nueva">
              <Button
                variant="primary"
                leftIcon={<ArrowDownToLine className="h-4 w-4" />}
              >
                Reabastecer (Entrada)
              </Button>
            </Link>
          )
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs sm:grid-cols-12">
        <div className="sm:col-span-5">
          <Input
            placeholder="Buscar por código o nombre de producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            aria-label="Buscar en inventario"
          />
        </div>
        <div className="sm:col-span-4">
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            placeholder="Todas las categorías"
            options={PRODUCT_CATEGORIES.map((c) => ({ value: c, label: c }))}
            aria-label="Filtrar por categoría"
          />
        </div>
        <div className="sm:col-span-3">
          <Select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            placeholder="Todos los niveles"
            options={[
              { value: 'Normal', label: 'Normal' },
              { value: 'BAJO_O_AGOTADO', label: 'Stock bajo o agotado' },
              { value: 'StockBajo', label: 'Solo Stock bajo' },
              { value: 'SinExistencias', label: 'Solo Sin existencias' },
            ]}
            aria-label="Filtrar por nivel de stock"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.product.id}
        emptyTitle="Sin resultados en inventario"
        emptyDescription="No existen productos activos que coincidan con los filtros seleccionados."
      />

      <ProductDetailModal
        product={selectedProduct}
        batches={batches}
        alertThresholdDays={settings.expiryAlertDays}
        canEdit={isBodega}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
};

