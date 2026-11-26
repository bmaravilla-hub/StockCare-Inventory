# 07 — AUDITORÍA DE FILTROS, BÚSQUEDAS Y CONSULTAS

**Proyecto:** StockCare — Sistema de Gestión y Control de Inventario para Farmacia  
**Materia:** Análisis y Diseño de Sistemas (ADS) — Universidad Don Bosco  
**Fecha de Auditoría:** 26 de Noviembre de 2026  
**Objetivo:** Analizar todos los mecanismos de filtrado, ordenamiento y búsqueda en el cliente (`array.filter`, `array.sort`), evaluar su escalabilidad y definir la estrategia de migración hacia consultas indexadas en Cloud Firestore.

---

## 1. Inventario de Filtros y Consultas en el Código

| Pantalla | Campo / Filtro | Mecanismo en Código | Dónde Filtra | Dataset | Escalabilidad Actual | Consulta Firestore Equivalente |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `ProductsListPage.tsx` | Búsqueda rápida de texto | `row.code.includes(q) \|\| row.name.includes(q) \|\| row.presentation.includes(q)` | **Cliente** | Arreglo completo en memoria | **Pobre con >1000 registros** | Búsqueda por prefijo o tokens normalizados en array `searchKeywords` |
| `ProductsListPage.tsx` | Categoría | `row.category === categoryFilter` | **Cliente** | Completo | Moderada | `query(collection(db, 'products'), where('category', '==', cat))` |
| `ProductsListPage.tsx` | Estado (Activo/Inactivo) | `row.status === statusFilter` | **Cliente** | Completo | Moderada | `query(collection(db, 'products'), where('status', '==', status))` |
| `InventoryPage.tsx` | Nivel de stock ('Normal', 'StockBajo', 'SinExistencias') | `summary.stockStatus === levelFilter` | **Cliente** | Completo | **Crítica**: recalcula sumas de todos los lotes para cada producto | Almacenar `currentStock` y `stockStatus` en doc `products` para indexar con `where('currentStock', '<=', minStock)` |
| `BatchesPage.tsx` | Búsqueda por lote/producto | `r.batchNumber.includes(q) \|\| r.productName.includes(q)` | **Cliente** | Completo | Pobre | Query por `productId` o `batchNumber` |
| `BatchesPage.tsx` | Estado de vencimiento | `r.status === statusFilter` | **Cliente** | Completo | Pobre | `where('expiryDate', '<=', targetDate)` |
| `BatchesPage.tsx` | Solo con existencia | `r.quantity <= 0` | **Cliente** | Completo | Pobre | `where('quantity', '>', 0)` |
| `BatchesPage.tsx` | Orden FEFO | `a.expiryDate.localeCompare(b.expiryDate)` | **Cliente** | Completo | Ineficiente en cliente grande | `orderBy('expiryDate', 'asc')` en Firestore |
| `EntriesListPage.tsx`| Búsqueda por documento/proveedor | `entry.documentNumber.includes(q) \|\| entry.provider.includes(q)` | **Cliente** | Completo | Pobre | Búsqueda exacta `where('documentNumber', '==', doc)` o índice de texto |
| `EntriesListPage.tsx`| Filtro por proveedor | `entry.provider === providerFilter` | **Cliente** | Completo | Moderada | `where('provider', '==', prov)` |
| `ExitsListPage.tsx`  | Búsqueda por referencia/producto | `exit.reference.includes(q) \|\| prod.name.includes(q)` | **Cliente** | Completo | Pobre | `where('reference', '==', ref)` |
| `ExitsListPage.tsx`  | Motivo de salida | `exit.reason === reasonFilter` | **Cliente** | Completo | Moderada | `where('reason', '==', reason)` |
| `MovementsPage.tsx`  | Rango de fechas (desde / hasta) | `m.date >= dateFrom && m.date <= dateTo` | **Cliente** | Completo | **Muy deficiente** al crecer el histórico de movimientos | `where('date', '>=', from), where('date', '<=', to), orderBy('date', 'desc')` (Índice compuesto) |
| `MovementsPage.tsx`  | Tipo de movimiento | `m.type === typeFilter` | **Cliente** | Completo | Moderada | `where('type', '==', type)` |
| `MovementsPage.tsx`  | Producto específico | `m.productId === productFilter` | **Cliente** | Completo | Moderada | `where('productId', '==', prodId)` |
| `ReportsPage.tsx`    | Rango de fechas y categoría | Filtros en memoria sobre `entries`, `exits`, `movements`, `batches` | **Cliente** | Completo | **Peligro de bloqueo de memoria** en reportes anuales | Queries acotadas con límite y filtros de rango en servidor |
| `DashboardPage.tsx`  | Últimos movimientos | `movements.slice(0, 6)` | **Cliente** | Completo | Ineficiente (descarga todo para mostrar 6) | `query(collection(db, 'movements'), orderBy('createdAt', 'desc'), limit(6))` |

---

## 2. Estrategia de División: Frontend vs. Consultas Firestore

### Consultas que DEBEN migrar a Cloud Firestore (Servidor)
1. **Movimientos / Kardex:**
   - En una farmacia con actividad comercial regular, el kardex supera rápidamente los miles de registros.
   - Debe implementarse paginación con `limit(25)` y cursor `startAfter(lastVisibleDoc)`.
   - Consulta requerida:
     ```typescript
     query(
       collection(db, 'movements'),
       orderBy('createdAt', 'desc'),
       limit(25)
     )
     ```
2. **Dashboard - Movimientos recientes:**
   - Descargar únicamente los últimos 6 registros mediante `limit(6)`.
3. **Lotes próximos a vencer y vencidos (Alertas):**
   - No es necesario descargar lotes que vencen dentro de dos años para calcular las alertas del mes.
   - Consulta requerida:
     ```typescript
     query(
       collection(db, 'batches'),
       where('quantity', '>', 0),
       where('expiryDate', '<=', alertThresholdDate),
       orderBy('quantity'),
       orderBy('expiryDate', 'asc')
     )
     ```
4. **Historial de Entradas y Salidas:**
   - Paginación basada en servidor con cursores Firestore.

### Filtros que pueden MANTENERSE en el Frontend (Cliente)
1. **Filtro de categorías de productos:**
   - El catálogo de una farmacia mediana típica comprende entre 100 y 1,000 productos. Mantener el catálogo activo en memoria local con listener en tiempo real (`onSnapshot`) es viable y provee respuesta instantánea al usuario sin costos excesivos de lectura.
2. **Búsqueda interactiva en el modal de salida por lote:**
   - Una vez seleccionado un producto, los lotes asociados rara vez superan los 5 o 10 lotes. El filtrado FEFO en memoria cliente es óptimo.
3. **Filtro de pestañas de reportes:**
   - La selección visual entre Existencias, Entradas, Salidas y Movimientos debe manejarse por URL search params (`?tab=...`) en React Router.
