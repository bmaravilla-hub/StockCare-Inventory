import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { SupplierForm } from '../features/suppliers/SupplierForm';
import { useStockCare } from '../hooks/useStockCare';

export const SupplierEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { suppliers, isSuppliersLoading, updateSupplier } = useStockCare();

  const supplier = suppliers.find((s) => s.id === id);

  if (isSuppliersLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
          <span className="text-sm font-medium text-slate-500">Cargando proveedor...</span>
        </div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="mx-auto max-w-xl py-8">
        <Alert
          variant="error"
          title="Proveedor no encontrado"
          action={
            <Link to="/proveedores">
              <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Volver al listado
              </Button>
            </Link>
          }
        >
          El proveedor solicitado no existe en la base de datos o el identificador es inválido.
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={`Editar Proveedor: ${supplier.name}`}
        description="Actualice los datos comerciales, números de registro tributario o estado del proveedor."
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Proveedores', to: '/proveedores' },
          { label: 'Editar proveedor' },
        ]}
        useCaseCode="CU-13"
      />

      <SupplierForm
        mode="edit"
        initialValues={{
          name: supplier.name,
          nit: supplier.nit,
          nrc: supplier.nrc,
          phone: supplier.phone,
          email: supplier.email,
          contactName: supplier.contactName,
          status: supplier.status,
        }}
        onSubmit={async (values) => {
          const res = await updateSupplier(supplier.id, values);
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
