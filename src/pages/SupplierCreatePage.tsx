import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { SupplierForm } from '../features/suppliers/SupplierForm';
import { useStockCare } from '../hooks/useStockCare';

export const SupplierCreatePage: React.FC = () => {
  const { createSupplier } = useStockCare();
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Registrar Nuevo Proveedor"
        description="Registre un proveedor o droguería para asociarlo a las entradas de mercadería y control de compras."
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Proveedores', to: '/proveedores' },
          { label: 'Registrar proveedor' },
        ]}
        useCaseCode="CU-12"
      />

      <SupplierForm
        mode="create"
        onSubmit={async (values) => {
          const res = await createSupplier(values);
          if (res.ok) {
            navigate('/proveedores');
          }
          return res;
        }}
        onCancel={() => navigate('/proveedores')}
      />
    </div>
  );
};
