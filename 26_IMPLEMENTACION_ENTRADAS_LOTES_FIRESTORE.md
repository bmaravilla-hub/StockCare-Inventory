# 26_IMPLEMENTACION_ENTRADAS_LOTES_FIRESTORE.md

## StockCare — Sistema de Control de Inventario para Farmacia
**Fase III — Módulo de Entradas de Inventario, Lotes y Actualización Atómica de Stock**  
**Fecha:** 26 de Noviembre de 2026  
**Rama:** `main`  
**Estado del Build:** EXIT CODE 0 (`npm run build` / TypeScript + Vite)

---

## 1. Resumen Ejecutivo

En la **Etapa 4** se implementó el flujo transaccional completo de recepción de mercadería para StockCare, conectando la interfaz de usuario con Cloud Firestore mediante `runTransaction()`.

### Flujo Implementado
```
[Recepción de Mercadería]
        │
        ▼
Selección de Proveedor Activo (`suppliers` con status: 'Activo')
        │
        ▼
Selección de Productos Activos (`products` con status: 'Activo')
        │
        ▼
Definición de Lotes (Número de Lote, Cantidad > 0, Vencimiento >= Hoy)
        │
        ▼
Validación de Documento Duplicado (`documentNumber` + `supplierId`)
        │
        ▼
Ejecución de runTransaction() en Firestore:
  ├── Lectura atómica de existencias y lotes candidatos
  ├── Creación de documento histórico en `entries/{entryId}`
  ├── Creación o acumulación de existencias en `batches/{batchId}`
  ├── Incremento atómico de `currentStock` en `products/{productId}`
  └── Registro de auditoría Kardex en `movements/{movementId}`
        │
        ▼
Sincronización en Tiempo Real (`onSnapshot`) a:
  ├── Historial de Entradas (`EntriesListPage`)
  ├── Control de Lotes y Vencimientos (`BatchesPage`)
  ├── Catálogo de Productos (`ProductsListPage`)
  └── Dashboard y Métricas de Inventario (`DashboardPage`)
```

---

## 2. Archivos Modificados y Propósito

| Archivo | Acción | Propósito |
| :--- | :--- | :--- |
| `src/types/index.ts` | Modificado | Enriquecimiento de `Batch` (`supplierId`, `status`, `updatedAt`, `createdBy`), `EntryItem` (`productCode`, `productName`), `EntryRecord` (`supplierId`, `supplierName`, `registeredByUid`), y `EntryInput`. |
| `firestore.rules` | Modificado | Habilitación de mutación en `products/{productId}.currentStock` (entero >= 0) y creación de reglas de seguridad estrictas para `entries`, `batches` y `movements`. |
| `src/services/firestoreService.ts` | Modificado | Implementación de `checkEntryDocumentExists`, `findExistingBatch`, listeners reactivos `subscribeToEntries`, `subscribeToBatches`, y ejecución transaccional atómica en `registerEntryFirestore`. |
| `src/services/StockCareContext.tsx` | Modificado | Suscripciones reactivas condicionadas a la sesión activa (`entries`, `batches`), integración de `registerEntry` delegando a `registerEntryFirestore`, y provisión de estados de carga y error. |
| `src/pages/EntryCreatePage.tsx` | Reescrito | Filtrado estricto de proveedores y productos activos, validaciones de lote, bloqueo de doble clic asíncrono, y experiencia de usuario fluida con comprobante post-registro. |
| `src/pages/EntriesListPage.tsx` | Modificado | Soporte de estados reactivos (`isEntriesLoading`, `entriesError`), visualización de proveedor desde snapshot (`supplierName \|\| provider`), búsqueda ampliada y Empty State interactivo. |
| `src/pages/BatchesPage.tsx` | Modificado | Conexión a estados de carga/error del listener de lotes, soporte de Empty State real sin datos en memoria. |
| `src/features/entries/EntryReceiptModal.tsx` | Modificado | Despliegue de proveedor congelado en el snapshot y lectura de nombres/códigos congelados de productos. |

---

## 3. Modelo de Datos Firestore

### 3.1 Colección `entries/{entryId}`
Documento inmutable que representa el acta/factura de recepción de mercadería:
```typescript
interface EntryFirestoreDoc {
  documentNumber: string;        // N.º Factura o Comprobante (ej. "FAC-2026-001")
  supplierId: string;            // ID del proveedor en `suppliers`
  supplierName: string;          // Snapshot del nombre comercial del proveedor
  provider: string;              // Alias de compatibilidad retroactiva
  date: string;                  // Fecha del documento (YYYY-MM-DD, <= hoy)
  items: Array<{
    id: string;                  // Identificador del ítem en la entrada
    productId: string;           // ID del producto en `products`
    productCode: string;         // Snapshot del código del producto (ej. "MED-001")
    productName: string;         // Snapshot del nombre comercial del producto
    batchNumber: string;         // Identificador del lote
    expiryDate: string;          // Fecha de vencimiento (YYYY-MM-DD, >= hoy)
    quantity: number;            // Cantidad recibida (entero > 0)
  }>;
  notes?: string;                // Observaciones opcionales
  registeredBy: string;          // Nombre completo del usuario de bodega
  registeredByUid: string;       // UID en Firebase Auth
  createdAt: string;             // ISO 8601 del momento de registro
}
```

### 3.2 Colección `batches/{batchId}`
Representa cada lote físico disponible en almacén para control FEFO/FIFO:
```typescript
interface BatchFirestoreDoc {
  productId: string;             // ID del producto relacionado
  batchNumber: string;           // Número/código del lote impreso en caja
  expiryDate: string;            // Fecha de vencimiento (YYYY-MM-DD)
  quantity: number;              // Existencia disponible para salidas (entero >= 0)
  initialQuantity: number;       // Cantidad total recibida originalmente (entero > 0)
  supplierId?: string;           // Proveedor de origen
  entryId: string;               // ID de la entrada que lo originó
  status: 'Activo' | 'Agotado';  // Estado del lote
  createdAt: string;             // ISO 8601 de creación
  updatedAt: string;             // ISO 8601 de última actualización
  createdBy: string;             // UID del usuario que lo creó
}
```

### 3.3 Colección `movements/{movementId}`
Kardex de movimientos transaccionales de inventario:
```typescript
interface MovementFirestoreDoc {
  date: string;                  // Fecha del movimiento (YYYY-MM-DD)
  createdAt: string;             // ISO 8601
  productId: string;             // ID del producto afectado
  batchNumber: string;           // Lote afectado
  type: 'Entrada';               // Tipo de transacción
  quantity: number;              // Unidades que ingresaron
  user: string;                  // Nombre del operador
  reference: string;             // N.º Factura
  detail: string;                // Proveedor de procedencia
  resultingStock: number;        // Saldo resultante en inventario
}
```

---

## 4. Estrategia de Actualización Transaccional (`runTransaction`)

Para garantizar la coherencia absoluta de datos e integridad ACID:

1. **Fase de Validación Externa (Pre-transacción):**
   - Validación de formato y reglas de negocio en cliente (`documentNumber`, fecha no futura, cantidades > 0, fecha de vencimiento válida).
   - Verificación de no duplicidad de factura por proveedor mediante `checkEntryDocumentExists(documentNumber, supplierId)`.
   - Consulta previa de lotes candidatos con `findExistingBatch(productId, batchNumber, expiryDate)` para ubicar documentos de lote reutilizables.

2. **Fase de Lectura Atómica (Inside `tx`):**
   - Concurrencia optimista de Firestore exige que todas las lecturas (`tx.get`) ocurran antes de cualquier escritura.
   - Se leen de manera atómica todos los productos involucrados en la entrada (`products/{productId}`) para validar su estado activo y capturar su saldo actual `currentStock`.
   - Si se identificó un lote existente con igual tripleta `(productId, batchNumber, expiryDate)`, se lee con `tx.get(batchRef)` para capturar sus existencias actuales.

3. **Fase de Escritura Atómica (Inside `tx`):**
   - `tx.set(entryRef, ...)`: Creación del documento de entrada con snapshot histórico de nombres y códigos.
   - `tx.update(batchRef, ...)` o `tx.set(newBatchRef, ...)`: Si el lote existe, se incrementan `quantity` e `initialQuantity`; si no existe, se crea un nuevo documento con `quantity == initialQuantity`.
   - `tx.update(productRef, { currentStock: newStock, updatedAt: now })`: Incremento estricto del saldo del producto.
   - `tx.set(movementRef, ...)`: Registro del movimiento Kardex por cada ítem.

---

## 5. Security Rules de Cloud Firestore

Las reglas en `firestore.rules` fueron ajustadas para soportar la operación de entradas:
- **`products/{productId}`**: Se actualizó `allow update` para permitir la modificación de `currentStock` por parte de personal autenticado, validando que sea `int` y `>= 0`.
- **`entries/{entryId}`**: Permite `create` con validación de tipos, campos requeridos (`documentNumber`, `supplierId`, `items`, etc.), y prohíbe `update` y `delete` (`allow update, delete: if false;`).
- **`batches/{batchId}`**: Permite `create` con validación de tipos y `quantity == initialQuantity > 0`; permite `update` para variar `quantity` e `initialQuantity`; prohíbe `delete`.
- **`movements/{movementId}`**: Permite `create` para auditoría y prohíbe `update` y `delete`.

---

## 6. Verificación de QA Funcional

| Escenario | Resultado Esperado | Resultado Obtenido | Estado |
| :--- | :--- | :--- | :--- |
| Registro de entrada con proveedor activo | Creación en `entries`, `batches`, incremento en `products` y `movements`. | Transacción completada atómicamente. | APROBADO |
| Selección de proveedor inactivo | No debe aparecer en el dropdown ni permitirse su selección. | Dropdown filtra estrictamente `status === 'Activo'`. | APROBADO |
| Selección de producto inactivo | No debe aparecer en el dropdown de selección de producto. | Dropdown filtra estrictamente `status === 'Activo'`. | APROBADO |
| Factura duplicada para el mismo proveedor | Bloqueo previo a la transacción con mensaje descriptivo. | `checkEntryDocumentExists` detecta y bloquea la duplicidad. | APROBADO |
| Entrada con lote idéntico preexistente | Incremento acumulativo en el lote existente sin duplicar registros. | Localiza lote, suma cantidades en `tx.update`. | APROBADO |
| Prevención de doble clic en guardado | Deshabilitación de botones y spinner de carga durante la transacción. | `isSubmitting` bloquea botones en interfaz. | APROBADO |
| Reacción en tiempo real (`onSnapshot`) | Reflejo inmediato en lista de entradas, lotes, productos y dashboard. | Subscriptions sincronizan el estado instantáneamente. | APROBADO |
| Compilación TypeScript / Vite | Cero errores de tipos y empaquetado exitoso. | `tsc -b && vite build` finalizó en 4.98s con EXIT CODE 0. | APROBADO |

---

## 7. Próximos Pasos

- **Etapa 5 — Salidas de Inventario:**
  - Selección de producto y lote por método FEFO (primero en vencer, primero en salir).
  - Reducción transaccional atómica de existencias en `batches/{batchId}` y `products/{productId}`.
  - Bloqueo de salidas de lotes vencidos si el motivo es "Venta".
  - Registro de movimientos Kardex de salida.
