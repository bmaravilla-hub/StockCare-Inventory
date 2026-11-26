# 18 — MAPA DE TRAZABILIDAD FUNCIONAL HACIA FIREBASE

**Proyecto:** StockCare — Sistema de Gestión y Control de Inventario para Farmacia  
**Materia:** Análisis y Diseño de Sistemas (ADS) — Universidad Don Bosco  
**Fecha de Auditoría:** 26 de Noviembre de 2026  
**Alcance:** Cobertura de Requerimientos Funcionales (RF-01 al RF-10) y Casos de Uso (CU-01 al CU-15).

---

## 1. Matriz de Trazabilidad Funcional Integral

| Requerimiento | Caso de Uso | Pantalla / Vista | Formulario / Componente | Servicio en Código | Datos Actuales | Firebase Destino | Regla de Negocio Asociada | Estado de Cumplimiento |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **Control de Acceso** | **CU-01** | `/login` (`LoginPage.tsx`) | Formulario Login / Registro + Google OAuth | `authService.ts` (`loginWithEmail`, `loginWithGoogle`) | Firebase Auth / `DEMO_ACCOUNTS` | Firebase Authentication + Firestore `users/{uid}` | Clave >= 6 caracteres; formato correo válido; dominios autorizados | **Implementado** (Purga de bypass demo pendiente) |
| **Panel Operativo** | **CU-02** | `/dashboard` (`DashboardPage.tsx`) | Tarjetas KPI + Tablas resumen | `DashboardPage.tsx` (`useMemo(metrics)`) | Memoria / `localStorage` | Cloud Firestore (`products`, `batches`, `movements`) | Calcula 5 métricas en tiempo real; alerta roja si hay vencidos con stock | **Implementado** (Requiere queries remotas) |
| **Gestión de Perfil** | **CU-03** | `/perfil` (`ProfilePage.tsx`) | Formulario Perfil + Formulario Configuración | `StockCareContext.tsx` (`updateProfile`, `updateSettings`) | `sessionStorage` + `localStorage` | Cloud Firestore (`users/{uid}`, `settings/system`) | Solo `ADMIN` puede alterar parámetros de farmacia y días de alerta | **Implementado** |
| **RF-01: Catálogo** | **CU-04** | `/productos` (`ProductsListPage.tsx`) | Tabla interactiva + Filtros | `ProductsListPage.tsx` | Memoria / `localStorage` | Cloud Firestore (`products`) | Filtros por texto, categoría y estado. Desglose en modal | **Implementado** |
| **RF-01: Alta Prod.** | **CU-05** | `/productos/nuevo` (`ProductCreatePage.tsx`) | `ProductForm.tsx` (mode: create) | `StockCareContext.tsx` (`createProduct`) | `localStorage` + `persistProduct` | Cloud Firestore (`products/{id}`) | Código alfanumérico único en mayúsculas; stock mínimo >= 0 entero | **Implementado** |
| **RF-01: Edit Prod.** | **CU-06** | `/productos/:id/editar` (`ProductEditPage.tsx`) | `ProductForm.tsx` (mode: edit) | `StockCareContext.tsx` (`updateProduct`) | `localStorage` + `persistProduct` | Cloud Firestore (`products/{id}`) | Código único no ocupado por otro ID; actualiza `updatedAt` | **Implementado** |
| **Historial Entradas**| **CU-07** | `/entradas` (`EntriesListPage.tsx`) | Tabla con filtros por proveedor y texto | `EntriesListPage.tsx` | Memoria / `localStorage` | Cloud Firestore (`entries`) | Búsqueda por documento o proveedor; acceso a comprobante | **Implementado** |
| **RF-02/RF-03: Entrada**| **CU-08** | `/entradas/nueva` (`EntryCreatePage.tsx`) | Formulario Maestro-Detalle N líneas | `StockCareContext.tsx` (`registerEntry`) | `localStorage` + Firestore (`entries`, `batches`, `movements`) | Cloud Firestore (Transacción multi-documento) | Fecha <= hoy; vencimiento >= hoy; cantidad > 0; acumula en lote existente si coincide; emite comprobante | **Implementado** |
| **Historial Salidas** | **CU-09** | `/salidas` (`ExitsListPage.tsx`) | Tabla con filtro por motivo de salida | `ExitsListPage.tsx` | Memoria / `localStorage` | Cloud Firestore (`exits`) | Registra despachos por venta, uso interno, vencimiento | **Implementado** |
| **RF-04: Salidas** | **CU-10** | `/salidas/nueva` (`ExitCreatePage.tsx`) | Formulario de despacho de lote | `StockCareContext.tsx` (`registerExit`) | `localStorage` + Firestore (`exits`, `batches`, `movements`) | Cloud Firestore (Transacción atómica) | Cantidad <= stock lote; lote vencido no puede venderse; genera movimiento kardex | **Implementado** |
| **RF-08: Existencias**| **CU-11** | `/inventario` (`InventoryPage.tsx`) | Tabla de existencias consolidadas | `InventoryPage.tsx` | Memoria / `localStorage` | Cloud Firestore (`products`, `batches`) | Suma existencias de lotes activos; semáforo Normal, Stock Bajo, Sin Existencias | **Implementado** |
| **RF-05/RF-06: Lotes** | **CU-12** | `/lotes` (`BatchesPage.tsx`) | Tabla de lotes ordenados por FEFO | `BatchesPage.tsx` | Memoria / `localStorage` | Cloud Firestore (`batches`) | Clasifica en Vigente, Próximo a vencer o Vencido; botón de descarte rápido | **Implementado** |
| **RF-07: Alertas** | **CU-13** | `/alertas` (`AlertsPage.tsx`) | Paneles divididos (vencidos, por vencer, stock bajo) | `AlertsPage.tsx` | Memoria / `localStorage` | Cloud Firestore (`batches`, `products`) | Días restantes <= umbral de alerta; stock actual <= stock mínimo | **Implementado** |
| **RF-09: Movimientos**| **CU-14** | `/movimientos` (`MovementsPage.tsx`) | Kardex tabular con 5 filtros | `MovementsPage.tsx` | Memoria / `localStorage` | Cloud Firestore (`movements`) | Trazabilidad inmutable de entradas y salidas con saldo resultante | **Implementado** |
| **RF-10: Reportes** | **CU-15** | `/reportes` (`ReportsPage.tsx`) | 5 pestañas de reporte + Export CSV | `ReportsPage.tsx`, `exportCsv.ts` | Memoria / `localStorage` | Cloud Firestore (`entries`, `exits`, `movements`, `batches`) | Exclusivo para `ADMIN`; filtros por fecha y categoría; genera archivo Excel CSV con BOM UTF-8 | **Implementado** |

---

## 2. Cobertura del Documento de Especificación ADS (DFD Nivel 1 y 2)

1. **Proceso 1 (Gestionar Entradas):**
   - 1.1 Recibir Mercadería -> Implementado en `EntryCreatePage.tsx` (encabezado).
   - 1.2 Registrar Productos -> Implementado en `EntryCreatePage.tsx` (líneas de detalle).
   - 1.3 Registrar Lote y Vencimiento -> Implementado en `EntryCreatePage.tsx` (campos `batchNumber` y `expiryDate`).
   - 1.4 Actualizar Inventario -> Implementado en `StockCareContext.tsx:538` (actualiza `batches` e inserta en `movements`).
   - 1.5 Generar Comprobante -> Implementado en `EntryReceiptModal.tsx` (impresión inmediata de comprobante).
2. **Proceso 2 (Gestionar Salidas):**
   - Implementado en `ExitCreatePage.tsx` y `StockCareContext.tsx:600`. Valida disponibilidad física por lote y regla de caducidad.
3. **Proceso 3 (Controlar Vencimientos):**
   - Implementado en `AlertsPage.tsx`, `BatchesPage.tsx` y widgets del `DashboardPage.tsx`.
4. **Proceso 4 (Generar Reportes):**
   - Implementado en `ReportsPage.tsx` con exportación en formato tabular compatible con Excel.
