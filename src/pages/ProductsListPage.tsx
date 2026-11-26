import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit3, Eye, Plus, Search } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { DataTable, type TableColumn } from '../components/DataTable';
import { ProductStatusBadge, StockLevelBadge } from '../components/Badge';
import { ProductDetailModal } from '../features/products/ProductDetailModal';
import { PRODUCT_CATEGORIES } from '../data/mockData';
import { useStockCare } from '../hooks/useStockCare';
import type { Product } from '../types';
import { getProductStockSummary } from '../utils/inventory';

interface ProductRow extends Product {
  totalStock: number;
  stockLevel: 'Normal' | 'StockBajo' | 'SinExistencias';
}

export const ProductsListPage: React.FC = () => {
  const { session, products, isLoadingProducts, productsError, batches, settings } = useStockCare();
  const canEdit = session?.role === 'BODEGA';

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const rows: ProductRow[] = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products
      .map((p) => {
        const summary = getProductStockSummary(
          p,
          batches,
          settings.expiryAlertDays
        );
        return {
          ...p,
          totalStock: summary.totalStock,
          stockLevel: summary.stockStatus,
        };
      })
      .filter((row) => {
        if (
          query &&
          !row.code.toLowerCase().includes(query) &&
          !row.name.toLowerCase().includes(query) &&
          !row.presentation.toLowerCase().includes(query)
        ) {
          return false;
        }
        if (categoryFilter && row.category !== categoryFilter) return false;
        if (statusFilter && row.status !== statusFilter) return false;
        return true;
      });
  }, [products, batches, settings.expiryAlertDays, search, categoryFilter, statusFilter]);

  const columns: TableColumn<ProductRow>[] = [
    {
      key: 'code',
      header: 'Código',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-slate-800">
          {row.code}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Producto',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.name}</p>
          <p className="text-xs text-slate-500">{row.presentation}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Categoría',
      render: (row) => <span className="text-xs text-slate-700">{row.category}</span>,
    },
    {
      key: 'stock',
      header: 'Existencia',
      align: 'right',
      render: (row) => (
        <div className="inline-flex flex-col items-end gap-1">
          <span className="font-bold text-slate-900">{row.totalStock} uds.</span>
          <StockLevelBadge status={row.stockLevel} />
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (row) => <ProductStatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: 'Acciones',
      align: 'right',
      render: (row) => (
        <div className="inline-flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<Eye className="h-3.5 w-3.5" />}
            onClick={() => setSelectedProduct(row)}
          >
            Detalle
          </Button>
          {canEdit && (
            <Link to={`/productos/${row.id}/editar`}>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Edit3 className="h-3.5 w-3.5" />}
              >
                Editar
              </Button>
            </Link>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Listado de Productos"
        description="Catálogo general de medicamentos e insumos farmacéuticos registrados."
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Productos' },
        ]}
        useCaseCode="CU-04"
        actions={
          canEdit && (
            <Link to="/productos/nuevo">
              <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
                Nuevo producto
              </Button>
            </Link>
          )
        }
      />

      {/* Filtros */}
      <div className="mb-5 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs sm:grid-cols-12">
        <div className="sm:col-span-5">
          <Input
            placeholder="Buscar por código, nombre o presentación..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            aria-label="Buscar productos"
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            placeholder="Todos los estados"
            options={[
              { value: 'Activo', label: 'Activo' },
              { value: 'Inactivo', label: 'Inactivo' },
            ]}
            aria-label="Filtrar por estado"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        isLoading={isLoadingProducts}
        error={productsError}
        emptyTitle={
          products.length === 0 && !search && !categoryFilter && !statusFilter
            ? 'No hay productos registrados.'
            : 'No hay productos que coincidan'
        }
        emptyDescription={
          products.length === 0 && !search && !categoryFilter && !statusFilter
            ? 'El catálogo de medicamentos e insumos farmacéuticos se encuentra vacío en la base de datos.'
            : 'Pruebe limpiando los filtros de búsqueda o registre un nuevo producto.'
        }
        emptyAction={
          products.length === 0 && !search && !categoryFilter && !statusFilter ? (
            canEdit && (
              <Link to="/productos/nuevo">
                <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                  Registrar producto
                </Button>
              </Link>
            )
          ) : search || categoryFilter || statusFilter ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch('');
                setCategoryFilter('');
                setStatusFilter('');
              }}
            >
              Limpiar filtros
            </Button>
          ) : undefined
        }
      />

      <ProductDetailModal
        product={selectedProduct}
        batches={batches}
        alertThresholdDays={settings.expiryAlertDays}
        canEdit={canEdit}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
};
