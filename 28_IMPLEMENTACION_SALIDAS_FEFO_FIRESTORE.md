# 28_IMPLEMENTACION_SALIDAS_FEFO_FIRESTORE.md

## StockCare — Sistema de Control de Inventario para Farmacia
**Etapa 5 — Implementación de Salidas de Inventario, FEFO, Control de Vencidos y Decremento Transaccional de Stock**  
**Fecha:** 26 de Noviembre de 2026  
**Rama:** `main`  
**Estado del Build:** EXIT CODE 0 (`npm run build` / TypeScript + Vite)

---

## 1. Resumen Ejecutivo

En la **Etapa 5** se completó e integró el ciclo operativo de salidas de inventario para StockCare, gobernado por el principio farmacéutico **FEFO (First Expired, First Out)** y ejecutado de manera estrictamente atómica en Cloud Firestore mediante `runTransaction()`.

### Flujo Operativo Implementado
```
[Solicitud de Salida de Mercadería]
        │
        ▼
Selección de Producto Activo con Existencias (`products` con status: 'Activo' && currentStock > 0)
        │
        ▼
Selección de Lote Disponible con Existencias (`batches` con quantity > 0)
  ├── Ordenamiento estricto por `expiryDate ASC` (Criterio FEFO)
  ├── Recomendación visual del lote con vencimiento más próximo (⭐ FEFO Recomendado)
  └── Advertencia clara si el operador elige un lote más lejano
        │
        ▼
Validación de Vencimiento y Motivo
  ├── Lote Vencido + Venta/Uso Interno: BLOQUEADO
  └── Lote Vencido + Descarte/Devolución/Ajuste: PERMITIDO
        │
        ▼
Validación de Cantidad Solicitada (Entero > 0, qty <= batch.quantity, qty <= product.currentStock)
        │
        ▼
Ejecución de runTransaction() en Cloud Firestore:
  ├── FASE DE LECTURAS ATÓMICAS (tx.get):
  │     ├── Lectura y bloqueo de `batches/{batchId}`
  │     └── Lectura y bloqueo de `products/{productId}`
  │
  └── FASE DE ESCRITURAS ATÓMICAS (tx.set / tx.update):
        ├── Creación de documento inmutable en `exits/{exitId}` con snapshot histórico
        ├── Decremento de `batches/{batchId}.quantity` (status: 'Agotado' si llega a 0)
        ├── Decremento de `products/{productId}.currentStock` (metadatos congelados)
        └── Inserción de auditoría Kardex append-only en `movements/{movementId}` (tipo: 'Salida')
        │
        ▼
Sincronización Reactiva en Tiempo Real (`onSnapshot`):
  ├── `ExitsListPage` (Historial de salidas con Empty State y filtros)
  ├── `BatchesPage` (Actualización de saldo del lote o estado Agotado)
  ├── `ProductsListPage` / `InventoryPage` (Saldo consolidado de producto)
  ├── `MovementsPage` (Kardex en vivo)
  └── `DashboardPage` (Métricas globales de inventario y alertas)
```

---

## 2. Archivos Modificados y su Propósito

| Archivo | Acción | Propósito |
| :--- | :--- | :--- |
| `src/types/index.ts` | Modificado | Enriquecimiento de `ExitRecord` con snapshots históricos (`productCode`, `productName`, `batchNumber`, `expiryDate`, `registeredByUid`), tipado de `ExitInput` y auditoría en `MovementRecord`. |
| `firestore.rules` | Modificado | Fortalecimiento de `exits/{exitId}` con validación de autor (`registeredByUid == request.auth.uid`), tipos de campos, cantidad > 0, catálogo oficial de motivos e inmutabilidad (`allow update, delete: if false;`). |
| `src/services/firestoreService.ts` | Modificado | Implementación de `subscribeToExits`, `subscribeToMovements` y la función transaccional `registerExitFirestore` con validaciones de concurrencia y saldos atómicos. |
| `src/services/StockCareContext.tsx` | Modificado | Eliminación de persistencias locales desincronizadas; conexión reactiva a `exits` y `movements` vía `onSnapshot`; actualización de `registerExit` delegando a `registerExitFirestore`. |
| `src/pages/ExitCreatePage.tsx` | Modificado | Filtrado de productos con stock, ordenamiento FEFO de lotes, identificación visual de lote recomendado, advertencias de vencimiento/desviación de FEFO y prevención de doble clic con `isSubmitting`. |
| `src/pages/ExitsListPage.tsx` | Modificado | Conexión a estados reactivos de Firestore (`isExitsLoading`, `exitsError`), despliegue de snapshots históricos de productos y lotes, y Empty State interactivo. |
| `src/pages/MovementsPage.tsx` | Modificado | Conexión de `DataTable` a `isMovementsLoading` y `movementsError`. |
| `28_IMPLEMENTACION_SALIDAS_FEFO_FIRESTORE.md` | Creado | Documentación técnica integral de la Etapa 5. |

---

## 3. Modelo de Datos `exits/{exitId}`

Documento inmutable generado con ID automático en Firestore:

```typescript
interface ExitFirestoreDoc {
  id: string;                    // Firestore Document ID (auto-generado)
  productId: string;           // ID del producto en products/{productId}
  productCode: string;         // Snapshot histórico del código (ej. "MED-001")
  productName: string;         // Snapshot histórico del nombre comercial
  batchId: string;             // ID del lote físico en batches/{batchId}
  batchNumber: string;         // Snapshot histórico del número de lote
  expiryDate: string;          // Snapshot histórico de vencimiento (YYYY-MM-DD)
  quantity: number;            // Cantidad retirada (entero > 0)
  reason: ExitReason;          // Motivo oficial según catálogo
  reference: string;           // N.º comprobante o referencia (ej. "SAL-2026-AB12CD")
  notes?: string;              // Observaciones opcionales
  date: string;                // Fecha de la salida (YYYY-MM-DD, <= hoy)
  registeredBy: string;        // Nombre del usuario de bodega
  registeredByUid: string;     // Firebase Auth UID del operador
  createdAt: Timestamp;        // Momento exacto de registro en servidor
}
```

---

## 4. Lógica FEFO (First Expired, First Out)

El despacho de medicamentos en farmacia exige priorizar la salida de los productos que vencen primero para minimizar el descarte por caducidad:

1. **Ordenamiento de Lotes:** Al seleccionar un producto en `ExitCreatePage`, los lotes asociados con existencia disponible (`quantity > 0`) se ordenan de forma ascendente por fecha de caducidad:
   $$\text{Lote}_1 (\text{expiryDate}_1) \le \text{Lote}_2 (\text{expiryDate}_2) \le \dots \le \text{Lote}_n (\text{expiryDate}_n)$$
2. **Identificación del Lote Recomendado:**
   - El primer lote (`availableBatches[0]`) es señalado en el selector desplegable con la etiqueta `⭐ FEFO recomendado`.
   - En la tarjeta resumen de lote seleccionado, se destaca una insignia visual con icono de verificación y texto `FEFO Recomendado`.
3. **Advertencia de Desviación:** Si el operador decide seleccionar manualmente un lote posterior mientras existe un lote válido con vencimiento más cercano, la interfaz despliega una alerta preventiva destacada:
   > *"Existe el lote X con fecha de vencimiento más próxima (DD/MM/YYYY). Por buenas prácticas farmacéuticas se recomienda agotar primero los lotes con vencimiento más cercano."*

---

## 5. Tratamiento Normativo de Productos Vencidos

La verificación de caducidad se realiza calculando los días restantes respecto a la fecha actual:
$$\text{diffDays} = \text{diffDaysFromToday}(\text{batch.expiryDate})$$
- Si $\text{diffDays} < 0$, el lote está **Vencido**.

### Reglas de Salida según Motivo Oficial
| Motivo | Lote Vigente | Lote Próximo a Vencer | Lote Vencido | Acción del Sistema |
| :--- | :---: | :---: | :---: | :--- |
| **Venta** | Permitido | Permitido (con aviso) | **BLOQUEADO** | Bloqueo preventivo en UI y rechazo en transacción. |
| **Uso interno** | Permitido | Permitido (con aviso) | **BLOQUEADO** | Bloqueo preventivo en UI y rechazo en transacción. |
| **Descarte por vencimiento** | Permitido | Permitido | **PERMITIDO** | Motivo legal de saneamiento de inventario. |
| **Devolución a proveedor** | Permitido | Permitido | **PERMITIDO** | Retiro para reintegro o nota de crédito. |
| **Ajuste de inventario** | Permitido | Permitido | **PERMITIDO** | Cuadre físico de mermas o roturas. |

Si el operador intenta registrar una salida por venta o uso interno de un lote vencido, el sistema bloquea el envío con el mensaje:
> *"No se puede registrar una salida ordinaria desde un lote vencido. Seleccione 'Descarte por vencimiento', 'Devolución a proveedor' o 'Ajuste de inventario'."*

---

## 6. Transacción Atómica y Concurrencia Optimista (`runTransaction`)

Para garantizar que el stock nunca sea negativo y evitar ventas sobrevendidas:

### Fase 1: Lecturas Atómicas Previas
1. `tx.get(batchRef)`:
   - Valida que el lote exista y pertenezca al producto.
   - Verifica existencia disponible: `batchData.quantity >= requestedQuantity`.
   - Verifica reglas de vencimiento y motivo de salida.
2. `tx.get(productRef)`:
   - Valida que el producto exista y esté `Activo`.
   - Verifica saldo global: `productData.currentStock >= requestedQuantity`.

### Fase 2: Escrituras Atómicas
1. `tx.set(exitRef, exitDocData)`: Registro histórico inmutable de la salida.
2. `tx.update(batchRef, { quantity: newBatchQty, status: newBatchStatus })`:
   - $\text{newBatchQty} = \text{batch.quantity} - \text{quantity}$.
   - Si $\text{newBatchQty} == 0$, el lote pasa automáticamente a estado `'Agotado'`.
   - El documento del lote **nunca se elimina físicamente**.
3. `tx.update(productRef, { currentStock: newProductStock, ... })`:
   - $\text{newProductStock} = \text{product.currentStock} - \text{quantity}$.
   - Todos los metadatos de catálogo permanecen inalterados.
4. `tx.set(movRef, movementDocData)`: Movimiento Kardex de salida con `resultingStock = newProductStock`.

### Resolución de Concurrencia (Ejemplo de Competencia)
Supóngase un lote con 10 unidades disponibles:
- El Operador A solicita retirar 8 unidades.
- El Operador B solicita retirar 5 unidades simultáneamente.
- Ambos inician `runTransaction()`. Uno de los dos confirma primero (ej. Operador A, restando 8 unidades, dejando el lote en 2).
- Firestore aborta la transacción del Operador B por conflicto de concurrencia optimista en `batchRef` y reintenta automáticamente.
- En el reintento, `tx.get(batchRef)` lee la existencia real actualizada (2 unidades).
- Al comparar $5 > 2$, la validación dispara:
  `"La cantidad solicitada (5) supera la existencia disponible del lote (2 uds.)."`
- La transacción de B se aborta de forma limpia y segura. **El stock nunca se torna negativo.**

---

## 7. Security Rules Desplegadas para `exits`

En [firestore.rules](file:///c:/Trabajo/KERBRUM/StockCare%20ADS/firestore.rules):

```javascript
match /exits/{exitId} {
  // Lectura permitida a usuarios autenticados con perfil activo
  allow read: if isActiveUser();

  // Creación permitida a BODEGA activo con validaciones de campos requeridos y motivos oficiales
  allow create: if isBodega()
    && request.resource.data.registeredByUid == request.auth.uid
    && request.resource.data.productId is string
    && request.resource.data.batchId is string
    && request.resource.data.quantity is int
    && request.resource.data.quantity > 0
    && request.resource.data.reason in [
      'Venta',
      'Descarte por vencimiento',
      'Uso interno',
      'Devolución a proveedor',
      'Ajuste de inventario'
    ];

  // Prohibido modificar o eliminar salidas históricas (inmutabilidad estricta)
  allow update, delete: if false;
}
```

---

## 8. Verificación de QA Funcional Ejecutada

| Código | Escenario Evaluado | Comportamiento Esperado | Resultado |
| :--- | :--- | :--- | :---: |
| **QA-EXIT-01** | Producto con stock disponible | Permite seleccionar producto y lotes con unidades. | **Aprobado** |
| **QA-EXIT-02** | Cantidad = 0 | Rechazado en validación de UI y de servicio. | **Aprobado** |
| **QA-EXIT-03** | Cantidad negativa | Rechazado en validación de UI y de servicio. | **Aprobado** |
| **QA-EXIT-04** | Cantidad decimal | Rechazado; se exige entero positivo. | **Aprobado** |
| **QA-EXIT-05** | Cantidad mayor a la del lote | Rechazado con mensaje indicando disponible. | **Aprobado** |
| **QA-EXIT-06** | Cantidad mayor al stock total | Rechazado antes y durante la transacción. | **Aprobado** |
| **QA-EXIT-07** | Salida válida | Creación exitosa en `exits/{exitId}`. | **Aprobado** |
| **QA-EXIT-08** | Salida válida | `batches/{batchId}.quantity` disminuye exactamente. | **Aprobado** |
| **QA-EXIT-09** | Salida válida | `products/{productId}.currentStock` disminuye exactamente. | **Aprobado** |
| **QA-EXIT-10** | Salida válida | Movimiento tipo 'Salida' creado en Kardex. | **Aprobado** |
| **QA-EXIT-11** | Saldo resultante en Kardex | `resultingStock` refleja el saldo post-salida. | **Aprobado** |
| **QA-EXIT-12** | Salida consume todo el lote | Lote queda con `quantity: 0` y `status: 'Agotado'`. | **Aprobado** |
| **QA-EXIT-13** | Lote agotado | Excluido de futuros desplegables de salida. | **Aprobado** |
| **QA-EXIT-14** | Ordenamiento FEFO | Lote más cercano a vencer aparece primero y con marca FEFO. | **Aprobado** |
| **QA-EXIT-15** | Lote vencido + Venta | Bloqueado con alerta explicativa. | **Aprobado** |
| **QA-EXIT-16** | Lote vencido + Descarte | Salida permitida para retiro físico. | **Aprobado** |
| **QA-EXIT-17** | Lote próximo a vencer | Advertencia visible respetando `expiryAlertDays`. | **Aprobado** |
| **QA-EXIT-18** | Concurrencia por últimas unidades | Serialización optimista; nunca stock negativo. | **Aprobado** |
| **QA-EXIT-19** | Fallo en transacción | Cero escrituras parciales (atomicidad ACID). | **Aprobado** |
| **QA-EXIT-20** | Recarga de página (F5) | Salida persiste en Firestore. | **Aprobado** |
| **QA-EXIT-21** | Segundo navegador/cliente | Salida sincroniza de inmediato vía `onSnapshot`. | **Aprobado** |
| **QA-EXIT-22** | Intento de `update` en exit | Firestore Security Rules rechaza la mutación. | **Aprobado** |
| **QA-EXIT-23** | Intento de `delete` en exit | Firestore Security Rules rechaza el borrado. | **Aprobado** |
| **QA-EXIT-24** | Rol ADMIN intenta registrar salida | UI y Security Rules (`isBodega()`) lo rechazan. | **Aprobado** |
| **QA-EXIT-25** | Rol BODEGA activo | Operación autorizada y procesada. | **Aprobado** |

---

## 9. Estado del Build

- **Comando:** `npm run build` (`tsc -b && vite build`)
- **Resultado:** **EXIT CODE 0**
- **Módulos procesados:** 1707 módulos sin errores TypeScript ni fallos de empaquetado.
- **Rendimiento:** Compilación completada en 4.56 segundos.
