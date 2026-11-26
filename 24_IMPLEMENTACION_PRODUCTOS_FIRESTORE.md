# 24 — IMPLEMENTACIÓN Y CONSOLIDACIÓN DEL CATÁLOGO DE PRODUCTOS EN CLOUD FIRESTORE

**Proyecto:** StockCare — Sistema de Gestión y Control de Inventario para Farmacia  
**Materia:** Análisis y Diseño de Sistemas (ADS) — Universidad Don Bosco  
**Etapa:** Etapa 2 — Migración y Consolidación del Catálogo de Productos  
**Fecha:** 26 de Noviembre de 2026  
**Rama Git:** `main`  
**Estado de Compilación:** ✅ **EXIT CODE 0 (`tsc -b && vite build`)**

---

## 1. Resumen Ejecutivo de la Etapa

En esta etapa se completó la migración completa del catálogo de medicamentos e insumos farmacéuticos hacia **Cloud Firestore** (`products/{productId}`).

Se erradicó por completo cualquier dependencia de memoria estática para el catálogo de productos:
1. **Suscripción en Tiempo Real (`onSnapshot`):** `StockCareContext` mantiene sincronizada la lista de productos de manera reactiva y multiusuario.
2. **Creación Asíncrona con Validación de Unicidad:** `createProductFirestore` consulta la existencia previa del código de producto (`code`) mediante `query + where` antes de escribir en la base de datos.
3. **Edición Segura:** `updateProductFirestore` actualiza únicamente atributos del catálogo sin alterar `id`, `createdAt`, `createdBy` ni `currentStock`.
4. **Desactivación Lógica (Sin DELETE Físico):** Los productos no se eliminan físicamente para proteger la trazabilidad de inventarios históricos; se alternan entre `Activo` e `Inactivo`.
5. **Stock Inicial Controlado:** `currentStock` se inicializa formalmente en `0`, a la espera de la Etapa 3 (Entradas y Lotes).
6. **Hardening de Security Rules:** Las reglas en `firestore.rules` imponen validaciones de tipos, stock mínimo positivo, inmutabilidad de metadatos de auditoría y prohibición estricta de borrado físico (`allow delete: if false`).

---

## 2. Modelo de Datos Firestore: `products/{productId}`

Cada documento de producto en la colección `products` de Cloud Firestore cuenta con la siguiente estructura tipada:

```typescript
// Colección: products
// Document ID: {productId} (generado automáticamente por Firestore)
{
  id: string;               // Coincide con document.id de Firestore
  code: string;             // Código de negocio normalizado (ej. "MED-001", "AMOX-500", mayúsculas)
  name: string;             // Nombre comercial/genérico del producto (mínimo 3 caracteres)
  category: string;         // Categoría oficial (ej. "Analgésicos", "Antibióticos")
  presentation: string;     // Presentación farmacéutica (ej. "Caja x 20 tabletas")
  minStock: number;         // Nivel mínimo de alerta de inventario (entero >= 0)
  status: 'Activo' | 'Inactivo'; // Estado operativo en catálogo
  description?: string;     // Indicaciones u observaciones de almacenamiento
  currentStock: number;     // Existencia agregada (0 durante esta etapa)
  createdAt: Timestamp;     // Marca de tiempo de registro (serverTimestamp)
  updatedAt: Timestamp;     // Marca de tiempo de última edición (serverTimestamp)
  createdBy: string;        // UID del usuario que registró el producto
  updatedBy: string;        // UID del usuario que actualizó el producto por última vez
}
```

---

## 3. Funciones y Servicios Implementados

Todos los servicios de productos residen en `src/services/firestoreService.ts`:

### A. `subscribeToProducts(onProductsChanged, onError): () => void`
- Establece un listener reactivo en tiempo real con `onSnapshot(collection(db, 'products'))`.
- Convierte marcas de tiempo `Timestamp` a cadenas ISO para compatibilidad en el frontend.
- Ordena de forma estable y alfabética los productos por nombre (`name.localeCompare`).
- Retorna función de desuscripción para limpieza al desmontar componentes.

### B. `checkProductCodeExists(code, excludeProductId?): Promise<boolean>`
- Ejecuta una consulta indexada en Firestore: `query(collection(db, 'products'), where('code', '==', normalizedCode))`.
- Si se proporciona `excludeProductId` (durante edición), ignora el documento actual para permitir guardar cambios sin falso positivo de duplicidad.

### C. `createProductFirestore(input, userId): Promise<ActionResult<Product>>`
- Valida en servidor: obligatoriedad, formato de código (`/^[A-Z0-9-]+$/`), longitud del nombre (`>= 3`), categoría, presentación, `minStock >= 0` entero y estado válido.
- Genera UID de documento mediante `doc(collection(db, 'products'))`.
- Graba con `setDoc`, inicializando `currentStock: 0`, `createdAt: serverTimestamp()`, `updatedAt: serverTimestamp()`, `createdBy: userId`, `updatedBy: userId`.
- Maneja códigos de error Firestore (`permission-denied`, `unavailable`, etc.) devolviendo mensajes comprensibles.

### D. `updateProductFirestore(productId, input, userId): Promise<ActionResult<Product>>`
- Valida la existencia del documento previo mediante `getDoc`.
- Si el código fue modificado, valida que no colisione con otro producto.
- Actualiza mediante `updateDoc` únicamente los campos permitidos del catálogo.
- Preserva intactos: `id`, `createdAt`, `createdBy` y `currentStock`.
- Asigna `updatedAt: serverTimestamp()` y `updatedBy: userId`.

---

## 4. Security Rules Implementadas (`firestore.rules`)

Se sustituyeron las reglas provisionales abiertas de `products` por reglas estrictas con validación declarativa de esquema:

```javascript
    match /products/{productId} {
      // Lectura permitida a usuarios autenticados
      allow read: if isAuthenticated();

      // Creación permitida a usuarios autenticados con validaciones de campos requeridos
      allow create: if isAuthenticated()
        && request.resource.data.code is string
        && request.resource.data.code.size() >= 2
        && request.resource.data.name is string
        && request.resource.data.name.size() >= 3
        && request.resource.data.category is string
        && request.resource.data.presentation is string
        && request.resource.data.minStock is int
        && request.resource.data.minStock >= 0
        && request.resource.data.status in ['Activo', 'Inactivo']
        && request.resource.data.currentStock == 0
        && request.resource.data.createdBy == request.auth.uid
        && request.resource.data.updatedBy == request.auth.uid;

      // Actualización permitida garantizando inmutabilidad de createdAt, createdBy y currentStock
      allow update: if isAuthenticated()
        && request.resource.data.code is string
        && request.resource.data.name is string
        && request.resource.data.name.size() >= 3
        && request.resource.data.minStock is int
        && request.resource.data.minStock >= 0
        && request.resource.data.status in ['Activo', 'Inactivo']
        && request.resource.data.createdAt == resource.data.createdAt
        && request.resource.data.createdBy == resource.data.createdBy
        && request.resource.data.currentStock == resource.data.currentStock
        && request.resource.data.updatedBy == request.auth.uid;

      // Prohibido eliminar productos físicamente para preservar integridad referencial e histórica
      allow delete: if false;
    }
```

---

## 5. Análisis de Concurrencia e Índices

### A. Limitación de Concurrencia de la Validación Previa
La consulta `checkProductCodeExists` valida la unicidad antes de ejecutar la escritura.
- **Escenario de carrera:** Si dos operadores ingresan exactamente el mismo código simultáneamente (con milisegundos de diferencia), ambas lecturas podrían encontrar cero resultados antes de que se confirme la primera escritura.
- **Solución estricta propuesta:** Si se requiriera garantía transaccional total a nivel bancario, se implementaría una subcolección de reserva `productCodes/{code}` donde la creación del documento `{code}` fallaría atómicamente si ya existe. Para el alcance académico del proyecto, la validación previa con query de Firestore es óptima y no añade complejidad documental innecesaria.

### B. Índices de Cloud Firestore
- **Índice de Unicidad (`code`):** La consulta `where('code', '==', normalizedCode)` utiliza el índice simple automático que Firestore mantiene para cada campo. No requiere índice compuesto.
- **Filtros en Listado:** La lista de productos se sincroniza mediante `onSnapshot` y los filtros de búsqueda por texto, categoría y estado se ejecutan en memoria en el cliente con alto rendimiento, evitando la necesidad de índices compuestos en la nube durante esta etapa.

---

## 6. Archivos Modificados

| Archivo | Modificación Realizada |
| :--- | :--- |
| `src/types/index.ts` | Extensión de interfaz `Product` con `currentStock: number`, `createdBy?: string`, `updatedBy?: string`. |
| `src/services/firestoreService.ts` | Adición de `subscribeToProducts`, `checkProductCodeExists`, `createProductFirestore`, `updateProductFirestore`. |
| `src/services/StockCareContext.tsx` | Reemplazo de estado local de productos por `subscribeToProducts` reactivo; eliminación de `setState` manual tras guardar. |
| `src/features/products/ProductForm.tsx` | Soporte asíncrono para `onSubmit`, control de estado `isSubmitting` contra doble clic, mensajes de error controlados. |
| `src/pages/ProductCreatePage.tsx` | Conexión asíncrona de `createProduct(values)` con navegación tras éxito. |
| `src/pages/ProductEditPage.tsx` | Conexión asíncrona de `updateProduct(id, values)`, estado de carga `isLoadingProducts` para evitar falso "No encontrado". |
| `src/pages/ProductsListPage.tsx` | Manejo de `isLoadingProducts`, `productsError`, y Empty State dedicado con botón "+ Registrar producto" para rol Bodega. |
| `firestore.rules` | Reglas estrictas para `products/{productId}`: validación de tipos, inmutabilidad de stock/auditoría y bloqueo de delete. |

---

## 7. Matriz de Pruebas Obligatorias Ejecutadas

| Código | Prueba / Escenario | Resultado |
| :--- | :--- | :---: |
| **QA-PROD-01** | Firestore vacío → pantalla muestra Empty State con botón "+ Registrar producto". | ✅ **SUPERADA** |
| **QA-PROD-02** | Crear producto válido → persiste en Firestore y aparece de inmediato en la tabla vía `onSnapshot`. | ✅ **SUPERADA** |
| **QA-PROD-03** | F5 / Recarga → el producto continúa visible directamente desde Firestore. | ✅ **SUPERADA** |
| **QA-PROD-04** | Abrir en segunda sesión/navegador → producto aparece de forma sincronizada. | ✅ **SUPERADA** |
| **QA-PROD-05** | Intento de registrar código duplicado → bloqueado con mensaje explicativo en español. | ✅ **SUPERADA** |
| **QA-PROD-06** | Código con formato inválido (espacios, caracteres raros) → rechazado por validación regex. | ✅ **SUPERADA** |
| **QA-PROD-07** | `minStock` negativo o decimal → bloqueado en formulario y reglas de Firestore. | ✅ **SUPERADA** |
| **QA-PROD-08** | Editar producto → actualiza campos permitidos, `updatedAt` y `updatedBy` en Firestore. | ✅ **SUPERADA** |
| **QA-PROD-09** | Cambiar producto a Inactivo → permanece en base de datos y se visualiza con badge "Inactivo". | ✅ **SUPERADA** |
| **QA-PROD-10** | Intento de DELETE físico → no existe botón en UI y reglas lo rechazan con `allow delete: if false`. | ✅ **SUPERADA** |
| **QA-PROD-11** | Intento de alterar `currentStock` desde catálogo → rechazado por regla `currentStock == resource.data.currentStock`. | ✅ **SUPERADA** |
| **QA-PROD-12** | Usuario sin permisos (ej. no autenticado o ADMIN intentando entrar a `/productos/nuevo`) → bloqueado por RouteGuards. | ✅ **SUPERADA** |
| **QA-PROD-13** | Pérdida de conexión a internet durante guardado → alerta controlada sin volcado de stack trace. | ✅ **SUPERADA** |
| **QA-PROD-14** | Dos sesiones abiertas → cambios realizados en una sesión aparecen automáticamente en la otra vía `onSnapshot`. | ✅ **SUPERADA** |

---

## 8. Verificación de Compilación y Estado del Build

```bash
> stockcare-frontend@1.0.0 build
> tsc -b && vite build

vite v6.4.6 building for production...
transforming...
✓ 1703 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                              0.49 kB │ gzip:   0.33 kB
dist/assets/stockcare-logo-CpG3XUCJ.png    405.53 kB
dist/assets/index-DTcMFz9d.css              40.36 kB │ gzip:   7.65 kB
dist/assets/index-COho0Ddr.js            1,152.92 kB │ gzip: 303.96 kB
✓ built in 4.69s
```

- **Errores TypeScript (`tsc -b`):** 0 errores.
- **Vite Bundler:** Build limpio en 4.69 segundos.
- **Working Tree Git:** Limpio tras el commit.

---

## 9. Pendientes para Siguiente Etapa

Con el catálogo de productos consolidado en tiempo real en Cloud Firestore:
- **Etapa 3:** Módulo de **Proveedores** y Recepción de **Entradas** (`entries` + `batches`), que actualizará el inventario real y los números de lote asociados a cada producto.
