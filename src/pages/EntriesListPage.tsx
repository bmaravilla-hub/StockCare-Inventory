import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus, Search } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { DataTable, type TableColumn } from '../components/DataTable';
import { EntryReceiptModal } from '../features/entries/EntryReceiptModal';
import { useStockCare } from '../hooks/useStockCare';
import type { EntryRecord } from '../types';
import { formatDateDisplay } from '../utils/date';

export const EntriesListPage: React.FC = () => {
  const { session, entries, products, settings } = useStockCare();
  const canCreate = session?.role === 'BODEGA';

  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<EntryRecord | null>(null);

  const providers = useMemo(() => {
    const unique = new Set(
      entries
        .map((e) => e.provider)
        .filter((p) => Boolean(p && p.trim()))
    );
    return Array.from(unique).sort();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (providerFilter && entry.provider !== providerFilter) return false;
      if (!q) return true;
      const matchesDoc = entry.documentNumber.toLowerCase().includes(q);
      const matchesProvider = entry.provider.toLowerCase().includes(q);
      const matchesBatch = entry.items.some((i) =>
        i.batchNumber.toLowerCase().includes(q)
      );
      return matchesDoc || matchesProvider || matchesBatch;
    });
  }, [entries, search, providerFilter]);

  const columns: TableColumn<EntryRecord>[] = [
    {
      key: 'document',
      header: 'N.º Documento',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-slate-900">
          {row.documentNumber}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Fecha recepción',
      render: (row) => (
        <span className="text-xs font-medium text-slate-700">
          {formatDateDisplay(row.date)}
        </span>
      ),
    },
    {
      key: 'provider',
      header: 'Proveedor',
      render: (row) => (
        <span className="font-medium text-slate-900">{row.provider}</span>
      ),
    },
    {
      key: 'items',
      header: 'Detalle recibido',
      render: (row) => {
        const totalUnits = row.items.reduce((s, i) => s + i.quantity, 0);
        return (
          <div className="text-xs">
            <p className="font-semibold text-teal-700">+{totalUnits} unidades</p>
            <p className="text-slate-500">
              {row.items.length} producto(s) / lote(s)
            </p>
          </div>
        );
      },
    },
    {
      key: 'registeredBy',
      header: 'Registrado por',
      render: (row) => (
        <span className="text-xs text-slate-600">{row.registeredBy}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Comprobante',
      align: 'right',
      render: (row) => (
        <Button
          size="sm"
          variant="outline"
          leftIcon={<FileText className="h-3.5 w-3.5" />}
          onClick={() => setSelectedEntry(row)}
        >
          Ver comprobante
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Listado de Entradas de Inventario"
        description="Historial de recepciones de mercadería por proveedor y número de factura."
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Entradas' },
        ]}
        useCaseCode="CU-07"
        actions={
          canCreate && (
            <Link to="/entradas/nueva">
              <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
                Registrar entrada
              </Button>
            </Link>
          )
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs sm:grid-cols-12">
        <div className="sm:col-span-7">
          <Input
            placeholder="Buscar por número de factura, proveedor o lote..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            aria-label="Buscar entradas"
          />
        </div>
        <div className="sm:col-span-5">
          <Select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            placeholder="Todos los proveedores"
            options={providers.map((p) => ({ value: p, label: p }))}
            aria-label="Filtrar por proveedor"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredEntries}
        rowKey={(r) => r.id}
        emptyTitle="No se encontraron entradas"
        emptyDescription="No hay recepciones que coincidan con los criterios aplicados."
      />

      <EntryReceiptModal
        entry={selectedEntry}
        products={products}
        settings={settings}
        onClose={() => setSelectedEntry(null)}
      />
    </div>
  );
};

