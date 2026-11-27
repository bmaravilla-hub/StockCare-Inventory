# 27_BLINDAJE_INTEGRIDAD_ENTRADAS_FIRESTORE.md

## StockCare — Sistema de Control de Inventario para Farmacia
**Etapa 4B — Blindaje de Integridad de Entradas, Lotes y Security Rules**  
**Fecha:** 26 de Noviembre de 2026  
**Rama:** `main`  
**Estado del Build:** EXIT CODE 0 (`npm run build` / TypeScript + Vite)

---

## 1. Problemas Encontrados y Diagnóstico de Riesgos

Tras la implementación funcional inicial de la Etapa 4, la auditoría de concurrencia y seguridad identificó los siguientes riesgos críticos:

### 1.1 Condición de Carrera en Unicidad de Facturas (TOCTOU)
- **Problema:** La comprobación de duplicidad (`checkEntryDocumentExists`) se ejecutaba mediante una consulta (`getDocs`) **antes** de abrir `runTransaction`.
- **Riesgo:** Si dos operadores o dos pestañas registraban simultáneamente la misma factura para el mismo proveedor (ej. Proveedor A, Factura `FAC-001`), ambas pasaban la verificación previa y generaban dos documentos independientes en `entries`, duplicando el registro y el stock.

### 1.2 Condición de Carrera en Unicidad de Lotes Físicos
- **Problema:** La búsqueda de lotes existentes (`findExistingBatch`) se realizaba antes de la transacción porque el Web SDK de Firestore (`runTransaction`) no permite ejecutar consultas (`Query`), únicamente lecturas por referencia directa (`DocumentReference`).
- **Riesgo:** Si dos clientes recibían mercadería del mismo lote nuevo concurrentemente, ninguno encontraba el lote en la query previa y ambos creaban un documento separado en `batches`, fragmentando la existencia del mismo lote físico en múltiples documentos.

### 1.3 Permisividad en Security Rules de Firestore
- **Problema:** Las reglas confiaban únicamente en `isAuthenticated()` (`request.auth != null`) sin validar si el usuario poseía un perfil con `status == 'Activo'` ni restringir operaciones de inventario al rol correspondiente (`BODEGA`).
- **Riesgo:** Un usuario desactivado por administración o un usuario con rol `ADMIN` (que en la arquitectura de StockCare no debe alterar inventario físico desde la UI) podía invocar escrituras directas sobre `products`, `entries` o `batches`.

### 1.4 Vulnerabilidad de Modificación Arbitraria de `currentStock`
- **Problema:** En `products/{productId}`, `allow update` permitía modificar `currentStock` siempre que fuera un entero $\ge 0$, permitiendo potencialmente que un cliente alterara directamente las existencias de un producto sin una transacción de inventario.

---

## 2. Soluciones Implementadas

### 2.1 Eliminación de la Condición de Carrera en Facturas (`entryKeys`)
Se implementó un patrón de **reserva atómica determinística** mediante la colección `entryKeys`:
- Clave de documento: `entryKeys/{supplierId}__{normalizedDocumentNumber}`
- Operación dentro de `runTransaction`:
  1. **Lectura atómica:** `tx.get(reservationRef)`. Si existe, la transacción aborta de inmediato con error descriptivo.
  2. **Escritura atómica:** `tx.set(reservationRef, { entryId, supplierId, documentNumber, createdAt, createdBy })`.
- **Efecto de concurrencia:** Firestore bloquea optimistamente el documento `reservationRef`. Si dos clientes compiten, uno de ellos aborta en la primera fase y, en el reintento automático de Firestore, detecta la reserva existente y es rechazado.

### 2.2 Unicidad Determinística de Lotes Físicos (`batches`)
Se eliminó la dependencia de consultas previas mediante **IDs determinísticos de lote**:
- ID de documento: `batches/batch_{productId}__{normalizedBatchNumber}__{expiryDate}`
- Operación dentro de `runTransaction`:
  1. Se calcula la referencia directa `batchRef = doc(db, 'batches', deterministicId)`.
  2. **Lectura atómica:** `tx.get(batchRef)`.
  3. **Escritura atómica:** Si el lote ya existe en Firestore, `tx.update(batchRef, ...)` incrementa acumulativamente `initialQuantity` y `quantity`. Si no existe, `tx.set(batchRef, ...)` lo crea con `initialQuantity == quantity`.
- **Efecto de concurrencia:** Al compartir la misma `DocumentReference`, la concurrencia optimista de Firestore serializa los accesos. El segundo cliente reintenta y acumula sobre el lote creado por el primero, garantizando **un único lote lógico por lote físico**.

### 2.3 Normalización de Claves Determinísticas
Se implementó la función `normalizeUniqueKey`:
- Remueve espacios al inicio y final (`trim()`).
- Convierte a mayúsculas (`toUpperCase()`).
- Reemplaza caracteres no alfanuméricos por guiones bajos para garantizar compatibilidad con IDs de Firestore.
- La forma visual original (como fue digitada por el usuario) se preserva en los documentos visibles de `entries` y `batches`.

### 2.4 Blindaje Integral de Security Rules
Se definieron funciones helper jerárquicas:
- `isAuthenticated()`: `request.auth != null`.
- `userDocExists()`: Valida la existencia del documento del usuario en `users/{uid}`.
- `getUserData()`: Extrae los datos del perfil del usuario.
- `isActiveUser()`: Requiere `isAuthenticated()` y `status == 'Activo'`.
- `hasRole(role)`: Requiere `isActiveUser()` y coincidencia exacta del rol.
- `isBodega()`: `hasRole('BODEGA')`.
- `isAdmin()`: `hasRole('ADMIN')`.

---

## 3. Estrategia de Unicidad y Concurrencia

| Entidad | Clave / ID Determinístico | Resolución de Concurrencia |
| :--- | :--- | :--- |
| **Entrada (Factura por Proveedor)** | `entryKeys/{supplierId}__{normalizedDoc}` | `tx.get(reservationRef)` dentro de `runTransaction`. Si colisiona, el segundo cliente es rechazado. |
| **Lote Físico** | `batches/batch_{productId}__{normalizedBatch}__{expiryDate}` | `tx.get(batchRef)` dentro de `runTransaction`. Si colisiona, el segundo cliente acumula existencias atómicamente. |
| **Producto Distinto, Mismo Lote** | Clave incluye `{productId}`, produciendo IDs independientes. | Permitido sin interferencia. |
| **Proveedor Distinto, Misma Factura** | Clave incluye `{supplierId}`, produciendo IDs independientes. | Permitido sin interferencia. |

---

## 4. Cambios en Security Rules de Cloud Firestore

### Matriz de Acceso y Operaciones
| Colección | Lectura | Creación | Actualización | Eliminación |
| :--- | :--- | :--- | :--- | :--- |
| `users/{userId}` | Dueño o `isAdmin()` | Dueño (`BODEGA`, `Activo`) | Dueño (inmutabilidad de rol/status) | Prohibido (`false`) |
| `products/{productId}` | `isActiveUser()` | `isBodega()` (saldo 0) | `isBodega()` (Caso 1 o Caso 2) | Prohibido (`false`) |
| `suppliers/{supplierId}` | `isActiveUser()` | `isBodega()` | `isBodega()` | Prohibido (`false`) |
| `entryKeys/{key}` | `isActiveUser()` | `isBodega()` | Prohibido (`false`) | Prohibido (`false`) |
| `entries/{entryId}` | `isActiveUser()` | `isBodega()` | Prohibido (`false`) | Prohibido (`false`) |
| `batches/{batchId}` | `isActiveUser()` | `isBodega()` ($q_{ini} = q > 0$) | `isBodega()` ($q \le q_{ini}$) | Prohibido (`false`) |
| `movements/{movementId}` | `isActiveUser()` | `isBodega()` | Prohibido (`false`) | Prohibido (`false`) |
| `settings/{docId}` | `isActiveUser()` | `isAdmin()` | `isAdmin()` | Prohibido (`false`) |

### Blindaje de `products.currentStock`
En `products/{productId}`, `allow update` restringe las modificaciones a dos únicos escenarios válidos:
1. **Edición de datos de catálogo (BODEGA):**
   `request.resource.data.currentStock == resource.data.currentStock`  
   El stock es **estrictamente inmutable** cuando se edita nombre, categoría, presentación, stock mínimo o estado.
2. **Actualización de existencias por operación de inventario (BODEGA):**
   Todos los metadatos de catálogo (`code`, `name`, `category`, `presentation`, `minStock`, `status`, `createdAt`, `createdBy`) permanecen **estrictamente congelados** (`== resource.data.<field>`). Únicamente se permite modificar `currentStock` (entero $\ge 0$) junto con la auditoría `updatedBy == request.auth.uid`.

---

## 5. Limitaciones Reales de Firestore Security Rules (Transparencia Técnica)

> [!IMPORTANT]
> **Límite de Evaluación Aislada en Firestore Rules:**  
> Las Security Rules de Firestore evalúan cada documento de forma **individual y aislada**. Las reglas no tienen acceso al contexto global del lote transaccional ni a los demás documentos escritos en el mismo `runTransaction()` (por ejemplo, una regla en `products` no puede verificar directamente si en la misma transacción se incluyó un documento `entries` cuya suma de cantidades coincide matemáticamente con `request.resource.data.currentStock - resource.data.currentStock`).

### Mitigación y Garantías del Sistema:
1. **Blindaje de Rol y Estado:** Ningún usuario anónimo, inactivo o con rol no autorizado puede actualizar `currentStock`.
2. **Congelamiento de Metadatos:** Es imposible alterar metadatos del producto mientras se actualiza el stock, y es imposible alterar el stock mientras se edita el producto.
3. **Inmutabilidad de Kardex y Entradas:** Toda entrada genera un documento inmutable en `entries` y un movimiento append-only en `movements`.
4. **Reserva Determinística:** La atomicidad cliente-servidor mediante `runTransaction` garantiza consistencia total de concurrencia.
5. **Evolución Futura:** Para una validación matemática de delta de stock de "cero confianza en el cliente" (Zero-Trust Client), se requeriría ejecutar la lógica de inventario en Cloud Functions para Firebase o backend en NodeJS/Python. En el modelo actual de cliente directo de Firestore con Security Rules, la solución implementada proporciona el nivel máximo de protección alcanzable de forma nativa.

---

## 6. Pruebas de QA Funcionales Realizadas

| Código | Escenario Evaluado | Comportamiento Esperado | Resultado |
| :--- | :--- | :--- | :---: |
| **QA-4B-01** | Usuario inactivo intenta leer colección protegida. | `isActiveUser()` deniega el acceso a nivel de reglas de seguridad. | **Aprobado** |
| **QA-4B-02** | `ADMIN` intenta registrar entrada o alterar inventario. | `isBodega()` deniega la operación de escritura. | **Aprobado** |
| **QA-4B-03** | Cliente intenta modificar `currentStock` directamente alterando metadatos. | Reglas de `products` rechazan la actualización al no cumplir ni Caso 1 ni Caso 2. | **Aprobado** |
| **QA-4B-04** | Dos clientes registran simultáneamente la misma factura y proveedor. | Reserva `entryKeys` serializa la transacción: solo 1 entrada creada, el segundo recibe error de duplicado. | **Aprobado** |
| **QA-4B-05** | Dos clientes registran simultáneamente el mismo lote nuevo. | Clave determinística `batches` serializa el acceso: un solo batch creado con existencia acumulada. | **Aprobado** |
| **QA-4B-06** | Mismo número de factura para proveedores diferentes. | Claves de reserva distintas (`supA__FAC-001` vs `supB__FAC-001`). Ambos registros permitidos. | **Aprobado** |
| **QA-4B-07** | Mismo `batchNumber` para productos diferentes. | IDs determinísticos distintos (`batch_prodA__L1` vs `batch_prodB__L1`). Ambos lotes permitidos. | **Aprobado** |
| **QA-4B-08** | Intento de `update` sobre documento en `movements`. | `allow update: if false;` bloquea la mutación. | **Aprobado** |
| **QA-4B-09** | Intento de `delete` sobre documento en `movements`. | `allow delete: if false;` bloquea el borrado. | **Aprobado** |

---

## 7. Estado del Build

- **Comando:** `npm run build` (`tsc -b && vite build`)
- **Resultado:** **EXIT CODE 0**
- **Módulos transformados:** 1707 módulos sin errores de tipado ni fallos de bundling.
