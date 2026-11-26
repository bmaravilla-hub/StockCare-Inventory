# 21 — RESUMEN EJECUTIVO DE AUDITORÍA INTEGRAL DE STOCKCARE

**Proyecto:** StockCare — Sistema de Gestión y Control de Inventario para Farmacia  
**Materia:** Análisis y Diseño de Sistemas (ADS) — Universidad Don Bosco  
**Fecha de Auditoría:** 26 de Noviembre de 2026  
**Tipo de Documento:** Informe de Conclusiones Ejecutivas de la Auditoría Técnica Previa a Implementación en Firebase

---

## 1. Respuestas a las 16 Preguntas Fundamentales

### 1. ¿Cuántos módulos tiene actualmente StockCare?
StockCare cuenta actualmente con **11 módulos funcionales** implementados:
1. Autenticación y Control de Acceso (Auth / RBAC).
2. Panel de Control Operativo (Dashboard).
3. Catálogo de Productos y Fichas Técnicas.
4. Inventario y Existencias Disponibles.
5. Control de Lotes y Fechas de Vencimiento.
6. Gestión de Entradas (Recepciones de Proveedores).
7. Gestión de Salidas (Despachos y Ventas).
8. Trazabilidad de Movimientos (Kardex Inmutable).
9. Sistema de Alertas Preventivas (Vencimientos y Stock Bajo).
10. Reportes Administrativos (5 reportes tabulares con exportación CSV a Excel).
11. Perfil del Usuario y Configuración General del Sistema.
*(Nota: Proveedores, Ajustes Manuales Formales y Administración de Usuarios están contemplados en el diseño pero no poseen módulo autónomo en el código actual).*

### 2. ¿Cuántas pantallas?
El sistema posee **16 páginas enrutadas** en `src/pages/`:
1. `LoginPage.tsx` (`/login`)
2. `DashboardPage.tsx` (`/dashboard`)
3. `ProfilePage.tsx` (`/perfil`)
4. `ProductsListPage.tsx` (`/productos`)
5. `ProductCreatePage.tsx` (`/productos/nuevo`)
6. `ProductEditPage.tsx` (`/productos/:id/editar`)
7. `EntriesListPage.tsx` (`/entradas`)
8. `EntryCreatePage.tsx` (`/entradas/nueva`)
9. `ExitsListPage.tsx` (`/salidas`)
10. `ExitCreatePage.tsx` (`/salidas/nueva`)
11. `InventoryPage.tsx` (`/inventario`)
12. `BatchesPage.tsx` (`/lotes`)
13. `AlertsPage.tsx` (`/alertas`)
14. `MovementsPage.tsx` (`/movimientos`)
15. `ReportsPage.tsx` (`/reportes`)
16. `NotFoundPage.tsx` (`*`)

### 3. ¿Cuántos formularios?
Posee **6 formularios estructurados** de captura de datos:
1. Formulario de Acceso y Registro (`LoginPage.tsx`)
2. Formulario de Producto (`ProductForm.tsx`, usado en alta y edición)
3. Formulario Maestro-Detalle de Entrada de Mercadería (`EntryCreatePage.tsx`)
4. Formulario de Despacho / Salida de Inventario (`ExitCreatePage.tsx`)
5. Formulario de Perfil del Usuario (`ProfilePage.tsx`)
6. Formulario de Configuración Institucional de la Farmacia (`ProfilePage.tsx`)  
Adicionalmente existen **7 barras de filtros y búsquedas avanzadas** con selectores y rangos de fecha en los listados y reportes, y **3 diálogos modales** de confirmación y resumen.

### 4. ¿Cuántos servicios?
Posee **5 archivos de servicio y contexto**:
1. `src/services/firebase.ts` (Inicialización del SDK Firebase).
2. `src/services/authService.ts` (Autenticación y perfiles).
3. `src/services/firestoreService.ts` (Persistencia remota en Cloud Firestore).
4. `src/services/storageService.ts` (Persistencia local en `localStorage`/`sessionStorage`).
5. `src/services/StockCareContext.tsx` (Proveedor de estado reactivo y dispatchers de negocio).

### 5. ¿Cuántas funciones de datos?
Se identificaron **42 funciones específicas** de manipulación, persistencia y cálculo de datos:
- 9 funciones en `authService.ts`
- 8 funciones en `firestoreService.ts`
- 6 funciones en `storageService.ts`
- 14 funciones de acción en `StockCareContext.tsx`
- 7 funciones de cálculo de existencias y semáforos en `utils/inventory.ts`
- 7 funciones de fechas en `utils/date.ts`
- 1 función de exportación a CSV en `utils/exportCsv.ts`

### 6. ¿Cuántos mocks?
Se auditaron **10 estructuras de datos simulados y hardcodeados**:
1. `INITIAL_PRODUCTS`: 13 productos en `mockData.ts`.
2. `INITIAL_ENTRIES`: 4 recepciones (15 líneas de detalle) en `mockData.ts`.
3. `INITIAL_EXITS`: 12 despachos en `mockData.ts`.
4. `buildInitialInventoryState`: Generador que reproduce cronológicamente 15 lotes y 27 movimientos.
5. `DEMO_ACCOUNTS`: 2 cuentas fijas (`admin` y `bodega`).
6. `INITIAL_SETTINGS`: Parámetros institucionales en memoria.
7. `PRODUCT_CATEGORIES`: 11 categorías farmacéuticas hardcodeadas.
8. `COMMON_PROVIDERS`: 5 droguerías en un array plano.
9. `EXIT_REASONS`: 5 motivos de salida fijos.
10. Lista de permisos de rol hardcodeada en `ProfilePage.tsx`.

### 7. ¿Cuántos usos de localStorage / sessionStorage?
Exactamente **6 invocaciones a APIs de almacenamiento web** centralizadas en `src/services/storageService.ts`:
- 3 en `localStorage` (claves: `getItem`, `setItem`, `removeItem` para `'stockcare_inventory_state_v1'`).
- 3 en `sessionStorage` (claves: `getItem`, `setItem`, `removeItem` para `'stockcare_user_session_v1'`).

### 8. ¿Cuántas operaciones CRUD existen realmente?
Existen **19 operaciones CRUD efectivas** implementadas en código:
- `users`: Read, Create, Update (3)
- `products`: Read, Create, Update (3)
- `batches`: Read, Create, Update (3)
- `entries`: Read, Create (2)
- `exits`: Read, Create (2)
- `movements`: Read, Create (2)
- `settings`: Read, Update (2)
- `alerts`: Read derivada (1)
- `inventory`: Read derivada (1)  
*(Nota técnica: Ninguna entidad implementa DELETE físico, respetando el principio farmacéutico de inmutabilidad de movimientos e integridad histórica).*

### 9. ¿Qué funcionalidades son 100% funcionales?
- Autenticación con Firebase Auth (Email/Clave y Google OAuth).
- Protección de rutas y control de acceso basado en roles (RBAC).
- Registro de productos con código alfanumérico único.
- Edición de productos existentes y stock mínimo.
- Registro de recepciones multi-lote con acumulación automática y emisión de comprobante imprimible (DFD 1.5).
- Despacho de salidas con validación estricta de stock por lote y bloqueo de venta de medicamentos vencidos.
- Kardex inmutable con cálculo automático de existencias resultantes.
- Semáforos preventivos de caducidad (FEFO) y de nivel de stock.
- Generación de 5 reportes tabulares y exportación a archivos CSV para Excel con codificación UTF-8.
- Actualización de perfil y configuración de farmacia por el Administrador.

### 10. ¿Cuáles son solo UI o incompletas?
- **Proveedores:** Opera mediante un array plano y campo de texto libre; carece de entidad y CRUD formal.
- **Ajustes de inventario:** Solo existe como un motivo seleccionable al registrar salidas; no permite conciliar conteos físicos ni ajustes positivos (+).
- **Gestión de usuarios:** No hay panel administrativo para listar usuarios ni cambiar roles desde la UI.

### 11. ¿Qué está conectado a Firebase?
- **Firebase Authentication:** Activo y conectado con Email/Password, Google Provider y listeners de sesión.
- **Cloud Firestore:** Conectado de forma híbrida mediante `firestoreService.ts` (lectura inicial, función de seed y persistencia asíncrona de colecciones).
- **Reglas de Seguridad:** Archivo `firestore.rules` estructurado con reglas declarativas por colección.

### 12. ¿Qué sigue usando lógica anterior?
- La aplicación prioriza la lectura y escritura sincrónica en `localStorage`.
- Los botones de acceso rápido demo de la pantalla de login que usan `DEMO_ACCOUNTS`.
- La duplicación de la sesión en `sessionStorage`.
- La ausencia de listeners en tiempo real (`onSnapshot`), lo que provoca que los datos no se sincronicen entre múltiples computadoras sin recargar con F5.

### 13. ¿Qué debe eliminarse?
- Archivos residuales: `Sin confirmar 531720.crdownload` (153 MB), `stockcare_logo.jpg` en raíz, `firebase-debug.log`.
- Código fuente: Bypass demo en `LoginPage.tsx`, arreglo `DEMO_ACCOUNTS`, lógica de login síncrono sin contraseña y serialización JSON obligatoria en `localStorage`.

### 14. ¿Qué debe migrarse?
- El catálogo de productos, lotes, entradas, salidas y movimientos a colecciones de Cloud Firestore.
- La gestión de proveedores a una colección dedicada `suppliers`.
- La aplicación frontend compilada (`dist/`) hacia **Firebase Hosting**.

### 15. ¿Qué falta para considerar StockCare terminado?
1. Reemplazar la persistencia local de `StockCareContext` por listeners en tiempo real (`onSnapshot`) de Firestore.
2. Asegurar la integridad de entradas y salidas concurrentes mediante transacciones atómicas (`runTransaction`).
3. Retirar definitivamente los accesos de prueba y cuentas demo del login.
4. Crear la colección y módulo de proveedores.
5. Desplegar `firestore.rules` y configurar índices compuestos en Firebase.
6. Desplegar la aplicación en Firebase Hosting (`stockcare-e000b.web.app`).

### 16. ¿Cuáles son los riesgos P0 / P1 / P2 / P3?
- **P0 (Bloqueante):** Fallo de Google Sign-In por `auth/unauthorized-domain` si no se autoriza el dominio en Firebase Console; problemas de conectividad de red con las APIs de Google Cloud al usar Firebase CLI.
- **P1 (Integridad):** Sobrescritura de stock si dos dependientes realizan salidas concurrentes sin transacciones atómicas de Firestore; desincronización entre computadoras por depender de `localStorage`.
- **P2 (Escalabilidad):** Descarga de colecciones completas para filtrar en el navegador con `array.filter` en lugar de usar paginación y consultas indexadas de Firestore.
- **P3 (Mantenimiento):** Ausencia de un módulo formal de proveedores y ajustes físicos de inventario.

---

## 2. Tabla Resumen Global por Área del Sistema

| Área / Módulo | Estado Funcional | Presencia de Mock | Persistencia Actual | Integración Firebase | Acción Requerida | Prioridad |
| :--- | :--- | :---: | :--- | :--- | :--- | :---: |
| **Autenticación (Auth)** | Funcional con bypass demo | **SÍ** (`DEMO_ACCOUNTS`) | Firebase Auth + `sessionStorage` | **Activa** (Auth SDK) | Eliminar bypass demo y consolidar Auth | **P1** |
| **Control de Acceso (RBAC)** | Funcional y persistente | **NO** | Sesión activa (`session.role`) | Firestore (`users/{uid}`) | Eliminar heurística de correo y verificar en Firestore | **P1** |
| **Dashboard** | Funcional con mock | **SÍ** (Calculado en cliente) | Memoria / `localStorage` | Parcial (Lee colecciones) | Migrar métricas a consultas optimizadas | **P2** |
| **Catálogo de Productos** | Funcional y persistente | **SÍ** (Semilla inicial) | `localStorage` + Firestore | **Activa** (`products/{id}`) | Conectar con listener `onSnapshot` | **P1** |
| **Proveedores** | No implementada (Texto libre)| **SÍ** (`COMMON_PROVIDERS`) | Inexistente (String plano) | Ninguna | Crear colección `suppliers` | **P2** |
| **Lotes y Vencimientos** | Funcional con mock | **SÍ** (Semilla inicial) | `localStorage` + Firestore | **Activa** (`batches/{id}`) | Indexar por FEFO y fecha de vencimiento | **P1** |
| **Entradas de Mercadería** | Funcional y persistente | **SÍ** (Semilla inicial) | `localStorage` + Firestore | **Activa** (`entries/{id}`) | Transacciones atómicas multi-documento | **P1** |
| **Salidas de Inventario** | Funcional y persistente | **SÍ** (Semilla inicial) | `localStorage` + Firestore | **Activa** (`exits/{id}`) | Implementar `runTransaction` concurrente | **P1** |
| **Kardex de Movimientos** | Funcional con mock | **SÍ** (Semilla inicial) | `localStorage` + Firestore | **Activa** (`movements/{id}`) | Paginación con límite y cursores remotos | **P1** |
| **Ajustes de Inventario** | No implementada formalmente | **SÍ** (Motivo en salida) | `localStorage` / Salidas | Ninguna | Diseñar módulo de conciliación física | **P3** |
| **Alertas Preventivas** | Funcional con mock | **SÍ** (Calculado en cliente) | Memoria / `localStorage` | Parcial | Consultas indexadas por umbral de alerta | **P2** |
| **Reportes y Exportación** | Funcional con mock | **SÍ** (Calculado en cliente) | Memoria + Descarga CSV | Parcial | Consultas acotadas por rango de fechas | **P2** |
| **Configuración Farmacia** | Funcional y persistente | **SÍ** (Semilla inicial) | `localStorage` + Firestore | **Activa** (`settings/system`) | Mantener en documento singleton | **P2** |
| **Seguridad (Rules)** | Parcial / En espera | **NO** | Archivo local `firestore.rules` | Lista para despliegue | Desplegar en Firebase y endurecer roles | **P1** |
| **Hosting y Disponibilidad**| No configurada | **NO** | Build local en `dist/` | Ninguna | Configurar `firebase.json` y desplegar | **P2** |
