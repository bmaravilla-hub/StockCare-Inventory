# 14 — AUDITORÍA DE DASHBOARD Y REPORTES

**Proyecto:** StockCare — Sistema de Gestión y Control de Inventario para Farmacia  
**Materia:** Análisis y Diseño de Sistemas (ADS) — Universidad Don Bosco  
**Fecha de Auditoría:** 26 de Noviembre de 2026  
**Archivos Auditados:** `src/pages/DashboardPage.tsx`, `src/pages/ReportsPage.tsx`, `src/utils/inventory.ts`, `src/utils/exportCsv.ts`.

---

## 1. Auditoría de Indicadores y Métricas del Dashboard

En `DashboardPage.tsx`, las métricas no están "cableadas" con números mágicos; se computan dinámicamente mediante el hook `useMemo` (líneas 45–88) consumiendo los datos provistos por `useStockCare()`.

A continuación se detalla la fórmula y origen exacto de cada indicador:

| Nombre del Indicador | Fuente de Datos | Fórmula / Cálculo en Código | ¿Mock o Real? | Filtros Aplicados | Dependencias |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **Productos registrados** | Arreglo `products` | `products.length` (subtítulo: `products.filter(p => p.status === 'Activo').length`) | **Derivado de mock / local** | Ninguno (total bruto de catálogo) | `products` |
| **Unidades en inventario** | Arreglo `batches` | `batches.reduce((sum, b) => sum + b.quantity, 0)` | **Derivado de mock / local** | Suma `b.quantity` de todos los lotes | `batches` |
| **Stock bajo / agotado** | `products` y `batches` | `activeProducts.filter(p => summary.stockStatus === 'StockBajo' \|\| summary.stockStatus === 'SinExistencias').length` | **Derivado de mock / local** | Solo productos con `status === 'Activo'` cuya suma de lotes sea `<= minStock` | `getProductStockSummary`, `settings.expiryAlertDays` |
| **Próximos a vencer y vencidos** | Arreglo `batches` | `soonCount + expiredCount` (desglose: `expiredCount` vencidos y `soonCount` por vencer) | **Derivado de mock / local** | Lotes con `quantity > 0` y `expiryDate` con días restantes `<= settings.expiryAlertDays` | `getBatchExpiryStatus`, `diffDaysFromToday` |
| **Movimientos recientes** | Arreglo `movements` | `movements.length` (tarjeta) y `movements.slice(0, 6)` (tabla inferior) | **Derivado de mock / local** | Toma los primeros 6 registros cronológicos | `movements` |

---

## 2. Auditoría de Gráficos e Informes Visuales

- **Presencia de Librerías Gráficas (Chart.js, Recharts, ApexCharts):** **NINGUNA**.
- No existen librerías de visualización gráfica en `package.json`.
- La presentación de la información operativa en el Dashboard y en Reportes es 100% tabular y cuantitativa apoyada en:
  1. `MetricCard` para cifras macro.
  2. Tablas `DataTable` para lotes críticos y últimos movimientos.
  3. Banners condicionales `Alert` (ej. advertencia roja prioritaria si `expiredCount > 0`).

---

## 3. Auditoría del Módulo de Reportes (`ReportsPage.tsx`)

El módulo de reportes está reservado exclusivamente para el rol `ADMIN` mediante `RoleRoute` en `App.tsx:68`. Ofrece 5 tipos de informes consolidados con filtros interactivos y descarga directa a Microsoft Excel mediante formato CSV con codificación UTF-8 y BOM (`\uFEFF` en `exportCsv.ts:22`).

### 3.1 Reporte 1: Existencias Actuales (`tab=existencias`)
- **Datos incluidos:** Código, Nombre, Categoría, Presentación, Cantidad de lotes activos, Existencia física total, Stock mínimo configurado, Estado de abastecimiento (Normal, Stock Bajo, Sin Existencias).
- **Filtros disponibles:** Categoría (`categoryFilter`).
- **Exportación CSV:** Archivo `stockcare-existencias-YYYY-MM-DD.csv`.

### 3.2 Reporte 2: Entradas de Inventario (`tab=entradas`)
- **Datos incluidos:** Número de documento/factura, Fecha de recepción, Proveedor, Cantidad de líneas de producto, Unidades totales ingresadas, Usuario responsable.
- **Filtros disponibles:** Rango de fechas (`dateFrom` y `dateTo`).
- **Exportación CSV:** Archivo `stockcare-entradas-YYYY-MM-DD.csv`.

### 3.3 Reporte 3: Salidas de Inventario (`tab=salidas`)
- **Datos incluidos:** Referencia de comprobante, Fecha de despacho, Producto, Número de lote, Motivo de salida ('Venta', 'Uso interno', 'Descarte', etc.), Unidades retiradas, Responsable.
- **Filtros disponibles:** Rango de fechas (`dateFrom` y `dateTo`).
- **Exportación CSV:** Archivo `stockcare-salidas-YYYY-MM-DD.csv`.

### 3.4 Reporte 4: Historial de Movimientos (`tab=movimientos`)
- **Datos incluidos:** Fecha de movimiento, Producto, Número de lote, Tipo (Entrada/Salida), Cantidad con signo (+ / -), Referencia, Usuario operador, Existencia resultante tras la operación.
- **Filtros disponibles:** Rango de fechas (`dateFrom` y `dateTo`).
- **Exportación CSV:** Archivo `stockcare-movimientos-YYYY-MM-DD.csv`.

### 3.5 Reporte 5: Lotes Próximos a Vencer y Vencidos (`tab=vencimientos`)
- **Datos incluidos:** Código, Nombre de producto, Número de lote, Existencia actual del lote, Fecha de caducidad, Estado con semáforo y días restantes.
- **Filtros disponibles:** Categoría de producto.
- **Exportación CSV:** Archivo `stockcare-vencimientos-YYYY-MM-DD.csv`.

---

## 4. Diagnóstico de Rendimiento para Migración a Firestore

1. **Problema de Escalabilidad en Reportes:** Actualmente, para armar los reportes, `ReportsPage` filtra en memoria sobre los arreglos completos descargados al inicio de la sesión. Si el historial de movimientos o salidas alcanza 10,000 registros, descargar todo el historial para exportar un mes causará latencia y consumo excesivo de cuota de lectura en Firestore.
2. **Recomendación para Implementación:**
   - Para reportes históricos con rango de fechas, construir consultas acotadas en Firestore:
     ```typescript
     query(
       collection(db, 'movements'),
       where('date', '>=', dateFrom),
       where('date', '<=', dateTo),
       orderBy('date', 'desc')
     )
     ```
   - Implementar un botón "Generar Reporte" que ejecute la consulta remota bajo demanda en lugar de re-evaluar reactivamente en cada tecla tipeada.
