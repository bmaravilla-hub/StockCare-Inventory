# 02 — AUDITORÍA EXHAUSTIVA DE DATOS MOCK Y SIMULADOS

**Proyecto:** StockCare — Sistema de Gestión y Control de Inventario para Farmacia  
**Materia:** Análisis y Diseño de Sistemas (ADS) — Universidad Don Bosco  
**Fecha de Auditoría:** 26 de Noviembre de 2026  
**Objetivo:** Inventariar y clasificar todos los datos simulados, semillas, estructuras en memoria y almacenamientos locales para planificar su sustitución controlada por Firestore.

---

## 1. Clasificación Metodológica de Datos

Los datos analizados en StockCare se catalogan bajo las siguientes categorías:

- **A. MOCK PURO:** Datos ficticios estáticos creados exclusivamente para pruebas unitarias o de desarrollo visual sin lógica de negocio asociada.
- **B. MOCK DE FALLBACK:** Datos preconfigurados que el sistema utiliza como estado inicial si no encuentra información en almacenamiento local o remoto.
- **C. DEMO:** Cuentas, perfiles o accesos rápidos destinados a facilitar la demostración académica y evaluación del prototipo.
- **D. DATOS HARDCODEADOS:** Arreglos u objetos constantes integrados directamente en componentes o utilitarios que deberían provenir de colecciones o tablas de configuración.
- **E. LOCALSTORAGE / SESSIONSTORAGE:** Datos serializados en el navegador del cliente que simulan persistencia pero están aislados por dispositivo y usuario.
- **F. DATOS REALES:** Información creada por usuarios reales y persistida en un motor de base de datos remoto (Cloud Firestore o Firebase Auth).

---

## 2. Inventario Detallado de Mocks y Fuentes de Datos

### Mock 01: Catálogo Inicial de Productos (`INITIAL_PRODUCTS`)
- **Archivo:** `src/data/mockData.ts` (líneas 74–231).
- **Consumidores:** `storageService.ts` (línea 33), `firestoreService.ts` (líneas 21, 80), `StockCareContext.tsx`.
- **Pantallas donde aparece:**
  - `ProductsListPage.tsx` (`/productos`)
  - `InventoryPage.tsx` (`/inventario`)
  - `DashboardPage.tsx` (`/dashboard`)
  - `EntryCreatePage.tsx` (`/entradas/nueva`)
  - `ExitCreatePage.tsx` (`/salidas/nueva`)
  - `ReportsPage.tsx` (`/reportes`)
  - `MovementsPage.tsx` (`/movimientos`)
- **Cantidad de registros:** 13 productos (12 activos, 1 inactivo).
- **Estructura del objeto:**
  ```typescript
  {
    id: string; // ej: "prod-01"
    code: string; // ej: "MED-001"
    name: string; // ej: "Paracetamol 500 mg"
    category: string; // ej: "Analgésicos"
    presentation: string; // ej: "Caja x 20 tabletas"
    minStock: number; // ej: 30
    status: 'Activo' | 'Inactivo';
    description?: string;
    createdAt: string; // ISO
    updatedAt: string; // ISO
  }
  ```
- **¿Se modifica desde la UI?:** Sí (mediante `ProductCreatePage` y `ProductEditPage`).
- **¿La modificación realmente persiste?:** 
  - Persiste localmente en `localStorage` (`stockcare_inventory_state_v1`).
  - Si Firebase está configurado, invoca asíncronamente a `persistProduct(newProduct)` en Firestore (`products/{id}`).
- **¿Se guarda en memoria?:** Sí, en el estado React (`useState<PersistedInventoryState>`).
- **¿Se guarda en localStorage?:** Sí, serializado en JSON bajo la clave `stockcare_inventory_state_v1`.
- **Clasificación:** **B. MOCK DE FALLBACK** / **E. LOCALSTORAGE**.
- **¿Debe eliminarse?:** Sí, debe retirarse como estado por defecto en producción y sustituirse por lectura directa de Firestore (o usarse solo como semilla inicial en ambiente de desarrollo).
- **Colección Firebase propuesta:** `products` (documentos con ID autogenerado o código slug).

---

### Mock 02: Recepciones Iniciales de Mercadería (`INITIAL_ENTRIES`)
- **Archivo:** `src/data/mockData.ts` (líneas 233–383).
- **Consumidores:** `storageService.ts` (línea 34), `firestoreService.ts` (líneas 19, 88), `mockData.ts` (`buildInitialInventoryState`).
- **Pantallas donde aparece:**
  - `EntriesListPage.tsx` (`/entradas`)
  - `ReportsPage.tsx` (`/reportes?tab=entradas`)
  - Modal `EntryReceiptModal.tsx`
- **Cantidad de registros:** 4 facturas/documentos de entrada con un total de 15 líneas de detalle.
- **Estructura del objeto:**
  ```typescript
  {
    id: string; // ej: "ent-001"
    documentNumber: string; // ej: "FAC-2026-0198"
    provider: string; // ej: "Droguería Central S.A."
    date: string; // "YYYY-MM-DD"
    notes?: string;
    registeredBy: string; // ej: "Br. Alexis Ernesto Hernández"
    createdAt: string; // ISO
    items: Array<{
      id: string; // ej: "ent-001-1"
      productId: string; // "prod-09"
      quantity: number; // 15
      batchNumber: string; // "LOT-DEX-2601"
      expiryDate: string; // "2026-10-18"
    }>;
  }
  ```
- **¿Se modifica desde la UI?:** Sí, se añaden nuevas entradas desde `EntryCreatePage.tsx`.
- **¿La modificación realmente persiste?:** En `localStorage` inmediatamente; en Firestore (`entries/{id}`) si Firebase está conectado.
- **¿Se guarda en memoria?:** Sí.
- **¿Se guarda en localStorage?:** Sí.
- **Clasificación:** **B. MOCK DE FALLBACK** / **E. LOCALSTORAGE**.
- **¿Debe eliminarse?:** Sí, como mock estático.
- **Colección Firebase propuesta:** `entries` (con subdocumentos o array embebido de `items`).

---

### Mock 03: Salidas y Despachos Iniciales (`INITIAL_EXITS`)
- **Archivo:** `src/data/mockData.ts` (líneas 385–534).
- **Consumidores:** `storageService.ts` (línea 35), `firestoreService.ts` (líneas 20, 92), `mockData.ts` (`buildInitialInventoryState`).
- **Pantallas donde aparece:**
  - `ExitsListPage.tsx` (`/salidas`)
  - `ReportsPage.tsx` (`/reportes?tab=salidas`)
- **Cantidad de registros:** 12 registros de salida (11 por 'Venta', 1 por 'Uso interno').
- **Estructura del objeto:**
  ```typescript
  {
    id: string; // ej: "sal-001"
    productId: string; // "prod-09"
    batchId: string; // "lot-ent-001-1"
    batchNumber: string; // "LOT-DEX-2601"
    quantity: number; // 9
    reason: 'Venta' | 'Descarte por vencimiento' | 'Uso interno' | 'Devolución a proveedor' | 'Ajuste de inventario';
    reference: string; // "VTA-2026-1041"
    date: string; // "2026-10-05"
    notes?: string;
    registeredBy: string;
    createdAt: string;
  }
  ```
- **¿Se modifica desde la UI?:** Sí, mediante `ExitCreatePage.tsx`.
- **¿La modificación realmente persiste?:** En `localStorage` y en Firestore (`exits/{id}`).
- **¿Se guarda en memoria?:** Sí.
- **¿Se guarda en localStorage?:** Sí.
- **Clasificación:** **B. MOCK DE FALLBACK** / **E. LOCALSTORAGE**.
- **¿Debe eliminarse?:** Sí, sustituir por consultas a `exits`.
- **Colección Firebase propuesta:** `exits`.

---

### Mock 04: Lotes y Movimientos Dinámicos (`buildInitialInventoryState`)
- **Archivo:** `src/data/mockData.ts` (líneas 540–636).
- **Consumidores:** `storageService.ts` (línea 31), `firestoreService.ts` (línea 77).
- **Pantallas donde aparece:**
  - `BatchesPage.tsx` (`/lotes`)
  - `AlertsPage.tsx` (`/alertas`)
  - `MovementsPage.tsx` (`/movimientos`)
  - `DashboardPage.tsx` (`/dashboard`)
  - `ReportsPage.tsx` (`/reportes`)
  - `InventoryPage.tsx` (`/inventario`)
- **Cantidad de registros:**
  - **Lotes (`batches`):** 15 lotes generados a partir de las 4 entradas.
  - **Movimientos (`movements`):** 27 movimientos generados (15 de Entrada + 12 de Salida).
- **Estructura del lote (`Batch`):**
  ```typescript
  {
    id: string; // ej: "lot-ent-001-1"
    productId: string; // "prod-09"
    batchNumber: string; // "LOT-DEX-2601"
    quantity: number; // 6 (después de descontar salidas)
    initialQuantity: number; // 15
    expiryDate: string; // "2026-10-18"
    entryId: string; // "ent-001"
    createdAt: string;
  }
  ```
- **Estructura del movimiento (`MovementRecord`):**
  ```typescript
  {
    id: string; // ej: "mov-ent-001-1"
    date: string; // "YYYY-MM-DD"
    createdAt: string; // ISO
    productId: string;
    batchNumber: string;
    type: 'Entrada' | 'Salida';
    quantity: number;
    user: string;
    reference: string;
    detail: string;
    resultingStock: number;
  }
  ```
- **¿Se modifica desde la UI?:** Sí, cada entrada o salida registrada recalcula los lotes y añade movimientos.
- **¿La modificación realmente persiste?:** En `localStorage` y en Firestore (`batches/{id}`, `movements/{id}`).
- **Clasificación:** **B. MOCK DE FALLBACK** / **E. LOCALSTORAGE**.
- **¿Debe eliminarse?:** Sí, la lógica de simulación en memoria debe reemplazarse por transacciones de Firestore (`runTransaction` o `writeBatch`).
- **Colección Firebase propuesta:** `batches` y `movements`.

---

### Mock 05: Cuentas Demo de Acceso Rápido (`DEMO_ACCOUNTS`)
- **Archivo:** `src/data/mockData.ts` (líneas 41–64).
- **Consumidores:** `LoginPage.tsx` (líneas 8, 331), `StockCareContext.tsx` (líneas 16, 256–261).
- **Pantallas donde aparece:**
  - `LoginPage.tsx` (Botones de "Acceso rápido por perfil demo (Prototipo)").
- **Cantidad de registros:** 2 cuentas fijas:
  1. `admin`: "Lic. Rebeca Marcela Orozco", Rol: `ADMIN`.
  2. `bodega`: "Br. Alexis Ernesto Hernández", Rol: `BODEGA`.
- **Estructura del objeto:**
  ```typescript
  {
    id: string; // "usr-admin" | "usr-bodega"
    username: string; // "admin" | "bodega"
    fullName: string;
    email: string;
    role: 'ADMIN' | 'BODEGA';
    roleLabel: string;
    branch: string;
    description: string;
  }
  ```
- **¿Se modifica desde la UI?:** No se añaden cuentas, solo se permite alterar el nombre/correo en `ProfilePage` pero solo afecta la sesión activa.
- **¿La modificación realmente persiste?:** En `sessionStorage` (`stockcare_user_session_v1`).
- **¿Se guarda en memoria?:** Sí.
- **Clasificación:** **C. DEMO** / **D. DATOS HARDCODEADOS**.
- **¿Debe eliminarse?:** Sí, en el paso a producción debe retirarse la opción de login sin contraseña y migrar las cuentas a usuarios reales de Firebase Auth con sus perfiles en Firestore (`users/{uid}`).
- **Colección Firebase propuesta:** `users`.

---

### Mock 06: Configuración del Sistema en Memoria (`INITIAL_SETTINGS`)
- **Archivo:** `src/data/mockData.ts` (líneas 66–72).
- **Consumidores:** `storageService.ts` (líneas 14, 38, 62), `firestoreService.ts` (líneas 22, 57, 100), `StockCareContext.tsx`.
- **Pantallas donde aparece:**
  - `ProfilePage.tsx` (`/perfil`)
  - `Topbar.tsx`, `Sidebar.tsx`, `DashboardPage.tsx`, `AlertsPage.tsx`, `EntryReceiptModal.tsx`
- **Cantidad de registros:** 1 objeto singleton.
- **Estructura del objeto:**
  ```typescript
  {
    pharmacyName: 'Farmacia StockCare',
    branchName: 'Sucursal Central - Ciudadela Don Bosco',
    branchAddress: 'Calle Plan del Pino km 1.5, Soyapango, San Salvador',
    phone: '+503 2251-8200',
    expiryAlertDays: 60
  }
  ```
- **¿Se modifica desde la UI?:** Sí, desde `ProfilePage.tsx` (exclusivo para rol ADMIN).
- **¿La modificación realmente persiste?:** En `localStorage` y en Firestore en el documento `settings/system`.
- **Clasificación:** **B. MOCK DE FALLBACK** / **E. LOCALSTORAGE**.
- **¿Debe eliminarse?:** Sí, debe cargarse del documento `settings/system` en Firestore.
- **Colección Firebase propuesta:** `settings` (documento `system`).

---

### Mock 07: Categorías de Productos Hardcodeadas (`PRODUCT_CATEGORIES`)
- **Archivo:** `src/data/mockData.ts` (líneas 11–23).
- **Consumidores:** `ProductForm.tsx`, `ProductsListPage.tsx`, `InventoryPage.tsx`, `ReportsPage.tsx`.
- **Pantallas donde aparece:** Desplegables de categoría y filtros de búsqueda.
- **Cantidad de registros:** 11 categorías en un array de strings.
- **Clasificación:** **D. DATOS HARDCODEADOS**.
- **¿Se modifica desde la UI?:** No existe gestión de categorías.
- **¿Debe eliminarse?:** Conservar como catálogo base en frontend o migrar a una colección parametrizable `categories` en Firestore si se requiere agregar categorías dinámicamente.

---

### Mock 08: Proveedores Habituales Hardcodeados (`COMMON_PROVIDERS`)
- **Archivo:** `src/data/mockData.ts` (líneas 25–31).
- **Consumidores:** `EntriesListPage.tsx`, `EntryCreatePage.tsx`.
- **Pantallas donde aparece:** Desplegable de proveedor en creación de entradas y filtros de facturas.
- **Cantidad de registros:** 5 nombres de empresas drogueras.
- **Clasificación:** **D. DATOS HARDCODEADOS**.
- **¿Se modifica desde la UI?:** Se permite seleccionar "Otro" e ingresar un nombre libre, pero no existe CRUD de proveedores.
- **¿Debe eliminarse?:** Sí. Debe reemplazarse por una colección real `suppliers` en Firestore con NIT/NRC, teléfono, contacto y estado.
- **Colección Firebase propuesta:** `suppliers`.

---

### Mock 09: Motivos de Salida Hardcodeados (`EXIT_REASONS`)
- **Archivo:** `src/data/mockData.ts` (líneas 33–39).
- **Consumidores:** `ExitCreatePage.tsx`, `ExitsListPage.tsx`.
- **Cantidad de registros:** 5 strings ('Venta', 'Descarte por vencimiento', 'Uso interno', 'Devolución a proveedor', 'Ajuste de inventario').
- **Clasificación:** **D. DATOS HARDCODEADOS** (Enum de negocio).
- **¿Se modifica desde la UI?:** No.
- **¿Debe eliminarse?:** Mantener en frontend como tipo TypeScript restringido (`ExitReason`).

---

### Mock 10: Permisos de Roles Hardcodeados en Perfil
- **Archivo:** `src/pages/ProfilePage.tsx` (líneas 74–90).
- **Consumidores:** `ProfilePage.tsx`.
- **Cantidad de registros:** Dos listas fijas de 6 strings para `ADMIN` y `BODEGA`.
- **Clasificación:** **D. DATOS HARDCODEADOS**.
- **¿Se modifica desde la UI?:** No.
- **¿Debe eliminarse?:** Es informativo en UI, pero la validación real de permisos debe respaldarse mediante Firebase Security Rules y Custom Claims / roles de Firestore.

---

## 3. Resumen Cuantitativo de Auditoría de Mocks

| Tipo de Dato / Mock | Variable en Código | Archivo Origen | Registros | Persistencia Local | Persistencia Firebase | Colección Destino |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Catálogo de Productos | `INITIAL_PRODUCTS` | `mockData.ts:74` | 13 | `localStorage` | Parcial (`persistProduct`) | `products` |
| Entradas / Facturas | `INITIAL_ENTRIES` | `mockData.ts:233` | 4 docs / 15 líneas | `localStorage` | Parcial (`persistEntry`) | `entries` |
| Salidas / Despachos | `INITIAL_EXITS` | `mockData.ts:385` | 12 | `localStorage` | Parcial (`persistExit`) | `exits` |
| Lotes con Existencia | `buildInitialInventoryState` | `mockData.ts:540` | 15 lotes | `localStorage` | Parcial (`persistBatch`) | `batches` |
| Kardex de Movimientos | `buildInitialInventoryState` | `mockData.ts:540` | 27 movs | `localStorage` | Parcial (`persistMovement`) | `movements` |
| Cuentas Demo | `DEMO_ACCOUNTS` | `mockData.ts:41` | 2 cuentas | `sessionStorage` | Ninguna | `users` + Auth |
| Parámetros Farmacia | `INITIAL_SETTINGS` | `mockData.ts:66` | 1 doc singleton | `localStorage` | Parcial (`persistSettings`)| `settings/system` |
| Categorías | `PRODUCT_CATEGORIES` | `mockData.ts:11` | 11 strings | Ninguna | Ninguna | `categories` o Const |
| Proveedores | `COMMON_PROVIDERS` | `mockData.ts:25` | 5 strings | Ninguna | Ninguna | `suppliers` |
| Motivos Salida | `EXIT_REASONS` | `mockData.ts:33` | 5 strings | Ninguna | Ninguna | Enum Frontend |
