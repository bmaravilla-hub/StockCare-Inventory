# 30_CONSOLIDACION_DASHBOARD_REPORTES_FIRESTORE.md

## StockCare — Sistema de Control de Inventario para Farmacia
**Etapa 7 — Consolidación de Dashboard y Reportes con Datos Reales de Firestore**  
**Fecha:** 26 de Noviembre de 2026  
**Rama:** `main`  
**Estado del Build:** EXIT CODE 0 (`npm run build` / TypeScript + Vite)

---

## 1. Resumen Ejecutivo

En la **Etapa 7** se consolidaron y optimizaron dos áreas clave de supervisión y gestión administrativa de StockCare:
1. **El Dashboard Operacional (`DashboardPage.tsx`):** Centraliza en tiempo real las métricas críticas del catálogo, existencias activas, alertas de desabastecimiento/vencimiento y un módulo dinámico de actividad reciente (conmutador entre Kardex, Entradas y Salidas), gobernado 100% por Cloud Firestore.
2. **El Módulo de Reportes de Inventario (`ReportsPage.tsx`):** Agrupa cinco reportes analíticos con filtrado multidimensional, rangos de fechas inclusivos, cálculo automático de totalizadores por reporte y exportación a CSV con codificación UTF-8 BOM e impresión directa con estilos adaptados.

Ambos módulos consumen exclusivamente las colecciones vivas sincronizadas vía `onSnapshot` a través de `StockCareContext.tsx`, eliminando cualquier dependencia de mocks o persistencia local.

---

## 2. Área A: Dashboard Operacional (`DashboardPage.tsx`)

### 2.1 Fuentes de Datos Reales
El panel consume exclusivamente datos del contexto global:
- `products`: Catálogo de productos y saldo consolidado `currentStock`.
- `batches`: Existencia física por lote y fechas de vencimiento.
- `movements`: Trazabilidad Kardex append-only.
- `entries`: Recepciones de mercadería de proveedores.
- `exits`: Despachos de mercadería, ventas y descartes.
- `settings`: Parámetros institucionales (nombre, días de anticipación `expiryAlertDays`).
- `session`: Información del usuario autenticado (ADMIN o BODEGA).

### 2.2 Métricas Principales Consolidadas

| Métrica | Valor Mostrado | Subtítulo Informativo | Fuente / Cálculo |
| :--- | :---: | :--- | :--- |
| **Productos registrados** | `totalRegisteredProducts` | `X activos en catálogo` | `products.length` / `products.filter(p => p.status === 'Activo').length` |
| **Unidades en inventario** | `totalUnits` | `Existencia física activa` | `activeProducts.reduce((sum, p) => sum + p.currentStock, 0)` |
| **Stock bajo / agotado** | `lowStock + outOfStock` | `X agotados • Y con stock bajo` | `getInventoryAlerts().outOfStockProducts.length` + `getInventoryAlerts().lowStockProducts.length` |
| **Próximos a vencer** | `soonCount + expiredCount` | `X vencido(s) • Y por vencer` | `getInventoryAlerts().expiredBatches.length` + `getInventoryAlerts().expiringSoonBatches.length` |
| **Movimientos Kardex** | `movements.length` | `Trazabilidad entrada/salida` | Total de documentos en la colección `movements` |

> [!NOTE]
> La **Existencia total** representa la suma real de `currentStock` de los productos activos en catálogo, la cual coincide lógicamente con la sumatoria de las cantidades físicas `batch.quantity` de todos los lotes activos.

### 2.3 Manejo de Estados de Carga y Error
- **Loading:** La bandera `isLoading` unifica los estados de carga de todas las colecciones (`products`, `batches`, `movements`, `entries`, `exits`). Mientras resuelve el snapshot inicial, se despliega un spinner visual (`Loader2`) y las tarjetas de métricas muestran un guion (`-`), previniendo parpadeos confusos con valores en cero.
- **Error:** Si algún listener de Firestore reporta fallos de permisos o red, se despliega un componente `<Alert variant="error">` con el mensaje exacto.
- **Alerta prioritaria:** Si existen lotes vencidos con existencias físicas (`expiredCount > 0`), se muestra una alerta superior roja con acceso directo a la resolución operativa en `/alertas`.

### 2.4 Tablas Operativas y Actividad Reciente
El Dashboard organiza su contenido inferior en un grid equilibrado de 2 columnas:
1. **Columna Izquierda (Lotes Críticos):** Muestra los primeros 5 lotes con existencia física que requieren atención prioritaria (vencidos y próximos a vencer dentro del horizonte de configuración), ordenados por `expiryDate ASC`.
2. **Columna Derecha (Actividad Operativa Reciente):** Incorpora un selector de pestañas limpio que permite al operador alternar entre:
   - **Movimientos:** Últimos 5 registros de Kardex con fecha, producto, lote, tipo Entrada/Salida, cantidad y saldo final resultante.
   - **Entradas:** Últimas 5 recepciones con fecha, número de documento/factura, proveedor, unidades ingresadas y usuario.
   - **Salidas:** Últimas 5 salidas con fecha, producto, lote, cantidad, motivo de salida y usuario responsable.

---

## 3. Área B: Reportes de Inventario (`ReportsPage.tsx`)

### 3.1 Reportes Base Implementados

El módulo consolida 5 vistas analíticas especializadas accesibles mediante pestañas:

1. **Existencias Actuales (`existencias`):**
   - Catálogo activo con código, producto, categoría, presentación, cantidad de lotes vigentes, existencia física actual, stock mínimo y semáforo de nivel (`Normal`, `StockBajo`, `SinExistencias`).
   - Totalizador: Total de productos activos y **Total de existencia física** en bodega.
   - Filtros: Búsqueda rápida por nombre/código/presentación y selector de categoría terapéutica.

2. **Entradas de Mercadería (`entradas`):**
   - Historial de recepciones con número de documento, fecha, proveedor, cantidad de líneas de producto, total de unidades recibidas y usuario que registró.
   - Totalizador: Total de documentos registrados y **Total de unidades ingresadas**.
   - Filtros: Búsqueda libre, selector de proveedor de la colección `suppliers` y rango de fechas (desde / hasta).

3. **Salidas de Mercadería (`salidas`):**
   - Historial de despachos con código de referencia, fecha, producto, lote, motivo de salida (`Venta`, `Uso interno`, `Descarte por vencimiento`, etc.), cantidad despachada y usuario responsable.
   - Totalizador: Total de salidas registradas y **Total de unidades despachadas**.
   - Filtros: Búsqueda libre, selector de motivo estandarizado (`EXIT_REASONS`) y rango de fechas (desde / hasta).

4. **Movimientos Kardex (`movimientos`):**
   - Auditoría cronológica completa de entradas y salidas con fecha, producto, lote, tipo de operación, cantidad transaccionada, saldo resultante tras el movimiento, referencia, detalle y usuario.
   - Totalizador: Total de transacciones registradas, unidades ingresadas (`+`) y unidades despachadas (`-`).
   - Filtros: Búsqueda libre, selector de tipo (`Entrada` / `Salida`) y rango de fechas (desde / hasta).

5. **Control de Vencimientos (`vencimientos`):**
   - Análisis de lotes físicos disponibles (`quantity > 0`) con código, producto, lote, existencia física, fecha de expiración y estado de vencimiento (`Vencido`, `Próximo a vencer`, `Vigente`).
   - Totalizador: Total de lotes activos con existencia física, unidades vencidas, unidades próximas a vencer y unidades plenamente vigentes.
   - Filtros: Búsqueda libre, selector de estado de vencimiento y selector de categoría terapéutica.

### 3.2 Homogeneización de Criterios y Filtros
- **Criterio de fechas inclusivo:** Para todos los reportes con filtro cronológico, se aplica la comparación `date >= dateFrom && date <= dateTo`.
- **Botón "Limpiar filtros":** Restablece todos los parámetros de búsqueda de forma inmediata.
- **Snapshots Históricos:** Las tablas y exportaciones priorizan `productName`, `productCode`, `batchNumber` y `supplierName` almacenados en cada documento transaccional para preservar la integridad histórica aunque un producto o proveedor sea modificado posteriormente.

### 3.3 Exportaciones y Formatos
- **Exportar CSV:** Descarga directa de archivos `.csv` compatibles con Microsoft Excel (BOM UTF-8 `\uFEFF`), respetando fielmente los filtros activos y nombres de columnas claras en español.
- **Imprimir / Guardar como PDF:** Mediante `window.print()` con clases CSS `no-print` que ocultan botones de navegación, menús laterales y filtros, imprimiendo únicamente la cabecera institucional y la tabla de datos.

---

## 4. Consistencia Global entre Módulos

Se verificó la absoluta coherencia numérica entre pantallas:
- **`product.currentStock`**: Coincide de manera exacta entre `ProductsListPage`, `InventoryPage`, `DashboardPage` y el reporte de `Existencias actuales`.
- **Alertas de inventario**: Los contadores de productos agotados, con stock bajo, lotes vencidos y lotes próximos a vencer son calculados por la función compartida `getInventoryAlerts()`, garantizando números idénticos en `Sidebar`, `Topbar`, `AlertsPage`, `DashboardPage` y el reporte de `Vencimientos`.
- **Movimientos**: Los saldos resultantes (`resultingStock`) registrados en `movements` coinciden entre `MovementsPage`, `DashboardPage` y el reporte de `Movimientos (Kardex)`.

---

## 5. Resultados de Control de Calidad (QA)

| ID | Caso de Prueba | Resultado |
| :--- | :--- | :---: |
| **QA-DASH-01** | Sin información en base de datos → Dashboard muestra empty states sin errores | **PASS** |
| **QA-DASH-02** | Crear producto → Contador se actualiza automáticamente | **PASS** |
| **QA-DASH-03** | Registrar entrada → Existencia total aumenta en vivo | **PASS** |
| **QA-DASH-04** | Registrar entrada → Nueva entrada aparece en pestaña de Entradas recientes | **PASS** |
| **QA-DASH-05** | Registrar salida → Existencia total disminuye en vivo | **PASS** |
| **QA-DASH-06** | Registrar salida → Salida y movimiento aparecen en actividad reciente | **PASS** |
| **QA-DASH-07** | Stock <= minStock → Métrica coincide con AlertsPage | **PASS** |
| **QA-DASH-08** | Stock == 0 → Métrica de agotados coincide con AlertsPage | **PASS** |
| **QA-DASH-09** | Lote próximo a vencer → Métrica coincide con AlertsPage | **PASS** |
| **QA-DASH-10** | Lote vencido → Métrica y alerta superior activadas | **PASS** |
| **QA-DASH-11** | Modificaciones en otro navegador → Sincronización automática sin F5 | **PASS** |
| **QA-REP-01** | Existencias en reporte coinciden con `products.currentStock` | **PASS** |
| **QA-REP-02** | Reporte de movimientos coincide con Kardex | **PASS** |
| **QA-REP-03** | Entrada nueva aparece de inmediato en reporte de entradas | **PASS** |
| **QA-REP-04** | Salida nueva aparece de inmediato en reporte de salidas | **PASS** |
| **QA-REP-05** | Filtros de fecha desde/hasta funcionan de manera inclusiva | **PASS** |
| **QA-REP-06** | Filtro de proveedor lista entradas correctas | **PASS** |
| **QA-REP-07** | Filtro de producto lista salidas/movimientos correctos | **PASS** |
| **QA-REP-08** | Filtro de motivo lista salidas correspondientes | **PASS** |
| **QA-REP-09** | Clasificación de vencimientos coincide con AlertsPage | **PASS** |
| **QA-REP-10** | Lotes con existencia 0 no figuran como alerta activa | **PASS** |
| **QA-REP-11** | Snapshots históricos se preservan en reportes y exportación CSV | **PASS** |
| **QA-REP-12** | Empty states claros y contextuales cuando no hay datos filtrados | **PASS** |

---

## 6. Archivos Modificados

| Archivo | Tipo | Descripción |
| :--- | :---: | :--- |
| `src/pages/DashboardPage.tsx` | Modificación | Consolidación con cálculo de existencias activas, estado de carga global, pestañas para actividad reciente (Movimientos, Entradas, Salidas) y alertas sincronizadas. |
| `src/pages/ReportsPage.tsx` | Modificación | Consolidación de 5 reportes, totalizadores automáticos, filtros homogéneos con fechas inclusivas, exportación a CSV con UTF-8 BOM y snapshots históricos. |
| `30_CONSOLIDACION_DASHBOARD_REPORTES_FIRESTORE.md` | Creación | Documentación técnica y funcional detallada de la Etapa 7. |

---

## 7. Verificación de Compilación

Comando:
```bash
npm run build
```
Resultado:
```
> stockcare-frontend@1.0.0 build
> tsc -b && vite build

vite v6.4.6 building for production...
transforming...
✓ 1707 modules transformed.
rendering chunks...
computing gzip size...
docs/index.html                              0.53 kB │ gzip:   0.34 kB
docs/assets/stockcare-logo-CpG3XUCJ.png    405.53 kB
docs/assets/index-7Uzyyp_3.css              44.17 kB │ gzip:   8.19 kB
docs/assets/index-OERs5K1Y.js            1,213.30 kB │ gzip: 314.77 kB
✓ built in 4.81s
```
**Exit Code:** 0 (Cero errores de compilación, cero warnings de tipos).
