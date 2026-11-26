import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { ProductForm } from '../features/products/ProductForm';
import { useStockCare } from '../hooks/useStockCare';

export const ProductEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products, isLoadingProducts, updateProduct } = useStockCare();

  const product = products.find((p) => p.id === id);

  if (isLoadingProducts) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
          <span className="text-sm font-medium text-slate-500">Cargando producto...</span>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-xl py-8">
        <Alert
          variant="error"
          title="Producto no encontrado"
          action={
            <Link to="/productos">
              <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Volver al listado
              </Button>
            </Link>
          }
        >
          El producto solicitado no existe en el catálogo o el identificador es inválido.
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={`Editar Producto: ${product.code}`}
        description="Actualice los datos básicos, el nivel de stock mínimo o el estado del producto (RF-01)."
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Productos', to: '/productos' },
          { label: 'Editar producto' },
        ]}
        useCaseCode="CU-06"
      />

      <ProductForm
        mode="edit"
        initialValues={{
          code: product.code,
          name: product.name,
          category: product.category,
          presentation: product.presentation,
          minStock: product.minStock,
          status: product.status,
          description: product.description,
        }}
        onSubmit={async (values) => {
          const res = await updateProduct(product.id, values);
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

