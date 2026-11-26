# 17 — MODELO DE DATOS Y COLECCIONES PROPUESTO EN CLOUD FIRESTORE

**Proyecto:** StockCare — Sistema de Gestión y Control de Inventario para Farmacia  
**Materia:** Análisis y Diseño de Sistemas (ADS) — Universidad Don Bosco  
**Fecha de Auditoría:** 26 de Noviembre de 2026  
**Criterio de Diseño:** Basado estrictamente en los requerimientos funcionales (RF-01 a RF-10), el DFD de segundo nivel y el código real auditado.

---

## 1. Decisión Arquitectónica: `entries` / `exits` vs. `movements`

### Evaluación de Alternativas
- **Opción A (Colecciones Independientes para Documentos + Kardex Unificado):**
  - Mantener colecciones dedicadas para `entries` (recepciones maestro-detalle por factura/proveedor), `exits` (comprobantes de salida por motivo) y `movements` (kardex atómico por producto/lote con saldo resultante).
- **Opción B (Todo en una Única Colección `movements` con discriminador `type`):**
  - Aplanar toda operación en un único documento de movimiento.

### Justificación de la Decisión: **OPCIÓN A (Híbrida / Complementaria)**
1. **Estructura Maestro-Detalle de las Entradas:** Una recepción de mercadería (RF-02, DFD 1.1–1.5) es un documento comercial compuesto que involucra una factura física (`documentNumber`), un proveedor (`provider`) y **múltiples líneas de productos recibidos** (`items: EntryItem[]`). Aplanar una factura de 10 productos en 10 registros de movimientos pierde la identidad del comprobante fiscal de recepción y dificulta la emisión del comprobante imprimible (`EntryReceiptModal`).
2. **Naturaleza del Kardex:** El kardex (`movements`) requiere granularidad producto por producto para calcular el stock resultante cronológico (`resultingStock`). Una entrada de 5 productos genera **1 documento de entrada** y **5 registros atómicos de movimiento**.
3. **Compatibilidad:** El código existente de StockCare (`EntriesListPage`, `ExitsListPage`, `MovementsPage`, `ReportsPage`) ya opera con este modelo con absoluta solidez.

---

## 2. Especificación Detallada de Colecciones Firestore

### Colección 1: `users`
- **Ruta:** `/users/{userId}` (donde `userId` es el UID generado por Firebase Authentication).
- **Responsabilidad:** Perfil institucional del usuario, sucursal y rol en farmacia.
- **Campos:**
  - `uid`: `string` (Obligatorio, inmutable, coincide con Auth UID).
  - `email`: `string` (Obligatorio, correo institucional).
  - `fullName`: `string` (Obligatorio, nombre completo del profesional).
  - `role`: `string` (Obligatorio, `'ADMIN' | 'BODEGA'`).
  - `roleLabel`: `string` (Obligatorio, etiqueta descriptiva).
  - `branch`: `string` (Obligatorio, sucursal asignada).
  - `status`: `string` (Obligatorio, `'Activo' | 'Inactivo'`, default: `'Activo'`).
  - `createdAt`: `timestamp` (Fecha de registro en la plataforma).
  - `lastLogin`: `timestamp` (Última sesión registrada).
- **Índices requeridos:**
  - Simple: `email` (asc), `role` (asc).

---

### Colección 2: `products`
- **Ruta:** `/products/{productId}`
- **Responsabilidad:** Catálogo maestro de medicamentos e insumos médicos (RF-01).
- **Campos:**
  - `id`: `string` (Obligatorio, ID del documento).
  - `code`: `string` (Obligatorio, código alfanumérico único, ej. `"MED-001"`).
  - `name`: `string` (Obligatorio, nombre comercial/genérico y concentración).
  - `category`: `string` (Obligatorio, categoría terapéutica).
  - `presentation`: `string` (Obligatorio, forma farmacéutica y empaque).
  - `minStock`: `number` (Obligatorio, entero `>= 0`, umbral de alerta).
  - `currentStock`: `number` (Obligatorio, entero `>= 0`, stock físico acumulado en tiempo real).
  - `status`: `string` (Obligatorio, `'Activo' | 'Inactivo'`).
  - `description`: `string` (Opcional, indicaciones o precauciones).
  - `createdAt`: `timestamp` (Fecha de creación).
  - `updatedAt`: `timestamp` (Fecha de última modificación).
  - `createdBy`: `string` (UID del usuario que registró el producto).
- **Índices requeridos:**
  - Compuesto: `status` (asc) + `category` (asc) + `name` (asc).
  - Compuesto: `status` (asc) + `currentStock` (asc).

---

### Colección 3: `suppliers`
- **Ruta:** `/suppliers/{supplierId}`
- **Responsabilidad:** Maestro de empresas proveedoras y droguerías autorizadas.
- **Campos:**
  - `id`: `string` (Obligatorio).
  - `name`: `string` (Obligatorio, razón social de la droguería/laboratorio).
  - `nrc`: `string` (Opcional, número de registro de contribuyente).
  - `nit`: `string` (Opcional, número de identificación tributaria).
  - `contactPerson`: `string` (Opcional, nombre del asesor comercial).
  - `phone`: `string` (Obligatorio, teléfono de contacto).
  - `email`: `string` (Opcional, correo para pedidos).
  - `status`: `string` (Obligatorio, `'Activo' | 'Inactivo'`).
  - `createdAt`: `timestamp`.
  - `updatedAt`: `timestamp`.
  - `createdBy`: `string` (UID).
- **Índices requeridos:**
  - Simple: `name` (asc), `status` (asc).

---

### Colección 4: `batches`
- **Ruta:** `/batches/{batchId}`
- **Responsabilidad:** Lotes físicos asociados a productos con existencias y vencimientos (RF-05, RF-06).
- **Campos:**
  - `id`: `string` (Obligatorio).
  - `productId`: `string` (Obligatorio, referencia al documento en `products`).
  - `productCode`: `string` (Obligatorio, redundancia para consultas rápidas).
  - `productName`: `string` (Obligatorio, redundancia de catálogo).
  - `batchNumber`: `string` (Obligatorio, código de lote impreso por laboratorio).
  - `quantity`: `number` (Obligatorio, existencia remanente `>= 0`).
  - `initialQuantity`: `number` (Obligatorio, unidades recibidas originalmente).
  - `expiryDate`: `string` (Obligatorio, formato ISO `"YYYY-MM-DD"`).
  - `entryId`: `string` (Obligatorio, referencia al documento en `entries`).
  - `createdAt`: `timestamp`.
  - `updatedAt`: `timestamp`.
- **Índices requeridos:**
  - Compuesto: `productId` (asc) + `quantity` (asc) + `expiryDate` (asc) (Para selección FEFO).
  - Compuesto: `quantity` (asc) + `expiryDate` (asc) (Para alertas de vencimientos de lotes activos).

---

### Colección 5: `entries`
- **Ruta:** `/entries/{entryId}`
- **Responsabilidad:** Constancia fiscal y operativa de recepción de mercadería (RF-02, DFD 1.1–1.5).
- **Campos:**
  - `id`: `string` (Obligatorio).
  - `documentNumber`: `string` (Obligatorio, número de factura del proveedor en mayúsculas).
  - `providerId`: `string` (Opcional / Referencia a `suppliers`).
  - `provider`: `string` (Obligatorio, nombre de la droguería).
  - `date`: `string` (Obligatorio, fecha de factura `"YYYY-MM-DD"`).
  - `totalUnits`: `number` (Obligatorio, suma total de unidades recibidas).
  - `items`: `array` (Obligatorio, lista de objetos `EntryItem`):
    - `productId`: `string`
    - `productCode`: `string`
    - `productName`: `string`
    - `batchNumber`: `string`
    - `expiryDate`: `string`
    - `quantity`: `number`
  - `notes`: `string` (Opcional).
  - `registeredBy`: `string` (Nombre del responsable).
  - `registeredById`: `string` (UID del usuario).
  - `createdAt`: `timestamp`.
- **Índices requeridos:**
  - Compuesto: `date` (desc) + `createdAt` (desc).
  - Simple: `documentNumber` (asc).

---

### Colección 6: `exits`
- **Ruta:** `/exits/{exitId}`
- **Responsabilidad:** Comprobante de despacho y retiro de unidades (RF-04).
- **Campos:**
  - `id`: `string` (Obligatorio).
  - `reference`: `string` (Obligatorio, código de salida, ej. `"VTA-2026-1041"`).
  - `productId`: `string` (Obligatorio).
  - `batchId`: `string` (Obligatorio).
  - `batchNumber`: `string` (Obligatorio).
  - `quantity`: `number` (Obligatorio, entero `> 0`).
  - `reason`: `string` (Obligatorio, `'Venta' | 'Descarte por vencimiento' | 'Uso interno' | 'Devolución a proveedor' | 'Ajuste de inventario'`).
  - `date`: `string` (Obligatorio, `"YYYY-MM-DD"`).
  - `notes`: `string` (Opcional).
  - `registeredBy`: `string` (Nombre del usuario).
  - `registeredById`: `string` (UID del usuario).
  - `createdAt`: `timestamp`.
- **Índices requeridos:**
  - Compuesto: `date` (desc) + `reason` (asc).
  - Simple: `productId` (asc).

---

### Colección 7: `movements`
- **Ruta:** `/movements/{movementId}`
- **Responsabilidad:** Kardex unificado cronológico e inmutable de entradas y salidas (RF-09).
- **Campos:**
  - `id`: `string` (Obligatorio).
  - `date`: `string` (Obligatorio, `"YYYY-MM-DD"`).
  - `createdAt`: `timestamp` (Obligatorio, fecha/hora exacta de auditoría).
  - `productId`: `string` (Obligatorio).
  - `productCode`: `string` (Obligatorio).
  - `productName`: `string` (Obligatorio).
  - `batchNumber`: `string` (Obligatorio).
  - `type`: `string` (Obligatorio, `'Entrada' | 'Salida'`).
  - `quantity`: `number` (Obligatorio, entero `> 0`).
  - `user`: `string` (Obligatorio, nombre del operador).
  - `userId`: `string` (Obligatorio, UID del operador).
  - `reference`: `string` (Obligatorio, número de factura o vale de salida).
  - `detail`: `string` (Obligatorio, motivo o proveedor).
  - `resultingStock`: `number` (Obligatorio, saldo físico resultante del producto).
- **Índices requeridos:**
  - Compuesto: `productId` (asc) + `date` (desc).
  - Compuesto: `type` (asc) + `date` (desc).
  - Compuesto: `date` (desc) + `createdAt` (desc).

---

### Colección 8: `settings` (Documento singleton: `system`)
- **Ruta:** `/settings/system`
- **Responsabilidad:** Datos institucionales de la farmacia y parámetros globales.
- **Campos:**
  - `pharmacyName`: `string`
  - `branchName`: `string`
  - `branchAddress`: `string`
  - `phone`: `string`
  - `expiryAlertDays`: `number` (Obligatorio, `30 | 60 | 90`)
  - `updatedAt`: `timestamp`
  - `updatedBy`: `string` (UID del Administrador)
