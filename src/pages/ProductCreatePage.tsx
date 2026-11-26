import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { ProductForm } from '../features/products/ProductForm';
import { useStockCare } from '../hooks/useStockCare';

export const ProductCreatePage: React.FC = () => {
  const { createProduct } = useStockCare();
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Registrar Nuevo Producto"
        description="Registre un medicamento o insumo básico para habilitar su control de lotes y existencias (RF-01)."
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Productos', to: '/productos' },
          { label: 'Crear producto' },
        ]}
        useCaseCode="CU-05"
      />

      <ProductForm
        mode="create"
        onSubmit={(values) => {
          const res = createProduct(values);
          if (res.ok) {
            navigate('/productos');
          }
          return res;
        }}
        onCancel={() => navigate('/productos')}
      />
    </div>
  );
};

