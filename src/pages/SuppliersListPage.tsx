import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit3, Plus, Search } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { DataTable, type TableColumn } from '../components/DataTable';
import { SupplierStatusBadge } from '../components/Badge';
import { useStockCare } from '../hooks/useStockCare';
import type { Supplier } from '../types';

export const SuppliersListPage: React.FC = () => {
  const { session, suppliers, isSuppliersLoading, suppliersError } = useStockCare();
  const canEdit = session?.role === 'BODEGA';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const rows: Supplier[] = useMemo(() => {
    const query = search.trim().toLowerCase();
    return suppliers.filter((row) => {
      if (query) {
        const matchesName = row.name.toLowerCase().includes(query);
        const matchesNit = row.nit?.toLowerCase().includes(query) ?? false;
        const matchesNrc = row.nrc?.toLowerCase().includes(query) ?? false;
        const matchesContact = row.contactName?.toLowerCase().includes(query) ?? false;
        const matchesEmail = row.email?.toLowerCase().includes(query) ?? false;
        const matchesPhone = row.phone?.toLowerCase().includes(query) ?? false;
        if (!matchesName && !matchesNit && !matchesNrc && !matchesContact && !matchesEmail && !matchesPhone) {
          return false;
        }
      }
      if (statusFilter && row.status !== statusFilter) return false;
      return true;
    });
  }, [suppliers, search, statusFilter]);

  const columns: TableColumn<Supplier>[] = [
    {
      key: 'name',
      header: 'Proveedor / Razón Social',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.name}</p>
          {row.contactName && (
            <p className="text-xs text-slate-500">Contacto: {row.contactName}</p>
          )}
        </div>
      ),
    },
    {
      key: 'taxId',
      header: 'NIT / NRC',
      render: (row) => (
        <div className="text-xs">
          {row.nit ? (
            <p className="font-mono text-slate-800">NIT: {row.nit}</p>
          ) : (
            <p className="text-slate-400">NIT: —</p>
          )}
          {row.nrc && <p className="font-mono text-slate-500">NRC: {row.nrc}</p>}
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Teléfono',
      render: (row) => (
        <span className="text-xs text-slate-700">
          {row.phone || <span className="text-slate-400">—</span>}
        </span>
      ),
    },
    {
      key: 'email',
      header: 'Correo electrónico',
      render: (row) => (
        <span className="text-xs text-slate-700">
          {row.email ? (
            <a
              href={`mailto:${row.email}`}
              className="text-teal-700 hover:text-teal-900 hover:underline"
            >
              {row.email}
            </a>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (row) => <SupplierStatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: 'Acciones',
      align: 'right',
      render: (row) => (
        <div className="inline-flex items-center gap-1.5">
          {canEdit && (
            <Link to={`/proveedores/${row.id}/editar`}>
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
        title="Catálogo de Proveedores"
        description="Gestión y catálogo de droguerías y proveedores farmacéuticos para recepción de mercadería."
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Proveedores' },
        ]}
        useCaseCode="CU-11"
        actions={
          canEdit && (
            <Link to="/proveedores/nuevo">
              <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
                Registrar proveedor
              </Button>
            </Link>
          )
        }
      />

      {/* Filtros */}
      <div className="mb-5 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs sm:grid-cols-12">
        <div className="sm:col-span-8">
          <Input
            placeholder="Buscar por nombre, NIT, NRC, contacto, correo o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            aria-label="Buscar proveedores"
          />
        </div>
        <div className="sm:col-span-4">
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
        isLoading={isSuppliersLoading}
        error={suppliersError}
        emptyTitle={
          suppliers.length === 0 && !search && !statusFilter
            ? 'No hay proveedores registrados.'
            : 'No hay proveedores que coincidan'
        }
        emptyDescription={
          suppliers.length === 0 && !search && !statusFilter
            ? 'El catálogo de proveedores farmacéuticos se encuentra vacío en la base de datos.'
            : 'Pruebe limpiando los filtros de búsqueda o registre un nuevo proveedor.'
        }
        emptyAction={
          suppliers.length === 0 && !search && !statusFilter && canEdit ? (
            <Link to="/proveedores/nuevo">
              <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                Registrar proveedor
              </Button>
            </Link>
          ) : undefined
        }
      />
    </div>
  );
};
