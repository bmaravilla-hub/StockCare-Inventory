# 12 — MAPA DE RUTAS Y NAVEGACIÓN DE STOCKCARE

**Proyecto:** StockCare — Sistema de Gestión y Control de Inventario para Farmacia  
**Materia:** Análisis y Diseño de Sistemas (ADS) — Universidad Don Bosco  
**Fecha de Auditoría:** 26 de Noviembre de 2026  
**Librería de Enrutamiento:** React Router DOM v7.6.0  
**Archivo Central:** `src/App.tsx` (líneas 31–77)

---

## 1. Mapa Completo de Rutas

A continuación se listan todas las rutas configuradas en la aplicación, su componente asociado, guardas de acceso, roles permitidos y requerimientos de datos:

| Path | Página | Componente | Rol Permitido | Protegida | Estado | Datos Requeridos |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| `/` | Redirección raíz | `<Navigate to="/dashboard" replace />` | Cualquier usuario | No | **En uso** | Ninguno. Redirige a dashboard si está logueado, o al login si no lo está. |
| `/login` | Inicio de Sesión / Registro | `LoginPage` | Solo usuarios NO autenticados (`PublicOnlyRoute`) | No | **En uso** | `isFirebaseConfigured`, cuentas demo. Si ya tiene sesión, redirige a `/dashboard`. |
| `/dashboard` | Panel de Control | `DashboardPage` | Cualquier rol autenticado (`ADMIN` o `BODEGA`) | **SÍ** | **En uso** | `products`, `batches`, `movements`, `settings`. |
| `/perfil` | Perfil de Usuario | `ProfilePage` | Cualquier rol autenticado (`ADMIN` o `BODEGA`) | **SÍ** | **En uso** | `session`, `settings`. Edición de settings restringida a `ADMIN`. |
| `/productos` | Catálogo de Productos | `ProductsListPage` | Cualquier rol autenticado (`ADMIN` o `BODEGA`) | **SÍ** | **En uso** | `products`, `batches`, `settings`. Botón "Nuevo" condicionado a `BODEGA`. |
| `/productos/nuevo` | Registrar Nuevo Producto | `ProductCreatePage` | **Solo `BODEGA`** (`RoleRoute`) | **SÍ** | **En uso** | `state.products` (para validar unicidad de código). |
| `/productos/:id/editar` | Modificar Producto | `ProductEditPage` | **Solo `BODEGA`** (`RoleRoute`) | **SÍ** | **En uso** | Param `:id`, producto existente en catálogo. |
| `/entradas` | Listado de Entradas | `EntriesListPage` | Cualquier rol autenticado (`ADMIN` o `BODEGA`) | **SÍ** | **En uso** | `entries`, `products`, `settings`. Botón "Registrar" solo para `BODEGA`. |
| `/entradas/nueva` | Registrar Recepción | `EntryCreatePage` | **Solo `BODEGA`** (`RoleRoute`) | **SÍ** | **En uso** | `products` (activos), proveedor, número de factura. |
| `/salidas` | Listado de Salidas | `ExitsListPage` | Cualquier rol autenticado (`ADMIN` o `BODEGA`) | **SÍ** | **En uso** | `exits`, `products`. Botón "Registrar salida" solo para `BODEGA`. |
| `/salidas/nueva` | Registrar Despacho | `ExitCreatePage` | **Solo `BODEGA`** (`RoleRoute`) | **SÍ** | **En uso** | `products` con existencia, lotes FEFO disponibles. Lee query params opcionales. |
| `/inventario` | Existencias Disponibles | `InventoryPage` | Cualquier rol autenticado (`ADMIN` o `BODEGA`) | **SÍ** | **En uso** | `products` (activos), `batches`, `settings`. Soporta `?nivel=bajo`. |
| `/lotes` | Control de Lotes | `BatchesPage` | Cualquier rol autenticado (`ADMIN` o `BODEGA`) | **SÍ** | **En uso** | `batches`, `products`, `settings`. Enlace a salida rápida para `BODEGA`. |
| `/alertas` | Alertas de Vencimiento y Stock | `AlertsPage` | Cualquier rol autenticado (`ADMIN` o `BODEGA`) | **SÍ** | **En uso** | `batches`, `products`, `settings`. |
| `/movimientos` | Historial Kardex | `MovementsPage` | Cualquier rol autenticado (`ADMIN` o `BODEGA`) | **SÍ** | **En uso** | `movements`, `products`. |
| `/reportes` | Reportes Administrativos | `ReportsPage` | **Solo `ADMIN`** (`RoleRoute`) | **SÍ** | **En uso** | `products`, `batches`, `entries`, `exits`, `movements`, `settings`. Soporta `?tab=...`. |
| `*` | Página de Error 404 | `NotFoundPage` | Pública | No | **En uso** | Comodín para cualquier ruta inválida. Enlace de retorno dinámico. |

---

## 2. Detección de Anomalías y Rutas Huérfanas

### 2.1 Páginas Inaccesibles o Huérfanas
- **Resultado de la auditoría:** **CERO RUTAS HUÉRFANAS**.
- Todas las páginas presentes en `src/pages/` (16 páginas) están debidamente importadas y conectadas a rutas dentro de `src/App.tsx`.
- Todos los botones de acción en menús, encabezados y tablas poseen destinos válidos (`to="..."`).

### 2.2 Rutas Duplicadas
- No existen rutas duplicadas en la configuración de React Router.

### 2.3 Restricción Asimétrica para el Rol Administrador
- **Hallazgo técnico:** El rol `ADMIN` tiene acceso denegado (Error 403) a:
  - `/productos/nuevo`
  - `/productos/:id/editar`
  - `/entradas/nueva`
  - `/salidas/nueva`
- **Impacto:** Si un Administrador desea dar de alta un producto nuevo o corregir un error en la presentación de un medicamento, el sistema se lo impide y debe cerrar sesión para ingresar con el rol `BODEGA`.
- **Recomendación para la fase de implementación:** Permitir al rol `ADMIN` acceso completo tanto a `/reportes` como a la creación/edición de productos y operaciones de inventario, o habilitar `allowedRoles={['ADMIN', 'BODEGA']}` en la ruta `/productos/nuevo` y `/productos/:id/editar`.

### 2.4 Parámetros de Consulta (Query Strings) Reconocidos
- `/inventario?nivel=bajo`: Pre-filtra automáticamente productos con existencia baja o agotada (invocado desde tarjeta del Dashboard).
- `/reportes?tab=vencimientos`: Abre directamente la pestaña de reporte de vencimientos (invocado desde `AlertsPage.tsx`).
- `/salidas/nueva?productId=...&batchId=...&reason=...`: Preselecciona el producto, el lote crítico y el motivo de salida (invocado desde `BatchesPage.tsx` y `AlertsPage.tsx` para agilizar descartes de lotes vencidos).
