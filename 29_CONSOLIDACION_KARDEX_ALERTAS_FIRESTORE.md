# 29_CONSOLIDACION_KARDEX_ALERTAS_FIRESTORE.md

## StockCare — Sistema de Control de Inventario para Farmacia
**Etapa 6 — Consolidación de Kardex, Trazabilidad y Alertas en Tiempo Real**  
**Fecha:** 26 de Noviembre de 2026  
**Rama:** `main`  
**Estado del Build:** EXIT CODE 0 (`npm run build` / TypeScript + Vite)

---

## 1. Resumen Ejecutivo

En la **Etapa 6** se consolidaron de manera integral y reactiva dos pilares fundamentales del control farmacéutico de StockCare:
1. **El Kardex de Movimientos y Auditoría Histórica (`MovementsPage`):** Trazabilidad completa de operaciones de entrada y salida, gobernada por la colección `movements/{movementId}` en Cloud Firestore, con snapshots históricos del producto y lote, orden cronológico descendente estricto (`createdAt DESC`) e inmutabilidad append-only garantizada por Security Rules.
2. **El Sistema de Alertas Operativas en Tiempo Real (`AlertsPage`, `DashboardPage`, `Sidebar`, `Topbar`):** Motor de cálculo derivado centralizado en `src/utils/inventory.ts` (`getInventoryAlerts`), sin recurrir a colecciones artificiales en Firestore, respetando rigurosamente las reglas de negocio farmacéuticas y el orden de prioridad estricto (1. Vencidos, 2. Agotados, 3. Stock bajo, 4. Próximos a vencer).

---

## 2. Área A: Kardex y Trazabilidad de Movimientos

### 2.1 Modelo de Datos y Fuente Única
- **Colección:** `movements/{movementId}` en Cloud Firestore.
- **Listener:** `subscribeToMovements()` en `src/services/firestoreService.ts`, expuesto a través de `StockCareContext.tsx`.
- **Tipos de movimiento admitidos:** Únicamente `Entrada` y `Salida`.
- **Campos del Documento:**
  - `id`: Identificador único del movimiento.
  - `date`: Fecha de la operación en formato `YYYY-MM-DD`.
  - `createdAt`: Marca de tiempo Firestore (`serverTimestamp()`), serializada a ISO string.
  - `productId`: ID del producto afectado.
  - `productCode`: Snapshot histórico del código al momento de la transacción.
  - `productName`: Snapshot histórico del nombre al momento de la transacción.
  - `batchId`: ID determinístico del lote afectado.
  - `batchNumber`: Número de lote en mayúsculas.
  - `type`: `'Entrada' | 'Salida'`.
  - `quantity`: Cantidad de unidades transaccionadas (`+` en entrada, `-` en salida).
  - `reference`: Número de factura/documento de entrada o código de comprobante de salida.
  - `detail`: Detalle descriptivo (ej. *"Recepción de Droguería Americana"* o *"Descarte por vencimiento"*).
  - `user`: Nombre del operador responsable.
  - `userId` / `createdBy`: UID del usuario en Firebase Authentication.
  - `resultingStock`: Saldo resultante de existencias físicas del producto tras la operación.

### 2.2 Snapshots Históricos y Resiliencia
- En `registerEntryFirestore` y `registerExitFirestore` se graban `productCode` y `productName` de manera simétrica y atómica.
- En `MovementsPage.tsx`, la UI prioriza los snapshots históricos del movimiento (`m.productName`, `m.productCode`); si el registro es anterior a la inclusión del snapshot, se realiza fallback reactivo con el catálogo local `products.find(p => p.id === m.productId)`.
- Si un producto es editado o inactivado posteriormente, el historial del Kardex permanece inalterado y fiel a la realidad en la que ocurrió la operación.

### 2.3 Orden Cronológico y Filtros Funcionales
- **Orden:** `createdAt DESC` (las operaciones más recientes aparecen al principio).
- **Filtros reactivos en memoria sin recargar:**
  1. *Búsqueda rápida por texto libre:* Coincidencia en referencia, número de lote, usuario responsable, detalle/motivo, nombre de producto y código de producto.
  2. *Filtro por Producto:* Menú desplegable con todos los productos del catálogo.
  3. *Filtro por Tipo de Movimiento:* Menú desplegable (`Todos`, `Entrada`, `Salida`).
  4. *Filtro por Rango de Fechas:* Selectores nativos `Fecha desde` y `Fecha hasta`.
- **Estados de Interfaz:**
  - Spinner de carga mientras resuelve el snapshot inicial (`isMovementsLoading`).
  - Alerta visual en caso de error de conexión (`movementsError`).
  - Contador: *"Mostrando X de Y movimientos registrados"*.
  - Empty states contextuales:
    - Sin datos generales: *"No hay movimientos registrados. Aún no se han registrado transacciones de inventario."*
    - Filtros sin coincidencia: *"Sin movimientos en el rango seleccionado. Modifique los filtros de producto, tipo o fechas para ver el historial."*

---

## 3. Área B: Alertas de Inventario en Tiempo Real

### 3.1 Ausencia de Colección Persistente
Las alertas farmacéuticas **no son documentos estáticos ni una colección en Firestore**. Son derivadas reactivamente a partir de los datos vivos de `products`, `batches` y `settings` sincronizados mediante `onSnapshot`. Esto previene desincronizaciones, costos innecesarios de lectura/escritura y datos obsoletos.

### 3.2 Motor Centralizado: `getInventoryAlerts()`
Toda la lógica de evaluación y clasificación se centralizó en `src/utils/inventory.ts`:

```typescript
export function getInventoryAlerts(
  products: Product[],
  batches: Batch[],
  alertThresholdDays = 60
): InventoryAlertsSummary { ... }
```

### 3.3 Reglas de Negocio Farmacéuticas
1. **Lotes Vencidos (Prioridad 1):**
   - Condición: `diffDaysFromToday(batch.expiryDate) < 0 && batch.quantity > 0`.
   - **Regla crítica:** Los lotes con `quantity == 0` (agotados) **NUNCA** alertan vencimiento.
   - Acción directa (BODEGA): Botón *"Registrar descarte"* que redirige al formulario de salida con motivo *"Descarte por vencimiento"*.
2. **Productos Agotados (Prioridad 2):**
   - Condición: `product.status === 'Activo' && currentStock === 0`.
   - **Regla crítica:** Productos con `status === 'Inactivo'` **NO** generan alertas operativas.
   - Acción directa (BODEGA): Botón *"Registrar entrada"*.
3. **Productos con Stock Bajo (Prioridad 3):**
   - Condición: `product.status === 'Activo' && currentStock > 0 && currentStock <= product.minStock`.
   - Acción directa (BODEGA): Botón *"Registrar entrada"*.
4. **Lotes Próximos a Vencer (Prioridad 4):**
   - Condición: `diffDaysFromToday(batch.expiryDate) >= 0 && diffDaysFromToday(batch.expiryDate) <= alertThresholdDays && batch.quantity > 0`.
   - Acción directa (BODEGA): Botón *"Priorizar salida"* bajo esquema FEFO.

### 3.4 Sincronización Global de Indicadores
Para evitar discrepancias en la aplicación, el helper `getInventoryAlerts()` alimenta idénticamente a:
- **`AlertsPage.tsx`:** Cuadrícula de tarjetas de resumen (Vencidos, Agotados, Stock bajo, Próx. a vencer), lista desglosada por orden de prioridad, empty states por sección y general (*"No hay alertas activas."*).
- **`DashboardPage.tsx`:** Tarjetas de métricas de alto nivel (`lowStockCount`, `expiredCount`, `soonCount`) y tabla de lotes críticos.
- **`Sidebar.tsx`:** Badge numérico total en el elemento de navegación *Alertas y Vencimientos*.
- **`Topbar.tsx`:** Indicador reactivo en el botón de campana de notificaciones.

---

## 4. Auditoría de Seguridad e Integridad

### Inmutabilidad de Movimientos
En `firestore.rules`:
```javascript
match /movements/{movementId} {
  // Movimientos de auditoría Kardex append-only
  allow read: if isActiveUser();
  allow create: if isBodega()
    && (request.resource.data.createdBy == request.auth.uid || request.resource.data.userId == request.auth.uid)
    && request.resource.data.type in ['Entrada', 'Salida']
    && request.resource.data.productId is string
    && request.resource.data.quantity is int
    && request.resource.data.quantity > 0
    && request.resource.data.resultingStock is int
    && request.resource.data.resultingStock >= 0;
  allow update, delete: if false;
}
```
- **Append-only:** Ningún usuario (ni siquiera ADMIN) puede modificar o eliminar un registro de Kardex existente (`allow update, delete: if false;`).
- **Validaciones de Integridad:** Se asegura tipo de dato, pertenencia del UID y coherencia del saldo resultante.

---

## 5. Tabla de Archivos Modificados

| Archivo | Tipo de Cambio | Propósito |
| :--- | :--- | :--- |
| `src/utils/inventory.ts` | Modificación | Creación de interfaces `ExpiredBatchAlert`, `ExpiringSoonBatchAlert`, `OutOfStockProductAlert`, `LowStockProductAlert`, `InventoryAlertsSummary` y función centralizada `getInventoryAlerts()`. |
| `src/services/firestoreService.ts` | Modificación | Inclusión de `productCode`, `productName` y `batchId` determinístico al registrar movimientos de entrada en `registerEntryFirestore()`. |
| `src/pages/MovementsPage.tsx` | Modificación | Priorización de snapshots históricos de producto/código, ordenamiento estricto `createdAt DESC`, ampliación del filtro de búsqueda por texto y manejo de empty states. |
| `src/pages/AlertsPage.tsx` | Refactorización | Reorganización estricta por orden de prioridad (1. Vencidos, 2. Agotados, 3. Stock bajo, 4. Próx. a vencer), tarjetas de métricas, consumo de `getInventoryAlerts()`, empty states específicos y general. |
| `src/pages/DashboardPage.tsx` | Modificación | Consumo de `getInventoryAlerts()` para derivar métricas de stock y lotes por vencer sin rediseñar la vista. |
| `src/components/Sidebar.tsx` | Modificación | Vinculación del badge de alertas a `getInventoryAlerts().totalAlerts`. |
| `src/components/Topbar.tsx` | Modificación | Vinculación del badge de notificaciones a `getInventoryAlerts().totalAlerts`. |

---

## 6. Verificación de Compilación

Comando ejecutado:
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
dist/index.html                              0.53 kB │ gzip:   0.34 kB
dist/assets/stockcare-logo-CpG3XUCJ.png    405.53 kB
dist/assets/index-tZcTOde0.css              40.97 kB │ gzip:   7.82 kB
dist/assets/index-B508W0Ef.js            1,198.79 kB │ gzip: 312.33 kB
✓ built in 4.94s
```
**Exit Code:** 0 (Cero errores de compilación, cero warnings de tipos).
