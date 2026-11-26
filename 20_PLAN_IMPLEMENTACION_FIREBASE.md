# 20 — PLAN DE IMPLEMENTACIÓN E INTEGRACIÓN DE FIREBASE (FASE III)

**Proyecto:** StockCare — Sistema de Gestión y Control de Inventario para Farmacia  
**Materia:** Análisis y Diseño de Sistemas (ADS) — Universidad Don Bosco  
**Fecha de Auditoría:** 26 de Noviembre de 2026  
**Condición:** **DOCUMENTO DE PLANIFICACIÓN TÉCNICA. NO IMPLEMENTAR HASTA RECIBIR APROBACIÓN EXPRESA**.

---

## 1. Cronograma Estructurado por Etapas

```text
[Etapa 0: Correcciones Bloqueantes]
       │
       ▼
[Etapa 1: Preparación Arquitectónica y Limpieza P0]
       │
       ▼
[Etapa 2: Consolidación de Firebase Authentication]
       │
       ▼
[Etapa 3: Estructuración de Firestore y Script de Semilla Inicial]
       │
       ▼
[Etapa 4: Colección de Usuarios y Control de Roles (RBAC)]
       │
       ▼
[Etapa 5: Catálogo de Productos y Colección de Proveedores]
       │
       ▼
[Etapa 6: Gestión de Lotes y Cálculo de Existencias Físicas]
       │
       ▼
[Etapa 7: Módulo de Entradas (Recepciones Multi-Lote)]
       │
       ▼
[Etapa 8: Módulo de Salidas (Despacho FEFO y Regla Vencidos)]
       │
       ▼
[Etapa 9: Módulo de Ajustes Físicos y Kardex de Movimientos]
       │
       ▼
[Etapa 10: Sistema de Alertas Preventivas (Vencimiento y Stock)]
       │
       ▼
[Etapa 11: Panel de Control (Dashboard) y Reportes Administrativos]
       │
       ▼
[Etapa 12: Optimización de Consultas, Filtros e Índices Compuestos]
       │
       ▼
[Etapa 13: Endurecimiento de Validaciones de Datos]
       │
       ▼
[Etapa 14: Despliegue de Reglas de Seguridad (Security Rules)]
       │
       ▼
[Etapa 15: Despliegue en Producción con Firebase Hosting]
       │
       ▼
[Etapa 16: Control de Calidad Funcional Integral (QA)]
       │
       ▼
[Etapa 17: Depuración Final de Mocks y Código Legacy (P1 y P2)]
```

---

## 2. Desarrollo Detallado de Cada Etapa

### ETAPA 0: Correcciones Bloqueantes
- **Objetivo:** Resolver los factores de bloqueo de red, archivos residuales y configuración de la CLI de Firebase.
- **Archivos afectados:** `.firebaserc` (crear), `.gitignore` (actualizar), `Sin confirmar 531720.crdownload` (eliminar), `stockcare_logo.jpg` (eliminar).
- **Funciones:** N/A (Configuración del entorno).
- **Colecciones:** Ninguna.
- **Lecturas / Escrituras:** Ninguna.
- **Validaciones:** Verificar que `firebase use stockcare-e000b` responda correctamente sin timeouts.
- **Dependencias:** `firebase-tools` CLI.
- **Riesgos:** Errores de firewall local o DNS al conectar con Google Cloud.
- **Pruebas:** Ejecutar `firebase projects:list` en terminal para verificar conectividad con `stockcare-e000b`.
- **Criterio de aceptación:** CLI de Firebase autenticada y vinculada al proyecto sin errores de timeout.

---

### ETAPA 1: Limpieza de Mocks y Arquitectura
- **Objetivo:** Desacoplar `StockCareContext.tsx` de la escritura ciega en `localStorage` y preparar el contexto para recibir streams reactivos de Firestore.
- **Archivos afectados:** `src/services/storageService.ts`, `src/services/StockCareContext.tsx`.
- **Funciones:** Desactivar `saveInventoryState` continuo; introducir banderas de sincronización `isLoadingRemote`.
- **Colecciones:** Ninguna.
- **Lecturas / Escrituras:** 0 remotas.
- **Riesgos:** Pérdida temporal de datos locales si Firestore aún no está sembrado.
- **Pruebas:** Comprobar que la aplicación renderice un estado inicial limpio o en carga sin lanzar excepciones de JSON parse.
- **Criterio de aceptación:** Contexto preparado para conectar suscriptores remotos.

---

### ETAPA 2: Consolidación de Firebase Authentication
- **Objetivo:** Asegurar el inicio de sesión real por Email/Password y Google OAuth, eliminando la dependencia de credenciales simuladas.
- **Archivos afectados:** `src/services/authService.ts`, `src/pages/LoginPage.tsx`, `firebase.json`.
- **Funciones:** `loginWithEmail`, `registerWithEmail`, `loginWithGoogle`, `logoutUser`, `subscribeToAuthChanges`.
- **Colecciones:** `users/{uid}`.
- **Lecturas / Escrituras:** 1 lectura (`getDoc`) y 1 escritura (`setDoc` merge) por inicio de sesión.
- **Validaciones:** Longitud de clave >= 6 caracteres; formato de correo electrónico; dominio del navegador autorizado en Firebase Console.
- **Dependencias:** Firebase Authentication SDK.
- **Riesgos:** Bloqueo de popups en navegadores móviles o error `auth/unauthorized-domain`.
- **Pruebas:** 
  1. Registrar usuario nuevo con correo y clave.
  2. Iniciar sesión con cuenta de Google.
  3. Comprobar que la sesión persiste tras refrescar el navegador (F5).
- **Criterio de aceptación:** Usuario autenticado con UID real emitido por Google Identity Platform y reflejado en el `Topbar`.

---

### ETAPA 3: Modelo Firestore y Script de Semilla Inicial
- **Objetivo:** Crear las colecciones base en Cloud Firestore e insertar el catálogo inicial de productos, configuración institucional y parámetros de prueba mediante un script administrado.
- **Archivos afectados:** `src/services/firestoreService.ts`, script de inicialización (`scripts/seedFirestore.ts`).
- **Funciones:** `seedFirestoreData` ejecutado bajo demanda de forma controlada.
- **Colecciones:** `products`, `settings`, `batches`, `entries`, `exits`, `movements`.
- **Lecturas / Escrituras:** Escritura por lotes (`writeBatch`) de 13 productos, 15 lotes, 4 entradas, 12 salidas y 27 movimientos.
- **Validaciones:** Verificar que no existan documentos duplicados antes de sembrar.
- **Riesgos:** Consumo de cuota diaria de escritura si el script entra en bucle.
- **Pruebas:** Inspeccionar la consola web de Firebase Firestore y verificar la existencia de documentos y colecciones.
- **Criterio de aceptación:** Documentos sembrados en la base de datos remota con tipos de datos correctos (timestamps, numbers y strings).

---

### ETAPA 4: Usuarios y Roles (RBAC)
- **Objetivo:** Vincular el perfil del usuario en `users/{uid}` con su rol farmacéutico (`ADMIN` o `BODEGA`) sin heurísticas de correo.
- **Archivos afectados:** `src/services/authService.ts`, `src/components/RouteGuards.tsx`, `src/pages/ProfilePage.tsx`.
- **Funciones:** `getUserProfile`, `createOrUpdateUserProfile`, `updateProfile`.
- **Colecciones:** `users/{uid}`.
- **Lecturas:** 1 lectura al iniciar sesión; **Escrituras:** 1 escritura al modificar datos personales en el perfil.
- **Validaciones:** Rol restringido a `'ADMIN' | 'BODEGA'`; campos requeridos no vacíos.
- **Dependencias:** `firestore.rules` (solo permitir al usuario escribir su propio documento).
- **Riesgos:** Usuario con rol no asignado que quede bloqueado en el guard de rutas.
- **Pruebas:**
  1. Acceder con usuario `BODEGA` e intentar entrar a `/reportes` (debe arrojar Error 403).
  2. Acceder con usuario `ADMIN` (debe tener acceso a `/reportes` y configuración).
- **Criterio de aceptación:** RBAC operativo y verificado mediante Firestore.

---

### ETAPA 5: Catálogo de Productos y Colección de Proveedores
- **Objetivo:** Migrar el CRUD de productos y habilitar la colección de proveedores en Firestore.
- **Archivos afectados:** `src/pages/ProductsListPage.tsx`, `src/pages/ProductCreatePage.tsx`, `src/pages/ProductEditPage.tsx`, `src/services/firestoreService.ts`.
- **Funciones:** `subscribeToProducts`, `createProductRemote`, `updateProductRemote`.
- **Colecciones:** `products`, `suppliers`.
- **Lecturas:** `onSnapshot` sobre `collection(db, 'products')`.
- **Escrituras:** `setDoc` en `products/{id}`.
- **Validaciones:** Código único (`code`), formato alfanumérico en mayúsculas, stock mínimo entero `>= 0`.
- **Riesgos:** Colisión de códigos de producto si dos usuarios intentan registrar el mismo código al mismo tiempo.
- **Pruebas:**
  1. Crear producto nuevo en una ventana; verificar que aparezca en otra ventana en tiempo real sin recargar.
  2. Intentar registrar un código duplicado y comprobar el mensaje de validación.
- **Criterio de aceptación:** Catálogo 100% persistente y reactivo en Firestore.

---

### ETAPA 6: Lotes e Inventario
- **Objetivo:** Administrar los lotes con existencia y fecha de vencimiento conectados a `batches`.
- **Archivos afectados:** `src/pages/InventoryPage.tsx`, `src/pages/BatchesPage.tsx`, `src/utils/inventory.ts`.
- **Funciones:** `subscribeToBatches`, `getProductActiveBatches`.
- **Colecciones:** `batches`.
- **Lecturas:** `onSnapshot` sobre `batches` (lotes activos).
- **Escrituras:** Vía transacciones de entrada y salida.
- **Validaciones:** Lote vinculado a `productId`; `quantity >= 0`; fecha de vencimiento en formato ISO.
- **Pruebas:** Filtrar lotes por estado 'Vencido' y verificar coincidencia con la fecha actual.
- **Criterio de aceptación:** Pantalla de existencias e inventario sincronizadas en tiempo real con Firestore.

---

### ETAPA 7: Módulo de Entradas (Recepciones)
- **Objetivo:** Registrar recepciones de mercadería multi-línea con actualización atómica en Firestore.
- **Archivos afectados:** `src/pages/EntryCreatePage.tsx`, `src/features/entries/EntryReceiptModal.tsx`, `src/services/StockCareContext.tsx`.
- **Funciones:** `registerEntryFirestore`.
- **Colecciones:** `entries`, `batches`, `movements`, `products`.
- **Lecturas / Escrituras:** Escritura atómica en lote (`writeBatch`) o transacción: crea 1 documento en `entries`, actualiza o crea N documentos en `batches`, crea N documentos en `movements` y actualiza `currentStock` en `products`.
- **Validaciones:** Factura obligatoria, fecha recepción no futura, vencimiento futuro o de hoy, cantidad > 0 entera.
- **Riesgos:** Fallo parcial de red durante el guardado (resuelto mediante transacciones atómicas).
- **Pruebas:** Registrar entrada con 3 productos; comprobar creación de la entrada, actualización de los 3 lotes e inserción en el Kardex.
- **Criterio de aceptación:** Entrada registrada atómicamente y comprobante emitido inmediatamente.

---

### ETAPA 8: Módulo de Salidas (Despacho FEFO)
- **Objetivo:** Registrar retiros de inventario descontando existencias físicas y aplicando la regla de caducidad.
- **Archivos afectados:** `src/pages/ExitCreatePage.tsx`, `src/services/StockCareContext.tsx`.
- **Funciones:** `registerExitFirestore`.
- **Colecciones:** `exits`, `batches`, `movements`, `products`.
- **Lecturas / Escrituras:** `runTransaction` de Firestore: lee lote actual, valida disponibilidad, decrementa `batches/{id}`, crea `exits/{id}`, crea `movements/{id}` y decrementa `products/{id}`.
- **Validaciones:** Cantidad <= existencia de lote; bloqueo estricto si lote está vencido y motivo es 'Venta'.
- **Riesgos:** Condiciones de carrera si dos dependientes intentan despachar el mismo lote al mismo milisegundo (resuelto por `runTransaction`).
- **Pruebas:**
  1. Intentar retirar 15 unidades de un lote con 10 (debe bloquearse).
  2. Intentar vender un lote vencido (debe bloquearse).
  3. Despachar salida válida y verificar actualización inmediata de existencias.
- **Criterio de aceptación:** Salidas registradas con integridad concurrente garantizada por Firestore.

---

### ETAPA 9: Ajustes y Movimientos (Kardex)
- **Objetivo:** Asegurar la inmutabilidad del kardex y habilitar la conciliación de inventario.
- **Archivos afectados:** `src/pages/MovementsPage.tsx`, `src/types/index.ts`.
- **Funciones:** Consulta paginada de movimientos.
- **Colecciones:** `movements`.
- **Lecturas:** `query(collection(db, 'movements'), orderBy('createdAt', 'desc'), limit(25))`.
- **Escrituras:** Solo lectura y append-only (prohibir update y delete).
- **Validaciones:** Cada movimiento debe incluir `resultingStock` coherente.
- **Criterio de aceptación:** Kardex completo con saldo final resultante auditable.

---

### ETAPA 10: Alertas
- **Objetivo:** Monitoreo reactivo de lotes en riesgo y desabastecimiento.
- **Archivos afectados:** `src/pages/AlertsPage.tsx`, `src/components/Topbar.tsx`, `src/components/Sidebar.tsx`.
- **Colecciones:** `batches`, `products`, `settings`.
- **Validaciones:** Lotes con días restantes <= `expiryAlertDays`; productos con existencia <= `minStock`.
- **Criterio de aceptación:** Insignias de alerta del topbar y paneles de alertas actualizados en tiempo real ante cualquier cambio en la base de datos.

---

### ETAPA 11: Dashboard y Reportes
- **Objetivo:** Conectar las 5 métricas del Dashboard y las 5 pestañas de reportes con Firestore.
- **Archivos afectados:** `src/pages/DashboardPage.tsx`, `src/pages/ReportsPage.tsx`.
- **Colecciones:** `products`, `batches`, `movements`, `entries`, `exits`.
- **Validaciones:** Descarga CSV con codificación UTF-8 compatible con Microsoft Excel.
- **Criterio de aceptación:** Reportes generados a partir de datos reales de Firestore y exportables a CSV.

---

### ETAPA 12: Filtros, Paginación y Consultas Remotas
- **Objetivo:** Optimizar consultas de gran volumen en Firestore e implementar índices compuestos.
- **Archivos afectados:** `firestore.indexes.json` (crear), `src/components/DataTable.tsx` (paginador).
- **Índices requeridos:**
  - `movements`: `date` (desc) + `createdAt` (desc).
  - `batches`: `productId` (asc) + `expiryDate` (asc).
  - `batches`: `quantity` (asc) + `expiryDate` (asc).
- **Criterio de aceptación:** Consultas remotas sin advertencias de índice faltante en consola.

---

### ETAPA 13: Validaciones Integrales de Seguridad
- **Objetivo:** Auditar y blindar todos los formularios en frontend contra inyección o valores atípicos.
- **Validaciones:** Sanitización de strings (`.trim()`), validación de enteros, rangos de fechas válidos, prevención de doble clic.

---

### ETAPA 14: Security Rules en Cloud Firestore
- **Objetivo:** Proteger la base de datos en el servidor impidiendo escrituras no autorizadas o maliciosas.
- **Archivos afectados:** `firestore.rules`.
- **Reglas:**
  - Restringir escrituras de `products`, `batches`, `entries`, `exits` a usuarios con rol `BODEGA` o `ADMIN`.
  - Prohibir terminantemente `update` y `delete` en `entries`, `exits` y `movements`.
  - Restringir la escritura en `settings/system` al rol `ADMIN`.
- **Pruebas:** Simular operaciones con Firebase Rules Simulator o pruebas unitarias de reglas.
- **Criterio de aceptación:** Reglas desplegadas en Firebase y verificadas contra intentos de escritura indebida.

---

### ETAPA 15: Firebase Hosting
- **Objetivo:** Desplegar la aplicación web para disponibilidad en línea.
- **Archivos afectados:** `firebase.json` (sección `"hosting"`).
- **Comandos:** `npm run build && firebase deploy --only hosting`.
- **Criterio de aceptación:** URL pública `https://stockcare-e000b.web.app` accesible con enrutamiento SPA funcional (rewrites a `/index.html`).

---

### ETAPA 16: QA Funcional Integral
- **Objetivo:** Ejecutar pruebas de aceptación de extremo a extremo cubriendo los 10 requerimientos funcionales (RF-01 a RF-10).
- **Pruebas:**
  1. Flujo completo: Crear producto -> Registrar entrada con 2 lotes -> Verificar inventario -> Registrar salida -> Comprobar movimiento Kardex -> Emitir reporte -> Exportar CSV.
  2. Prueba de concurrencia: Dos usuarios autenticados simultáneamente operando sobre el mismo inventario.

---

### ETAPA 17: Limpieza Final de Mocks y Legacy
- **Objetivo:** Purgar definitivamente los archivos de datos simulados y funciones legacy.
- **Archivos afectados:** `src/data/mockData.ts`, `src/services/storageService.ts`.
- **Acciones:** Retirar variables mock no utilizadas y asegurar compilación limpia (`npm run build`).
- **Criterio de aceptación:** Cero dependencias de mocks; build en verde sin advertencias.
