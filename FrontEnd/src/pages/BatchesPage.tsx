import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpFromLine, Search } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Button } from '../components/Button';
import { DataTable, type TableColumn } from '../components/DataTable';
import { BatchStatusBadge } from '../components/Badge';
import { useStockCare } from '../hooks/useStockCare';
import type { BatchExpiryStatus } from '../types';
import { diffDaysFromToday, formatDateDisplay } from '../utils/date';
import {
  getBatchExpiryStatus,
  getExpiryStatusLabel,
} from '../utils/inventory';

interface BatchRow {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  presentation: string;
  batchNumber: string;
  quantity: number;
  initialQuantity: number;
  expiryDate: string;
  daysRemaining: number;
  status: BatchExpiryStatus;
}

export const BatchesPage: React.FC = () => {
  const { session, batches, products, settings } = useStockCare();
  const isBodega = session?.role === 'BODEGA';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [onlyWithStock, setOnlyWithStock] = useState('true');

  const rows: BatchRow[] = useMemo(() => {
    const q = search.trim().toLowerCase();
    return batches
      .map((b): BatchRow => {
        const prod = products.find((p) => p.id === b.productId);
        const days = diffDaysFromToday(b.expiryDate);
        return {
          id: b.id,
          productId: b.productId,
          productCode: prod?.code ?? 'N/A',
          productName: prod?.name ?? 'Producto',
          presentation: prod?.presentation ?? '',
          batchNumber: b.batchNumber,
          quantity: b.quantity,
          initialQuantity: b.initialQuantity,
          expiryDate: b.expiryDate,
          daysRemaining: days,
          status: getBatchExpiryStatus(b.expiryDate, settings.expiryAlertDays),
        };
      })
      .filter((r) => {
        if (onlyWithStock === 'true' && r.quantity <= 0) return false;
        if (statusFilter && r.status !== statusFilter) return false;
        if (
          q &&
          !r.batchNumber.toLowerCase().includes(q) &&
          !r.productName.toLowerCase().includes(q) &&
          !r.productCode.toLowerCase().includes(q)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  }, [batches, products, settings.expiryAlertDays, search, statusFilter, onlyWithStock]);

  const columns: TableColumn<BatchRow>[] = [
    {
      key: 'product',
      header: 'Producto',
      render: (r) => (
        <div>
          <p className="font-semibold text-slate-900">{r.productName}</p>
          <p className="text-xs text-slate-500">
            {r.productCode} • {r.presentation}
          </p>
        </div>
      ),
    },
    {
      key: 'batchNumber',
      header: 'Número de lote',
      render: (r) => (
        <span className="font-mono text-xs font-bold text-slate-800">
          {r.batchNumber}
        </span>
      ),
    },
    {
      key: 'quantity',
      header: 'Existencia del lote',
      align: 'right',
      render: (r) => (
        <div>
          <span className="font-bold text-slate-900">{r.quantity} uds.</span>
          <p className="text-[11px] text-slate-400">
            Inicial: {r.initialQuantity}
          </p>
        </div>
      ),
    },
    {
      key: 'expiryDate',
      header: 'Fecha de vencimiento',
      render: (r) => (
        <span className="font-medium text-slate-700">
          {formatDateDisplay(r.expiryDate)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (r) => (
        <BatchStatusBadge
          status={r.status}
          labelOverride={getExpiryStatusLabel(r.status, r.daysRemaining)}
        />
      ),
    },
    {
      key: 'actions',
      header: 'Acción',
      align: 'right',
      render: (r) =>
        isBodega && r.quantity > 0 ? (
          <Link
            to={`/salidas/nueva?productId=${r.productId}&batchId=${r.id}&reason=${
              r.status === 'Vencido'
                ? encodeURIComponent('Descarte por vencimiento')
                : 'Venta'
            }`}
          >
            <Button
              size="sm"
              variant={r.status === 'Vencido' ? 'danger' : 'outline'}
              leftIcon={<ArrowUpFromLine className="h-3.5 w-3.5" />}
            >
              {r.status === 'Vencido' ? 'Descartar' : 'Registrar salida'}
            </Button>
          </Link>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Lotes y Fechas de Vencimiento"
        description={`Control detallado de lotes registrados y semaforización accesible según umbral de ${settings.expiryAlertDays} días (RF-05, RF-06).`}
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Lotes y vencimientos' },
        ]}
        useCaseCode="CU-12"
      />

      <div className="mb-5 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs sm:grid-cols-12">
        <div className="sm:col-span-5">
          <Input
            placeholder="Buscar por producto, código o número de lote..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            aria-label="Buscar lotes"
          />
        </div>
        <div className="sm:col-span-4">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            placeholder="Todos los estados"
            options={[
              { value: 'Vigente', label: 'Vigente' },
              { value: 'ProximoAVencer', label: 'Próximo a vencer' },
              { value: 'Vencido', label: 'Vencido' },
            ]}
            aria-label="Filtrar por estado de vencimiento"
          />
        </div>
        <div className="sm:col-span-3">
          <Select
            value={onlyWithStock}
            onChange={(e) => setOnlyWithStock(e.target.value)}
            options={[
              { value: 'true', label: 'Solo lotes con existencia' },
              { value: 'false', label: 'Incluir lotes agotados (0 uds.)' },
            ]}
            aria-label="Filtrar disponibilidad del lote"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        emptyTitle="No se encontraron lotes"
        emptyDescription="Ajuste los filtros para visualizar otros lotes registrados."
      />
    </div>
  );
};

