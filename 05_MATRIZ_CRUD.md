# 05 — MATRIZ DE OPERACIONES CRUD DE STOCKCARE

**Proyecto:** StockCare — Sistema de Gestión y Control de Inventario para Farmacia  
**Materia:** Análisis y Diseño de Sistemas (ADS) — Universidad Don Bosco  
**Fecha de Auditoría:** 26 de Noviembre de 2026  
**Criterio:** Inspección del código real para determinar qué operaciones de lectura, creación, modificación y eliminación existen verdaderamente implementadas.

---

## 1. Convenciones de Estado CRUD

- **COMPLETO:** Dispone de las 4 operaciones (Create, Read, Update, Delete) con lógica de persistencia.
- **PARCIAL (R, C, U):** Permite consultar, crear y modificar, pero no eliminar.
- **SOLO LECTURA (R):** La entidad solo se consulta o deriva de otras tablas.
- **SOLO ALTA (R, C):** Permite registrar y consultar, sin edición ni borrado posterior (comportamiento estándar de auditoría farmacéutica para entradas, salidas y kardex).
- **INEXISTENTE:** No existe código ni interfaz para esa entidad.

---

## 2. Matriz Comparativa CRUD por Entidad

| Entidad | READ | CREATE | UPDATE | DELETE | Implementación Actual | Endpoint / Función | Pantalla | Estado Real | Equivalente Firestore |
| :--- | :---: | :---: | :---: | :---: | :--- | :--- | :--- | :--- | :--- |
| **User (Perfil)** | **SÍ** | **SÍ** | **SÍ** | **NO** | Firebase Auth + Firestore `users/{uid}` + `sessionStorage` | `getUserProfile`, `loginWithEmail`, `registerWithEmail`, `updateProfile` | `LoginPage.tsx`, `ProfilePage.tsx` | **Parcial (R, C, U)** | Colección `users/{uid}` |
| **User (Gestión Admin)** | **NO** | **NO** | **NO** | **NO** | Inexistente. No hay vista de administración de usuarios. | Ninguna | Ninguna | **No implementado** | Colección `users` (query de listado y administración) |
| **Product** | **SÍ** | **SÍ** | **SÍ** | **NO** | Estado React + `localStorage` + `persistProduct` | `createProduct`, `updateProduct` | `ProductsListPage`, `ProductCreatePage`, `ProductEditPage` | **Parcial (R, C, U)** (Borrado no implementado por integridad) | Colección `products/{id}` |
| **Supplier** | **SÍ** | **NO** | **NO** | **NO** | Arreglo de strings en memoria (`COMMON_PROVIDERS`) + texto libre | Ninguna función formal | `EntryCreatePage.tsx`, `EntriesListPage.tsx` | **Mock / Inexistente como entidad** | Colección `suppliers/{id}` |
| **Batch (Lote)** | **SÍ** | **SÍ** | **SÍ** | **NO** | Derivado de entradas y salidas + `persistBatch` | Generado en `registerEntry`, actualizado en `registerExit` | `BatchesPage.tsx`, `InventoryPage.tsx`, Modales | **Parcial (R, C, U)** | Colección `batches/{id}` |
| **Inventory (Existencia)** | **SÍ** | **NO** | **NO** | **NO** | Calculado en tiempo de ejecución sumando lotes activos (`getProductStockSummary`) | `getProductTotalStock`, `getProductStockSummary` | `InventoryPage.tsx`, `DashboardPage.tsx` | **Solo Lectura Derivada** | Query agregada sobre `batches` o campo acumulador en `products` |
| **Movement (Kardex)** | **SÍ** | **SÍ** | **NO** | **NO** | Inserción automática al registrar entradas o salidas + `persistMovement` | Generado en `registerEntry` y `registerExit` | `MovementsPage.tsx`, `DashboardPage.tsx`, `ReportsPage.tsx` | **Solo Alta y Lectura (R, C)** (Inmutable por diseño) | Colección `movements/{id}` (Append-only) |
| **Entry (Recepción)** | **SÍ** | **SÍ** | **NO** | **NO** | Formulario maestro-detalle + `persistEntry` | `registerEntry` en `StockCareContext.tsx` | `EntryCreatePage.tsx`, `EntriesListPage.tsx`, `EntryReceiptModal.tsx` | **Solo Alta y Lectura (R, C)** (Inmutable por trazabilidad) | Colección `entries/{id}` |
| **Exit (Despacho)** | **SÍ** | **SÍ** | **NO** | **NO** | Formulario de retiro de lote + `persistExit` | `registerExit` en `StockCareContext.tsx` | `ExitCreatePage.tsx`, `ExitsListPage.tsx` | **Solo Alta y Lectura (R, C)** (Inmutable por trazabilidad) | Colección `exits/{id}` |
| **Adjustment (Ajuste)** | **NO** | **NO** | **NO** | **NO** | Simulado como motivo de salida (`reason: 'Ajuste de inventario'`) | `registerExit` con `reason` específico | `ExitCreatePage.tsx` | **No implementado como entidad propia** | Colección `adjustments/{id}` o `movements` con type `Ajuste` |
| **Alert** | **SÍ** | **NO** | **NO** | **NO** | Filtros computados en cliente cruzando fechas y stock mínimo | `getBatchExpiryStatus`, `getStockLevelStatus` | `AlertsPage.tsx`, `DashboardPage.tsx`, `Topbar.tsx` | **Solo Lectura Derivada** | Consultas Firestore indexadas por `expiryDate` y `quantity` |
| **Settings (Sistema)** | **SÍ** | **NO** | **SÍ** | **NO** | Documento singleton en `localStorage` y `persistSettings` | `updateSettings` en `StockCareContext.tsx` | `ProfilePage.tsx` | **Parcial (R, U)** (Singleton pre-sembrado) | Documento `settings/system` |

---

## 3. Análisis de Operaciones de Escritura y Eliminación

### 3.1 Política de Eliminación (DELETE)
En ningún módulo del frontend existe una función `deleteProduct`, `deleteBatch`, `deleteEntry` o `deleteExit`.
- **Justificación técnica y normativa:** En sistemas de control farmacéutico y auditoría médica, la eliminación física de registros contables o movimientos de inventario está prohibida para evitar fraudes y pérdida de trazabilidad.
- **Estado en Firestore Rules:** El archivo `firestore.rules` del proyecto ya refleja formalmente esta regla de negocio:
  ```javascript
  match /entries/{entryId} {
    allow update, delete: if false;
  }
  match /exits/{exitId} {
    allow update, delete: if false;
  }
  match /movements/{movementId} {
    allow update, delete: if false;
  }
  ```
- **Baja lógica de productos:** Los productos cuentan con el campo `status: 'Activo' | 'Inactivo'`, permitiendo desactivarlos para que no aparezcan en nuevos registros sin destruir su historial previo.

### 3.2 Carencias Críticas en Operaciones CRUD
1. **Proveedores:** Totalmente ausente como entidad gestionable.
2. **Ajustes:** No existe una operación CRUD para conciliar inventario físico vs sistema (ej. sobrantes por error de conteo, roturas o descalces sin lote conocido).
3. **Usuarios:** No existe la operación `READ` de todos los usuarios para un rol Administrador ni la asignación programática de roles.
