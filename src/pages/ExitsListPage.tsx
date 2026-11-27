import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { DataTable, type TableColumn } from '../components/DataTable';
import { Badge } from '../components/Badge';
import { EXIT_REASONS } from '../constants';
import { useStockCare } from '../hooks/useStockCare';
import type { ExitRecord } from '../types';
import { formatDateDisplay } from '../utils/date';

export const ExitsListPage: React.FC = () => {
  const { session, exits, isExitsLoading, exitsError, products } = useStockCare();
  const canCreate = session?.role === 'BODEGA';

  const [search, setSearch] = useState('');
  const [reasonFilter, setReasonFilter] = useState('');

  const filteredExits = useMemo(() => {
    const q = search.trim().toLowerCase();
    return exits.filter((exit) => {
      if (reasonFilter && exit.reason !== reasonFilter) return false;
      if (!q) return true;
      const prod = products.find((p) => p.id === exit.productId);
      const prodName = exit.productName || prod?.name || '';
      const prodCode = exit.productCode || prod?.code || '';
      return (
        exit.reference.toLowerCase().includes(q) ||
        exit.batchNumber.toLowerCase().includes(q) ||
        prodName.toLowerCase().includes(q) ||
        prodCode.toLowerCase().includes(q)
      );
    });
  }, [exits, products, search, reasonFilter]);

  const columns: TableColumn<ExitRecord>[] = [
    {
      key: 'reference',
      header: 'Referencia',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-slate-900">
          {row.reference}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Fecha',
      render: (row) => (
        <span className="text-xs font-medium text-slate-700">
          {formatDateDisplay(row.date)}
        </span>
      ),
    },
    {
      key: 'product',
      header: 'Producto',
      render: (row) => {
        const prod = products.find((p) => p.id === row.productId);
        const displayName = row.productName || prod?.name || 'Producto';
        const displayCode = row.productCode || prod?.code || '';
        return (
          <div>
            <p className="font-semibold text-slate-900">{displayName}</p>
            <p className="text-xs text-slate-500">
              {displayCode ? `${displayCode} • ` : ''}Lote{' '}
              <span className="font-mono font-medium text-slate-700">{row.batchNumber}</span>
              {row.expiryDate ? ` (Vence: ${formatDateDisplay(row.expiryDate)})` : ''}
            </p>
          </div>
        );
      },
    },
    {
      key: 'reason',
      header: 'Motivo',
      render: (row) => (
        <Badge
          tone={
            row.reason === 'Descarte por vencimiento'
              ? 'danger'
              : row.reason === 'Venta'
                ? 'info'
                : 'neutral'
          }
        >
          {row.reason}
        </Badge>
      ),
    },
    {
      key: 'quantity',
      header: 'Cantidad',
      align: 'right',
      render: (row) => (
        <span className="font-bold text-amber-700">-{row.quantity} uds.</span>
      ),
    },
    {
      key: 'user',
      header: 'Responsable',
      render: (row) => (
        <span className="text-xs text-slate-600">{row.registeredBy}</span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Listado de Salidas de Inventario"
        description="Historial inmutable de despachos por venta, uso interno y descartes de lotes (RF-04)."
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Salidas' },
        ]}
        useCaseCode="CU-09"
        actions={
          canCreate && (
            <Link to="/salidas/nueva">
              <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
                Registrar salida
              </Button>
            </Link>
          )
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs sm:grid-cols-12">
        <div className="sm:col-span-7">
          <Input
            placeholder="Buscar por referencia, producto o número de lote..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            aria-label="Buscar salidas"
          />
        </div>
        <div className="sm:col-span-5">
          <Select
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
            placeholder="Todos los motivos"
            options={EXIT_REASONS.map((r) => ({ value: r, label: r }))}
            aria-label="Filtrar por motivo"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredExits}
        rowKey={(r) => r.id}
        isLoading={isExitsLoading}
        error={exitsError}
        emptyTitle={
          search || reasonFilter
            ? 'No se encontraron salidas'
            : 'No hay salidas registradas.'
        }
        emptyDescription={
          search || reasonFilter
            ? 'No hay salidas que coincidan con los criterios aplicados.'
            : 'Aún no se han registrado despachos ni salidas de mercadería en el inventario.'
        }
        emptyAction={
          canCreate && !search && !reasonFilter ? (
            <Link to="/salidas/nueva">
              <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                Registrar salida
              </Button>
            </Link>
          ) : undefined
        }
      />
    </div>
  );
};
