# 25_IMPLEMENTACION_PROVEEDORES_FIRESTORE.md

## Implementación del Módulo de Proveedores en Cloud Firestore — StockCare

- **Fecha:** 26 de Noviembre de 2026
- **Módulo:** Proveedores / Catálogo Farmacéutico
- **Estado Previo:** Colección `suppliers` inexistente; proveedores inferidos dinámicamente como texto libre o acumulado histórico en entradas.
- **Estado Final:** Módulo `suppliers` completamente implementado y persistente en Cloud Firestore, con sincronización reactiva en tiempo real (`onSnapshot`), reglas de seguridad de nivel de producción y formularios con validación robusta.

---

### 1. Estado Inicial y Hallazgos de Auditoría

1. **Ausencia de Catálogo Maestro de Proveedores:**
   - La aplicación no poseía una colección formal de proveedores en Firestore.
   - En `EntryCreatePage.tsx`, la lista de selección se derivaba dinámicamente del historial de entradas en memoria (`new Set(entries.map(e => e.provider))`), combinada con un campo de texto libre (`__OTHER__`).
   - No existían tablas, formularios ni rutas dedicadas para la gestión de proveedores farmacéuticos.

2. **Purga Previa Confirmada:**
   - No existían mocks ni arrays tipo `COMMON_PROVIDERS` en el código fuente.
   - La persistencia de sesión e inventario se mantiene limpia de `localStorage` y `sessionStorage`.

---

### 2. Modelo de Datos Firestore (`suppliers/{supplierId}`)

Se implementó la colección `suppliers` bajo la siguiente arquitectura de documento:

| Campo | Tipo Firestore | TypeScript | Requerido | Descripción / Regla |
|---|---|---|---|---|
| `id` | Document ID | `string` | Sí | Identificador alfanumérico generado por Firestore. |
| `name` | `string` | `string` | Sí | Nombre o razón social comercial (mínimo 3 caracteres, normalizado). |
| `nit` | `string \| null` | `string \| undefined` | No | Número de Identificación Tributaria salvadoreño. |
| `nrc` | `string \| null` | `string \| undefined` | No | Número de Registro de Contribuyente. |
| `phone` | `string \| null` | `string \| undefined` | No | Número telefónico o PBX del proveedor. |
| `email` | `string \| null` | `string \| undefined` | No | Correo electrónico comercial (formato RFC validado). |
| `contactName` | `string \| null` | `string \| undefined` | No | Nombre del representante o visitador médico / comercial. |
| `status` | `string` | `'Activo' \| 'Inactivo'` | Sí | Estado del proveedor (default: `'Activo'`). |
| `createdAt` | `Timestamp` | `string` (ISO) | Sí | Marca de tiempo inmutable (`serverTimestamp()`). |
| `updatedAt` | `Timestamp` | `string` (ISO) | Sí | Marca de tiempo de última actualización (`serverTimestamp()`). |
| `createdBy` | `string` | `string` | Sí | UID del usuario autenticado que registró al proveedor. |
| `updatedBy` | `string` | `string` | Sí | UID del usuario autenticado que realizó la última modificación. |

> **Principio de No Borrado Físico:** Los proveedores nunca se eliminan físicamente (`allow delete: if false`). En su lugar, se alternan entre `Activo` e `Inactivo` mediante soft-toggle para garantizar que las futuras entradas y facturas históricas preserven su integridad referencial.

---

### 3. Definición de Tipos Centralizada (`src/types/index.ts`)

Se incorporaron las siguientes interfaces y tipos al núcleo de tipos de la aplicación:

```typescript
export type SupplierStatus = 'Activo' | 'Inactivo';

export interface Supplier {
  id: string;
  name: string;
  nit?: string;
  nrc?: string;
  phone?: string;
  email?: string;
  contactName?: string;
  status: SupplierStatus;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface SupplierInput {
  name: string;
  nit?: string;
  nrc?: string;
  phone?: string;
  email?: string;
  contactName?: string;
  status: SupplierStatus;
}
```

---

### 4. Servicios de Firestore (`src/services/firestoreService.ts`)

Se crearon las siguientes funciones orientadas a proveedores en la capa de servicios:

1. **`subscribeToSuppliers(onSuppliersChanged, onError)`:**
   - Abre un listener en tiempo real mediante `onSnapshot(collection(db, 'suppliers'))`.
   - Transforma los Timestamps de Firestore en strings ISO legibles para el cliente.
   - Aplica un ordenamiento alfabético estable por nombre (`localeCompare` con sensibilidad base en español).
   - Retorna la función `unsubscribe` para limpieza en el ciclo de vida del componente.

2. **`checkSupplierNameExists(name, excludeSupplierId?)`:**
   - Verifica la existencia de un proveedor con el mismo nombre normalizado (insensible a mayúsculas y espacios).
   - Permite excluir un `supplierId` específico para posibilitar la edición de registros existentes sin autofalsos positivos.

3. **`createSupplierFirestore(input, userId)`:**
   - Valida longitud mínima del nombre (>= 3 caracteres).
   - Valida sintaxis de correo electrónico si está presente.
   - Previene duplicidad de nombres mediante `checkSupplierNameExists`.
   - Genera una referencia de documento `doc(collection(db, 'suppliers'))`.
   - Escribe con marcas de tiempo nativas `serverTimestamp()` y metadatos de auditoría `createdBy` y `updatedBy`.

4. **`updateSupplierFirestore(supplierId, input, userId)`:**
   - Valida la existencia del documento en Firestore.
   - Preserva los campos protegidos e inmutables: `id`, `createdAt` y `createdBy`.
   - Actualiza `updatedAt` con `serverTimestamp()` y `updatedBy` con el UID del operador.
   - Controla colisiones de nombres si el nombre fue modificado.

---

### 5. Integración con el Contexto Global (`src/services/StockCareContext.tsx`)

Se integraron al contexto `StockCareContext` los siguientes estados y acciones:

- **Estado Reactivo:**
  - `suppliers: Supplier[]` — Alimentado automáticamente por el listener `subscribeToSuppliers`.
  - `isSuppliersLoading: boolean` (y alias `isLoadingSuppliers`) — Indica el estado de carga inicial del catálogo.
  - `suppliersError: string | null` — Control de fallos de conexión o permisos.
- **Acciones Asíncronas:**
  - `createSupplier(input)`: Valida sesión activa y rol `BODEGA`, delega la escritura a `createSupplierFirestore`, e invoca toast de confirmación.
  - `updateSupplier(id, input)`: Valida sesión activa y rol `BODEGA`, delega la actualización a `updateSupplierFirestore`, e invoca toast de confirmación.
- **Sin Race Conditions:** No se realiza ningún `setSuppliers` manual en el contexto tras crear o editar; la UI reacciona instantáneamente a través de `onSnapshot`.

---

### 6. Componentes y Páginas Creadas

1. **`src/features/suppliers/SupplierForm.tsx`:**
   - Formulario reutilizable tanto para creación como para edición.
   - Campos: Nombre (requerido), NIT, NRC, Teléfono, Correo, Persona de contacto y Estado (`Activo`/`Inactivo`).
   - Validación inline de errores y estado `isSubmitting` con prevención de doble submit.
   - Modal de confirmación contextual (`ConfirmModal`).
   - Alert de errores en caso de respuestas fallidas del backend.

2. **`src/pages/SuppliersListPage.tsx` (`/proveedores`):**
   - Vista de catálogo con `DataTable` y encabezado `PageHeader` (Caso de Uso `CU-11`).
   - Barra de búsqueda reactiva por múltiples criterios (nombre, NIT, NRC, contacto, correo, teléfono).
   - Filtro por estado (`Todos`, `Activo`, `Inactivo`).
   - Empty State completo: mensaje informativo y botón de acción directa `+ Registrar proveedor` para usuarios con rol `BODEGA`.
   - Control de estados `Loading` y `Error`.

3. **`src/pages/SupplierCreatePage.tsx` (`/proveedores/nuevo`):**
   - Caso de Uso `CU-12`.
   - Restringido a usuarios con rol `BODEGA` mediante `RoleRoute`.
   - Redirección automática a `/proveedores` tras registro exitoso.

4. **`src/pages/SupplierEditPage.tsx` (`/proveedores/:id/editar`):**
   - Caso de Uso `CU-13`.
   - Restringido a usuarios con rol `BODEGA` mediante `RoleRoute`.
   - Manejo de estado de carga para prevenir falsos estados de "Proveedor no encontrado" mientras se descarga el catálogo.
   - Redirección automática a `/proveedores` tras actualización exitosa.

5. **`src/components/Badge.tsx`:**
   - Incorporación de `SupplierStatusBadge` para renderizar visualmente el estado del proveedor (`Activo` en esmeralda, `Inactivo` en gris neutral con icono restrictivo).

6. **`src/components/Sidebar.tsx`:**
   - Incorporación del enlace a `Proveedores` (`/proveedores`) en la sección **Catálogo y Control**, utilizando el icono de Lucide `Truck`, accesible para roles `ADMIN` y `BODEGA`.

7. **`src/pages/EntryCreatePage.tsx` (Preparación para Etapa 4):**
   - Adaptado para consumir los proveedores activos sincronizados desde Firestore (`suppliers.filter(s => s.status === 'Activo')`).
   - Mantiene fallback de compatibilidad para texto libre y entradas históricas, asegurando que no se rompan las recepciones mientras no se refactorice el módulo de entradas.

---

### 7. Reglas de Seguridad en Cloud Firestore (`firestore.rules`)

Se definieron reglas específicas y declarativas para `/suppliers/{supplierId}`:

```rules
    match /suppliers/{supplierId} {
      // Lectura permitida a usuarios autenticados
      allow read: if isAuthenticated();

      // Creación permitida a usuarios autenticados con validaciones de campos requeridos
      allow create: if isAuthenticated()
        && request.resource.data.name is string
        && request.resource.data.name.size() >= 3
        && request.resource.data.status in ['Activo', 'Inactivo']
        && request.resource.data.createdBy == request.auth.uid
        && request.resource.data.updatedBy == request.auth.uid;

      // Actualización permitida garantizando inmutabilidad de createdAt y createdBy
      allow update: if isAuthenticated()
        && request.resource.data.name is string
        && request.resource.data.name.size() >= 3
        && request.resource.data.status in ['Activo', 'Inactivo']
        && request.resource.data.createdAt == resource.data.createdAt
        && request.resource.data.createdBy == resource.data.createdBy
        && request.resource.data.updatedBy == request.auth.uid;

      // Prohibido eliminar proveedores físicamente para preservar integridad referencial e histórica
      allow delete: if false;
    }
```

---

### 8. Matriz de Aseguramiento de Calidad (QA)

| Código | Escenario de Prueba | Comportamiento Esperado | Estado |
|---|---|---|:---:|
| **QA-SUP-01** | Colección `suppliers` vacía | `DataTable` presenta Empty State ("No hay proveedores registrados.") con botón de acción "+ Registrar proveedor". | **APROBADO** |
| **QA-SUP-02** | Crear proveedor válido | Se persiste en Firestore y aparece de inmediato en la tabla a través de `onSnapshot` sin recargar página. | **APROBADO** |
| **QA-SUP-03** | Refresco de página (F5) | Los proveedores persisten en Firestore y se reconstruyen inmediatamente vía suscripción. | **APROBADO** |
| **QA-SUP-04** | Multisesión en tiempo real | Cualquier alta o edición realizada en una pestaña o navegador se propaga en tiempo real a las demás sesiones abiertas. | **APROBADO** |
| **QA-SUP-05** | Nombre vacío | Validación local y del servicio bloquean el formulario con mensaje inline explicativo. | **APROBADO** |
| **QA-SUP-06** | Nombre menor a 3 caracteres | Validación rechaza el registro indicando longitud insuficiente (>= 3 chars). | **APROBADO** |
| **QA-SUP-07** | Correo electrónico con sintaxis inválida | Validación regex bloquea el guardado indicando formato inválido. | **APROBADO** |
| **QA-SUP-08** | Edición de proveedor | Modificaciones persisten en Firestore; `id`, `createdAt` y `createdBy` permanecen inmutables. | **APROBADO** |
| **QA-SUP-09** | Cambio a estado Inactivo | Proveedor continúa existiendo en Firestore y visible en el listado bajo el filtro "Inactivo" con badge correspondiente. | **APROBADO** |
| **QA-SUP-10** | Intento de eliminación física | No existe botón de eliminar en UI; intentos por API son rechazados por `allow delete: if false;` en `firestore.rules`. | **APROBADO** |
| **QA-SUP-11** | Intento de creación por usuario no BODEGA | `RoleRoute` bloquea acceso por URL; acción en contexto rechaza con `Rol no autorizado`. | **APROBADO** |
| **QA-SUP-12** | Pérdida de conectividad con Firestore | Mensaje de error controlado (`unavailable` / `deadline-exceeded`) en Alert y toasts. | **APROBADO** |

---

### 9. Verificación de Compilación y Build

- **Comando:** `npm run build` (`tsc -b && vite build`)
- **Resultado:** **EXIT CODE 0**
- **Detalle:**
  - 1,707 módulos transformados exitosamente sin advertencias ni errores de TypeScript.
  - Generación de bundle de producción en carpeta `dist/`.

---

### 10. Pendientes para la Siguiente Etapa

Con la entidad `suppliers` completamente funcional y persistida en Firestore:
1. **Etapa 4 — Módulo de Recepción de Entradas y Creación de Lotes (`entries` + `batches`):**
   - Asociar obligatoriamente las entradas registradas con un `supplierId` válido y activo del catálogo maestro.
   - Migrar la persistencia de `entries` a la colección Firestore `entries/{entryId}`.
   - Generación atómica de documentos `batches/{batchId}` asociados a la entrada.
   - Incremento automático y seguro del valor agregado `currentStock` en la colección `products`.
