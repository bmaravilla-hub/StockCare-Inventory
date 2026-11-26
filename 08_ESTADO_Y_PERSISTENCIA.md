# 08 — AUDITORÍA DE ESTADO Y PERSISTENCIA DE STOCKCARE

**Proyecto:** StockCare — Sistema de Gestión y Control de Inventario para Farmacia  
**Materia:** Análisis y Diseño de Sistemas (ADS) — Universidad Don Bosco  
**Fecha de Auditoría:** 26 de Noviembre de 2026  
**Tecnologías Detectadas:** React Context API, React `useState`, `useEffect`, `useCallback`, `localStorage`, `sessionStorage`, Cloud Firestore SDK, Firebase Auth SDK.

---

## 1. Mapeo de Gestores de Estado

1. **Gestores Globales Especializados (Redux, Zustand, MobX, Recoil):** **NO UTILIZADOS**. El proyecto prescinde de librerías externas de estado global.
2. **Context API de React:**
   - Implementado en `src/services/StockCareContext.tsx` (`StockCareContext` y `StockCareProvider`).
   - Mantiene en memoria el árbol unificado de datos del inventario y la sesión del usuario.
3. **Persistencia Local (`localStorage`):**
   - Clave: `stockcare_inventory_state_v1`.
   - Se actualiza automáticamente mediante un `useEffect` en `StockCareContext.tsx` cada vez que cambia el estado `state`.
4. **Persistencia de Sesión (`sessionStorage`):**
   - Clave: `stockcare_user_session_v1`.
   - Se actualiza cada vez que cambia el estado `session`.
5. **Persistencia en la Nube (Cloud Firestore & Firebase Auth):**
   - Parcialmente integrada. Inicializa con `subscribeToAuthChanges` y sincroniza las escrituras de productos, lotes, movimientos, entradas y salidas.

---

## 2. Matriz de Persistencia y Volatilidad de Datos

| Dato / Entidad | Origen | Estado Actual | ¿Persiste a Recarga (F5)? | ¿Persiste entre Dispositivos? | ¿Soporta Multiusuario Concurrente? | ¿Debe migrar a Firestore / Auth? |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **Sesión de Usuario (Firebase)** | Firebase Auth SDK | `onAuthStateChanged` + `sessionStorage` | **SÍ** | **SÍ** | **SÍ** (Sesiones independientes por UID) | **YA MIGRADO PARCIALMENTE** (Consolidar en Auth) |
| **Sesión Demo (`admin`/`bodega`)** | `DEMO_ACCOUNTS` | `sessionStorage` | **SÍ** (mientras no se cierre la pestaña) | **NO** | **NO** | **ELIMINAR** en producción |
| **Catálogo de Productos** | `mockData.ts` / Firestore | `useState` + `localStorage` + `persistProduct` | **SÍ** (en el mismo navegador) | **NO** (si no leyó de Firestore) | **NO** (riesgo de sobrescritura local) | **MIGRAR A FIRESTORE** (`products`) |
| **Lotes (`batches`)** | Cronología calculada / Entradas | `useState` + `localStorage` + `persistBatch` | **SÍ** (local) | **NO** | **NO** | **MIGRAR A FIRESTORE** (`batches`) |
| **Entradas (`entries`)** | Formularios de recepción | `useState` + `localStorage` + `persistEntry` | **SÍ** (local) | **NO** | **NO** | **MIGRAR A FIRESTORE** (`entries`) |
| **Salidas (`exits`)** | Formularios de despacho | `useState` + `localStorage` + `persistExit` | **SÍ** (local) | **NO** | **NO** | **MIGRAR A FIRESTORE** (`exits`) |
| **Movimientos (Kardex)** | Transacciones de entrada/salida | `useState` + `localStorage` + `persistMovement` | **SÍ** (local) | **NO** | **NO** | **MIGRAR A FIRESTORE** (`movements`) |
| **Parámetros Farmacia** | `INITIAL_SETTINGS` | `useState` + `localStorage` + `persistSettings` | **SÍ** (local) | **NO** | **NO** | **MIGRAR A FIRESTORE** (`settings/system`) |
| **Notificaciones Toast** | Acciones UI (`addToast`) | `useState<ToastMessage[]>` en memoria | **NO** (se pierden al recargar) | **NO** | N/A (Efímero por diseño) | **CONSERVAR EN CLIENTE** |
| **Filtros y Búsquedas** | Inputs en cada vista | `useState` en cada componente de página | **NO** (se reinician al recargar) | **NO** | N/A (Efímero) | **CONSERVAR EN CLIENTE** (o sincronizar en query params) |

---

## 3. Diagnóstico de Riesgos de Concurrencia y Consistencia

1. **Aislamiento por LocalStorage (Efecto "Isla"):**
   - Actualmente, si el Encargado de Bodega registra una entrada en la computadora de bodega, esa entrada se guarda en el `localStorage` de su navegador.
   - El Administrador en otra computadora **NO verá la entrada** a menos que:
     a) Ambos estén conectados a Firebase.
     b) La función `fetchFirestoreInventory` se ejecute al recargar la página.
2. **Carencia de Suscripción en Tiempo Real (`onSnapshot`):**
   - `StockCareContext.tsx` realiza una única lectura con `fetchFirestoreInventory()` al montarse el componente (`useEffect []`).
   - No utiliza listeners en tiempo real (`onSnapshot`). Por lo tanto, si un usuario realiza una salida, los otros clientes conectados no ven decrementarse el stock hasta que recarguen manualmente el navegador con F5.
3. **Riesgo de Re-Sembrado Involuntario (`seedFirestoreData`):**
   - En `firestoreService.ts:45`, si `productsSnap.empty && batchesSnap.empty`, el sistema ejecuta automáticamente `seedFirestoreData()`. Si un administrador borra deliberadamente los productos para iniciar de cero en producción, el sistema volverá a inyectar los datos mock automáticamente.
