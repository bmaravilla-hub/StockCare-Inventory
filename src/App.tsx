import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { StockCareProvider } from './services/StockCareContext';
import { ToastContainer } from './components/ToastContainer';
import {
  ProtectedRoute,
  PublicOnlyRoute,
  RoleRoute,
} from './components/RouteGuards';
import { AppLayout } from './layouts/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { ProductsListPage } from './pages/ProductsListPage';
import { ProductCreatePage } from './pages/ProductCreatePage';
import { ProductEditPage } from './pages/ProductEditPage';
import { SuppliersListPage } from './pages/SuppliersListPage';
import { SupplierCreatePage } from './pages/SupplierCreatePage';
import { SupplierEditPage } from './pages/SupplierEditPage';
import { EntriesListPage } from './pages/EntriesListPage';
import { EntryCreatePage } from './pages/EntryCreatePage';
import { ExitsListPage } from './pages/ExitsListPage';
import { ExitCreatePage } from './pages/ExitCreatePage';
import { InventoryPage } from './pages/InventoryPage';
import { BatchesPage } from './pages/BatchesPage';
import { AlertsPage } from './pages/AlertsPage';
import { MovementsPage } from './pages/MovementsPage';
import { ReportsPage } from './pages/ReportsPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const App: React.FC = () => {
  return (
    <StockCareProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/perfil" element={<ProfilePage />} />

              <Route path="/productos" element={<ProductsListPage />} />
              <Route element={<RoleRoute allowedRoles={['BODEGA']} />}>
                <Route path="/productos/nuevo" element={<ProductCreatePage />} />
                <Route
                  path="/productos/:id/editar"
                  element={<ProductEditPage />}
                />
              </Route>

              <Route path="/proveedores" element={<SuppliersListPage />} />
              <Route element={<RoleRoute allowedRoles={['BODEGA']} />}>
                <Route path="/proveedores/nuevo" element={<SupplierCreatePage />} />
                <Route
                  path="/proveedores/:id/editar"
                  element={<SupplierEditPage />}
                />
              </Route>

              <Route path="/entradas" element={<EntriesListPage />} />
              <Route element={<RoleRoute allowedRoles={['BODEGA']} />}>
                <Route path="/entradas/nueva" element={<EntryCreatePage />} />
              </Route>

              <Route path="/salidas" element={<ExitsListPage />} />
              <Route element={<RoleRoute allowedRoles={['BODEGA']} />}>
                <Route path="/salidas/nueva" element={<ExitCreatePage />} />
              </Route>

              <Route path="/inventario" element={<InventoryPage />} />
              <Route path="/lotes" element={<BatchesPage />} />
              <Route path="/alertas" element={<AlertsPage />} />
              <Route path="/movimientos" element={<MovementsPage />} />

              <Route element={<RoleRoute allowedRoles={['ADMIN']} />}>
                <Route path="/reportes" element={<ReportsPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <ToastContainer />
      </BrowserRouter>
    </StockCareProvider>
  );
};

export default App;

