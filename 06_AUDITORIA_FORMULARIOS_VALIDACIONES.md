# 06 — AUDITORÍA DE FORMULARIOS Y VALIDACIONES DE STOCKCARE

**Proyecto:** StockCare — Sistema de Gestión y Control de Inventario para Farmacia  
**Materia:** Análisis y Diseño de Sistemas (ADS) — Universidad Don Bosco  
**Fecha de Auditoría:** 26 de Noviembre de 2026  
**Objetivo:** Auditar todos los formularios, campos, controles, eventos de envío (`onSubmit`), validaciones sincrónicas y asincrónicas, y manejo de errores.

---

## 1. Inventario Detallado de Formularios

### Formulario 01: Inicio de Sesión y Registro (`LoginPage.tsx`)
- **Ruta / Pantalla:** `/login` (`LoginPage.tsx`).
- **Campos:**
  - `emailOrUser`: Texto / Email (Login: usuario o correo; Registro: correo electrónico).
  - `password`: Clave (Password).
  - `fullName`: Texto (visible únicamente en modo `register`).
  - `selectedRole`: Selector por botones (Bodega / Administrador, visible en modo `register`).
- **Campos obligatorios:** Todos los visibles según el modo (`mode === 'login'` vs `mode === 'register'`).
- **Validaciones implementadas en código:**
  - `emailOrUser`: Requerido (`!emailOrUser.trim()`).
  - `fullName` (registro): Requerido (`!fullName.trim()`).
  - `password`: Requerido; longitud mínima >= 6 caracteres en modo registro; >= 4 caracteres en modo login.
- **Mensajes de error desplegados:**
  - "Ingrese su correo electrónico." / "Ingrese su usuario o correo."
  - "Ingrese su nombre completo."
  - "Ingrese la clave de acceso."
  - "La clave debe contener al menos 6 caracteres."
  - Banners de error de Firebase Auth (`authError`) traducidos al español.
- **Submit handler:** `handleSubmit(e: React.FormEvent)`.
- **Prevención de doble submit:** Sí (`disabled={isSubmitting}`, `isLoading={isSubmitting}`).
- **Servicio llamado:** `registerWithEmail`, `loginWithEmail`, `login` (demo).
- **Persistencia:** Firebase Auth + Firestore `users/{uid}` + `sessionStorage`.
- **Estado real:** **100% Funcional y validado**.

---

### Formulario 02: Catálogo de Producto (`ProductForm.tsx`)
- **Ruta / Pantalla:** `/productos/nuevo` (`ProductCreatePage.tsx`) y `/productos/:id/editar` (`ProductEditPage.tsx`).
- **Campos:**
  - `code`: Texto (`MED-012`).
  - `category`: Select (`PRODUCT_CATEGORIES`).
  - `name`: Texto (Nombre del medicamento/insumo).
  - `presentation`: Texto (Caja x 20 tabletas, etc.).
  - `minStock`: Número entero (Stock mínimo de alerta).
  - `status`: Select ('Activo' | 'Inactivo').
  - `description`: Textarea (Opcional).
- **Campos obligatorios:** `code`, `category`, `name`, `presentation`, `minStock`, `status`.
- **Validaciones implementadas en código (`validate()`):**
  - `code`: Requerido; regex `^[A-Z0-9-]+$` (sin espacios ni caracteres especiales); unicidad verificada contra `state.products` (excluyendo el propio ID en edición).
  - `name`: Requerido; longitud >= 3 caracteres.
  - `category`: Requerido (no vacío).
  - `presentation`: Requerido (no vacío).
  - `minStock`: Requerido; no `NaN`; >= 0; `Number.isInteger(minStock)`.
- **Control de números negativos:** **SÍ**, bloquea valores `< 0`.
- **Control de cantidades cero:** Permite `minStock = 0` (válido en insumos que no requieran stock mínimo).
- **Submit handler:**
  - `handleFormSubmit`: Valida y abre modal de confirmación (`ConfirmModal`).
  - `handleConfirmedSave`: Invoca `onSubmit(validated)` y cierra modal.
- **Prevención de doble submit:** Sí, protegido por modal de confirmación con estado de carga.
- **Servicio llamado:** `createProduct` / `updateProduct` en `StockCareContext.tsx`.
- **Persistencia:** `localStorage` + `persistProduct` en Firestore.
- **Estado real:** **100% Funcional y validado**.

---

### Formulario 03: Recepción de Mercadería / Entrada (`EntryCreatePage.tsx`)
- **Ruta / Pantalla:** `/entradas/nueva` (`EntryCreatePage.tsx`).
- **Campos de Encabezado:**
  - `provider`: Select (`COMMON_PROVIDERS` + '__OTHER__').
  - `customProvider`: Texto (si `provider === '__OTHER__'`).
  - `documentNumber`: Texto en mayúsculas (`FAC-2026-0610`).
  - `date`: Fecha (`YYYY-MM-DD`, valor inicial: hoy local).
  - `notes`: Textarea (Opcional).
- **Campos de Líneas de Detalle (`lines: DraftLine[]`):**
  - `productId`: Select (filtrado solo productos activos).
  - `quantity`: Número entero.
  - `batchNumber`: Texto (`LOT-2611`).
  - `expiryDate`: Fecha (`YYYY-MM-DD`).
- **Campos obligatorios:** Proveedor, número de documento, fecha de recepción; para cada línea: producto, cantidad, lote y vencimiento. Al menos 1 línea requerida.
- **Validaciones implementadas (`validateAll()`):**
  - `provider`: No vacío.
  - `documentNumber`: No vacío.
  - `date`: No vacío; fecha válida no futura (`isValidNotFutureDate(date)`).
  - `productId`: Seleccionado.
  - `quantity`: Requerido; `Number.isInteger(qty)`; `qty > 0`. Bloquea ceros y negativos.
  - `batchNumber`: No vacío.
  - `expiryDate`: Requerido; fecha válida no pasada (`isValidFutureOrTodayDate(expiryDate)`). **Bloquea el ingreso de productos ya vencidos**.
- **Submit handler:**
  - `handleOpenSummary`: Valida y abre `Modal` con tabla resumen preliminar y conteo de unidades totales.
  - `handleConfirmRegister`: Invoca `registerEntry` y abre modal de comprobante impreso (`EntryReceiptModal`).
- **Servicio llamado:** `registerEntry` en `StockCareContext.tsx`.
- **Persistencia:** `localStorage` + Firestore (`entries`, `batches`, `movements`).
- **Estado real:** **100% Funcional con validaciones de alta seguridad**.

---

### Formulario 04: Despacho / Salida de Inventario (`ExitCreatePage.tsx`)
- **Ruta / Pantalla:** `/salidas/nueva` (`ExitCreatePage.tsx`).
- **Campos:**
  - `productId`: Select (productos activos con existencia física disponible).
  - `batchId`: Select (lotes activos del producto ordenados por vencimiento FEFO).
  - `quantity`: Número entero.
  - `reason`: Select (`EXIT_REASONS`: 'Venta', 'Descarte por vencimiento', 'Uso interno', 'Devolución a proveedor', 'Ajuste de inventario').
  - `reference`: Texto en mayúsculas (Opcional, autogenera `SAL-YYYY-XXXX`).
  - `date`: Fecha (por defecto hoy local).
  - `notes`: Textarea (Opcional).
- **Campos obligatorios:** Producto, lote, cantidad, motivo y fecha.
- **Validaciones implementadas (`validate()`):**
  - `productId`: Requerido; valida que el producto tenga stock disponible (`totalProductStock > 0`).
  - `batchId`: Requerido; lote con existencias.
  - `quantity`: Requerido; `Number.isInteger(qty)`; `qty > 0`; `qty <= selectedBatch.quantity` (no superar stock del lote seleccionado); `qty <= totalProductStock`.
  - `reason` vs `expiryDate`: **Regla de oro farmacéutica**: si el lote seleccionado se encuentra vencido (`selectedBatchStatus === 'Vencido'`) y el motivo es `'Venta'`, **bloquea la operación** con mensaje: *"No se puede vender un lote vencido. Seleccione Descarte por vencimiento o Devolución a proveedor"*.
  - `date`: No futura (`isValidNotFutureDate(date)`).
- **Submit handler:**
  - `handleFormSubmit`: Valida y abre `ConfirmModal` detallando la cantidad previa del lote y el saldo resultante exacto.
  - `handleConfirmedSave`: Invoca `registerExit` y redirige a `/salidas`.
- **Servicio llamado:** `registerExit` en `StockCareContext.tsx`.
- **Persistencia:** `localStorage` + Firestore (`exits`, `batches`, `movements`).
- **Estado real:** **100% Funcional y validado**.

---

### Formulario 05: Perfil del Usuario (`ProfilePage.tsx`)
- **Ruta / Pantalla:** `/perfil` (`ProfilePage.tsx`).
- **Campos:**
  - `fullName`: Texto.
  - `email`: Email institucional.
  - `username`: Texto (deshabilitado).
  - `roleLabel`: Texto (deshabilitado).
- **Validaciones:** `fullName.trim() !== ''`, `email.includes('@')`.
- **Submit handler:** `handleSaveProfile`.
- **Servicio llamado:** `updateProfile` en `StockCareContext.tsx`.
- **Persistencia:** Actualiza sesión en `sessionStorage` y en Firestore si Firebase Auth está activo.
- **Estado real:** **Funcional**.

---

### Formulario 06: Configuración del Sistema (`ProfilePage.tsx`)
- **Ruta / Pantalla:** `/perfil` (Panel derecho, visible para todos, editable solo por `ADMIN`).
- **Campos:**
  - `pharmacyName`: Texto.
  - `branchName`: Texto.
  - `branchAddress`: Texto.
  - `phone`: Texto.
  - `expiryAlertDays`: Select (30, 60, 90 días).
- **Validaciones:** `pharmacyName` y `branchName` no vacíos; inputs deshabilitados si `role !== 'ADMIN'`.
- **Submit handler:** `handleSaveSettings`.
- **Servicio llamado:** `updateSettings` en `StockCareContext.tsx`.
- **Persistencia:** `localStorage` + `persistSettings` en `settings/system`.
- **Estado real:** **Funcional**.

---

## 2. Detección de Errores y Brechas en Formularios

| Pantalla | Campo / Control | Problema Detectado | Nivel de Riesgo | Solución Propuesta |
| :--- | :--- | :--- | :--- | :--- |
| `EntryCreatePage.tsx` | Proveedor libre (`__OTHER__`) | El nombre ingresado no se valida contra un maestro de proveedores ni almacena NIT/NRC. | **Medio** | Crear colección `suppliers` y modal de registro rápido de proveedor. |
| `ProfilePage.tsx` | Configuración | No valida formato telefónico salvadoreño (ej. `+503 2222-0000`). | **Bajo** | Agregar regex de formato telefónico. |
| `ExitCreatePage.tsx` | Referencia | Si el usuario ingresa manualmente una referencia, no se valida unicidad en salidas previas. | **Medio** | Verificar que `reference` no exista en `state.exits`. |
| `MovementsPage.tsx` | Filtros | Permite seleccionar fecha "desde" mayor a fecha "hasta". | **Bajo** | Validar que `dateFrom <= dateTo`. |
| General | Formularios | No se encuentran inputs sin sanitización (todos aplican `.trim()`, conversiones numéricas y validación de tipos). | **Bajo** | Mantener esquema de validación actual. |
