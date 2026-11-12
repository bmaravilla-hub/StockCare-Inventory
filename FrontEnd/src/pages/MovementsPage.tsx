import React, { useMemo, useState } from 'react';
import { RotateCcw, Search } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Button } from '../components/Button';
import { DataTable, type TableColumn } from '../components/DataTable';
import { MovementTypeBadge } from '../components/Badge';
import { useStockCare } from '../hooks/useStockCare';
import type { MovementRecord } from '../types';
import { formatDateDisplay } from '../utils/date';

export const MovementsPage: React.FC = () => {
  const { movements, products } = useStockCare();

  const [productFilter, setProductFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  const filteredMovements = useMemo(() => {
    const q = search.trim().toLowerCase();
    return movements.filter((m) => {
      if (productFilter && m.productId !== productFilter) return false;
      if (typeFilter && m.type !== typeFilter) return false;
      if (dateFrom && m.date < dateFrom) return false;
      if (dateTo && m.date > dateTo) return false;
      if (q) {
        const prod = products.find((p) => p.id === m.productId);
        const match =
          m.reference.toLowerCase().includes(q) ||
          m.batchNumber.toLowerCase().includes(q) ||
          m.user.toLowerCase().includes(q) ||
          m.detail.toLowerCase().includes(q) ||
          (prod?.name.toLowerCase().includes(q) ?? false);
        if (!match) return false;
      }
      return true;
    });
  }, [movements, products, productFilter, typeFilter, dateFrom, dateTo, search]);

  const clearFilters = () => {
    setProductFilter('');
    setTypeFilter('');
    setDateFrom('');
    setDateTo('');
    setSearch('');
  };

  const hasFilters = Boolean(
    productFilter || typeFilter || dateFrom || dateTo || search
  );

  const columns: TableColumn<MovementRecord>[] = [
    {
      key: 'date',
      header: 'Fecha',
      render: (m) => (
        <span className="text-xs font-medium text-slate-700 whitespace-nowrap">
          {formatDateDisplay(m.date)}
        </span>
      ),
    },
    {
      key: 'product',
      header: 'Producto',
      render: (m) => {
        const prod = products.find((p) => p.id === m.productId);
        return (
          <div>
            <p className="font-semibold text-slate-900">
              {prod?.name ?? 'Producto'}
            </p>
            <p className="text-xs text-slate-500">
              {prod?.code} • Lote <span className="font-mono">{m.batchNumber}</span>
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
      key: 'quantity',
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
      key: 'reference',
      header: 'Referencia',
      render: (m) => (
        <div>
          <p className="font-mono text-xs font-semibold text-slate-800">
            {m.reference}
          </p>
          <p className="text-[11px] text-slate-500">{m.detail}</p>
        </div>
      ),
    },
    {
      key: 'user',
      header: 'Usuario',
      render: (m) => <span className="text-xs text-slate-700">{m.user}</span>,
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

  return (
    <div>
      <PageHeader
        title="Historial de Movimientos"
        description="Trazabilidad completa de entradas y salidas con existencia resultante por operación (RF-09)."
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Movimientos' },
        ]}
        useCaseCode="CU-14"
      />

      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Input
            label="Búsqueda rápida"
            placeholder="Referencia, lote, usuario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
          <Select
            label="Producto"
            placeholder="Todos los productos"
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            options={products.map((p) => ({
              value: p.id,
              label: `${p.code} — ${p.name}`,
            }))}
          />
          <Select
            label="Tipo de movimiento"
            placeholder="Todos (Entrada / Salida)"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={[
              { value: 'Entrada', label: 'Entrada' },
              { value: 'Salida', label: 'Salida' },
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

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>
            Mostrando <strong>{filteredMovements.length}</strong> de{' '}
            <strong>{movements.length}</strong> movimientos registrados
          </span>
          {hasFilters && (
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={clearFilters}
            >
              Limpiar filtros
            </Button>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredMovements}
        rowKey={(m) => m.id}
        emptyTitle="Sin movimientos en el rango seleccionado"
        emptyDescription="Modifique los filtros de producto, tipo o fechas para ver el historial."
      />
    </div>
  );
};

