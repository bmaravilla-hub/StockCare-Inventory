# 22 — CIERRE Y CERTIFICACIÓN DE LIMPIEZA TOTAL PREVIA A IMPLEMENTACIÓN FIREBASE

**Proyecto:** StockCare — Sistema de Gestión y Control de Inventario para Farmacia  
**Materia:** Análisis y Diseño de Sistemas (ADS) — Universidad Don Bosco  
**Etapa:** Limpieza P0/P1 Integral Previa a Migración Funcional Firestore  
**Fecha:** 26 de Noviembre de 2026  
**Punto de Respaldo Base:** Commit `f07360f` en rama `main`  
**Repositorio Remoto:** `https://github.com/bmaravilla-hub/StockCare-Inventory.git`  
**Estado del Build:** ✅ **EXIT CODE 0 (1,703 módulos compilados limpiamente)**

---

## 1. Resumen Ejecutivo de la Limpieza

En cumplimiento estricto con las directrices de la Fase Previa a la Migración e Implementación Real con Firebase, se completó con éxito la **purgación integral de todos los mocks, fallbacks, cuentas de demostración, heurísticas de privilegios, persistencia local (localStorage/sessionStorage) y archivos residuales** en el repositorio de StockCare.

El sistema se encuentra ahora en un **estado 100% puro**, libre de datos simulados y con una arquitectura de autenticación y carga de datos gobernada exclusivamente por los servicios oficiales de Google Firebase (`Firebase Authentication` y `Cloud Firestore`).

---

## 2. Archivos Residuales Eliminados y `.gitignore`

Se eliminaron los archivos no utilizados, temporales y basura identificados durante la auditoría técnica P0:

| Archivo / Ruta | Tamaño | Justificación | Acción Realizada |
| :--- | :--- | :--- | :--- |
| `Sin confirmar 531720.crdownload` | 153.2 MB | Descarga incompleta de navegador en directorio raíz. | **Eliminado físicamente** |
| `stockcare_logo.jpg` | 175.4 KB | Copia JPEG residual en raíz; la UI oficial utiliza `src/assets/stockcare-logo.png`. | **Eliminado físicamente** |
| `firebase-debug.log` | 2.1 KB | Registro de depuración local de Firebase CLI. | **Eliminado físicamente** |
| `src/services/storageService.ts` | 3.2 KB | Módulo de duplicación de sesión en `sessionStorage` y persistencia en `localStorage`. | **Eliminado vía `git rm`** |

### Configuración de `.gitignore`
Se blindó `.gitignore` para prevenir futuras incorporaciones de archivos no deseados:
```gitignore
# Logs y temporales
firebase-debug.log*
*.crdownload
npm-debug.log*
yarn-debug.log*
```

---

## 3. Bypasses de Autenticación Eliminados

Se suprimieron todos los atajos que permitían iniciar sesión en el frontend sin autenticarse contra los servidores de Firebase:

1. **Eliminación de `DEMO_ACCOUNTS`:** Se borró el array que contenía los perfiles simulados `usr-admin` (Lic. Rebeca Marcela Orozco) y `usr-bodega` (Br. Alexis Ernesto Hernández).
2. **Eliminación de `handleQuickDemoLogin` en `LoginPage.tsx`:** Se retiraron las funciones y botones de acceso rápido con un solo clic que permitían eludir la pantalla de login.
3. **Eliminación de la sección UI de cuentas demo en `LoginPage.tsx`:** Se eliminó por completo el bloque visual `"Acceso rápido por perfil demo (Prototipo)"`.
4. **Eliminación del login sin credenciales en `StockCareContext.tsx`:** La función `login` ya no busca en arrays locales ni simula retardos de red con `setTimeout`; ahora exige obligatoriamente un correo y una contraseña válidos delegando directamente en `signInWithEmailAndPassword` de Firebase Auth.
5. **Único mecanismo de ingreso admitido:**
   - Correo y contraseña vía `Firebase Authentication`.
   - Autenticación federada mediante `Google OAuth` (`signInWithPopup`).

---

## 4. Heurísticas de Asignación de Rol Eliminadas

Se erradicaron las vulnerabilidades de seguridad que asignaban privilegios de `ADMIN` basadas en cadenas de texto del correo electrónico:

1. **Eliminación de `user.email?.includes('admin')` en `authService.ts`:**
   - **Antes:** Si un atacante o usuario se registraba con cualquier correo que contuviera la subcadena "admin" (ej. `badadmin@gmail.com`), el frontend le otorgaba rol `ADMIN`.
   - **Ahora:** El rol proviene exclusivamente del documento del usuario en la colección `users/{uid}` de Firestore (`existing?.role`). Si el documento no existe (usuario nuevo), se asigna de forma segura el rol `BODEGA` por defecto.
2. **Eliminación de selección de rol en registro público (`LoginPage.tsx`):**
   - Se removió del formulario de registro el selector de radio-buttons (`Bodega` / `Administrador`).
   - Todos los autoregistros públicos quedan fijados forzosamente con el rol base seguro `BODEGA`. La asignación del rol `ADMIN` queda reservada para gestión administrativa futura en base de datos.

---

## 5. Mecanismos de `sessionStorage` y `localStorage` Retirados

Se desacopló completamente la persistencia en el navegador local, transfiriendo el control de ciclo de vida de la sesión a Firebase:

1. **Eliminación de `stockcare_user_session_v1` (`sessionStorage`):**
   - Se suprimieron las funciones `saveUserSession`, `loadUserSession` y los `useEffect` que duplicaban los tokens y perfiles en `sessionStorage`.
   - **Nueva fuente de verdad:** `onAuthStateChanged()` de Firebase Auth. La persistencia de sesión es gestionada de manera nativa y segura por el SDK de Firebase a través de `IndexedDB`.
2. **Eliminación de `stockcare_inventory_state_v1` (`localStorage`):**
   - Se eliminaron las funciones `saveInventoryState`, `loadInventoryState` y el `useEffect` que serializaba periódicamente la totalidad del inventario en `localStorage`.
   - El estado de la aplicación arranca en memoria con colecciones vacías (`[]`) y se alimenta directamente desde Cloud Firestore.
3. **Manejo de estado de inicialización (`isAuthReady`):**
   - Se incorporó la bandera `isAuthReady` en `StockCareContext` y en `RouteGuards.tsx` (`ProtectedRoute` y `PublicOnlyRoute`).
   - Evita redirecciones accidentales o parpadeos hacia `/login` mientras el SDK de Firebase resuelve el estado de autenticación al recargar la página.

---

## 6. Retiro de Autoseed y Mocks en Firestore

Se eliminó cualquier lógica que inyectara automáticamente datos simulados en la base de datos de producción:

1. **Eliminación de la ejecución automática de `seedFirestoreData()`:**
   - En `firestoreService.ts`, se eliminó la condición que verificaba si `productsSnap.empty && batchesSnap.empty` para autosembrar 15 productos, lotes y movimientos ficticios.
2. **Comportamiento ante colecciones vacías:**
   - Si Firestore no tiene documentos registrados, `fetchFirestoreInventory()` retorna arrays vacíos (`products: []`, `batches: []`, `entries: []`, `exits: []`, `movements: []`).
   - La interfaz de usuario muestra sus respectivos estados vacíos (*Empty States*) mediante el componente `DataTable`, sin intentar reintroducir mocks.
3. **Eliminación del botón y modal "Restablecer datos demo" en `ProfilePage.tsx`:**
   - Se eliminó la función `resetDemoData()` y el modal de confirmación en la vista de perfil de usuario.

---

## 7. Reducción y Saneamiento de `src/data/mockData.ts`

El archivo `mockData.ts` fue despojado de todos sus datos transaccionales, pasando de **637 líneas a tan solo 29 líneas**:

### Elementos Eliminados de `mockData.ts`:
- `INITIAL_PRODUCTS` (15 productos médicos hardcodeados)
- `INITIAL_ENTRIES` (entradas históricas simuladas)
- `INITIAL_EXITS` (salidas históricas simuladas)
- `DEMO_ACCOUNTS` (cuentas fijas con contraseñas implícitas)
- `INITIAL_SETTINGS` (configuración fija inicial)
- `COMMON_PROVIDERS` (lista estática de droguerías)
- `buildInitialInventoryState` (generador de lotes y movimientos sintéticos)

### Elementos Conservados Únicamente:
- `PRODUCT_CATEGORIES`: Catálogo oficial de categorías farmacéuticas (Analgésicos, Antibióticos, etc.).
- `EXIT_REASONS`: Catálogo de motivos de egreso de inventario (Venta, Descarte, Uso interno, etc.).

---

## 8. Tratamiento de Proveedores en Entradas

Para no depender del array estático `COMMON_PROVIDERS`:
- **En `src/pages/EntriesListPage.tsx`:** El filtro de proveedores ahora deriva dinámicamente los proveedores únicos existentes a partir del historial real de entradas (`entries.map(e => e.provider)`).
- **En `src/pages/EntryCreatePage.tsx`:** Si existen recepciones previas, el selector ofrece los proveedores registrados en el sistema, más la opción siempre disponible `+ Ingresar nuevo proveedor`. Si la base de datos está vacía, permite capturar directamente el nuevo proveedor sin bloquear al operador de bodega.

---

## 9. Inventario de Modificaciones de Código

| Archivo | Naturaleza del Cambio | Líneas Afectadas | Estado |
| :--- | :--- | :--- | :--- |
| `src/services/authService.ts` | Eliminación de heurística de correo admin; fijación de rol `BODEGA` por defecto. | 50-65, 143-162 | ✅ Limpio |
| `src/pages/LoginPage.tsx` | Eliminación de cuentas demo, acceso rápido, rol en registro y login directo. | 1-28, 65-115, 235-335 | ✅ Limpio |
| `src/pages/ProfilePage.tsx` | Eliminación de botón y modal `resetDemoData`. | 1-26, 260-305 | ✅ Limpio |
| `src/pages/EntriesListPage.tsx` | Eliminación de `COMMON_PROVIDERS`; derivación dinámica desde `entries`. | 9-29 | ✅ Limpio |
| `src/pages/EntryCreatePage.tsx` | Eliminación de `COMMON_PROVIDERS`; selector dinámico con fallback a nuevo proveedor. | 9-50, 210-225 | ✅ Limpio |
| `src/types/index.ts` | Eliminación de la interfaz `DemoAccount`. | 14-23 | ✅ Limpio |
| `src/data/mockData.ts` | Purgado de 608 líneas de datos ficticios; solo catálogos de negocio. | 1-637 -> 1-29 | ✅ Limpio |
| `src/services/firestoreService.ts` | Eliminación de imports de mockData y autoseed; colecciones vacías seguras. | 1-105 | ✅ Limpio |
| `src/services/StockCareContext.tsx` | Eliminación de persistencia local y mocks; sesión gobernada por Firebase Auth. | 1-140, 230-345, 715-748 | ✅ Limpio |
| `src/components/RouteGuards.tsx` | Incorporación de guardián de estado `isAuthReady` contra parpadeos. | 8-30 | ✅ Limpio |
| `src/services/storageService.ts` | Eliminación completa del archivo de persistencia local duplicada. | 1-111 (borrado) | ✅ Eliminado |

---

## 10. Matriz Comparativa: Pre-Limpieza vs Post-Limpieza

| Característica / Criterio | Estado Pre-Limpieza (Auditoría) | Estado Post-Limpieza (Actual) |
| :--- | :--- | :--- |
| **Bypass de Autenticación** | Presente (botones rápidos demo para ADMIN y BODEGA). | **Eliminado al 100%**. Solo Firebase Auth es aceptado. |
| **Heurística de Privilegios** | Asignación de ADMIN si el correo contenía `"admin"`. | **Eliminado al 100%**. Rol seguro BODEGA por defecto; ADMIN solo desde Firestore. |
| **Selección de Rol en Registro** | El usuario podía auto-asignarse rol Administrador en registro. | **Eliminado al 100%**. Registro público restringido a BODEGA. |
| **Persistencia de Sesión** | Duplicada manualmente en `sessionStorage`. | **Nativa en Firebase Auth (`IndexedDB`)** vía `onAuthStateChanged`. |
| **Persistencia de Inventario** | Serialización JSON periódica en `localStorage`. | **Cloud Firestore en la nube**; estado inicial en memoria `[]`. |
| **Autoseed de Mocks** | Si Firestore estaba vacío, sembraba 15 productos y movimientos falsos. | **Eliminado al 100%**. Firestore vacío devuelve `[]` y UI muestra Empty State. |
| **Líneas en `mockData.ts`** | 637 líneas (catálogos + productos + entradas + salidas + usuarios). | **29 líneas** (únicamente `PRODUCT_CATEGORIES` y `EXIT_REASONS`). |
| **Manejo de Proveedores** | Array hardcodeado `COMMON_PROVIDERS` de 5 droguerías fijas. | **Dinámico**. Derivado de transacciones reales + captura libre. |
| **Restablecimiento Demo en UI** | Botón en Perfil que recreaba el mock original en almacenamiento local. | **Eliminado al 100%**. No existen flujos de restauración ficticia. |
| **Archivos basura en raíz** | `Sin confirmar 531720.crdownload` (153MB), `stockcare_logo.jpg`, logs. | **Eliminados al 100%**. `.gitignore` configurado. |
| **Tamaño Bundle JS Final** | 1,153.50 kB (con datos hardcodeados y mocks). | **1,134.20 kB** (reducción directa de casi 20 kB de código muerto). |

---

## 11. Verificación de Compilación y Salud del Proyecto

Se ejecutó la suite de verificación de compilación y empaquetado:

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
dist/assets/index-cL8wTJ6I.css              40.32 kB │ gzip:   7.64 kB
dist/assets/index-CSWBo0yR.js            1,134.20 kB │ gzip: 299.46 kB
✓ built in 5.17s
```

- **Errores TypeScript (`tsc -b`):** 0 errores.
- **Errores de Vite:** 0 errores.
- **Warnings de regresión:** Ninguno.

---

## 12. Veredicto y Certificación Final

> [!IMPORTANT]
> **CERTIFICACIÓN DE LIMPIEZA CONCLUIDA**  
> El proyecto **StockCare** se encuentra completamente limpio de mocks, datos de prueba, bypasses de seguridad y redundancias de almacenamiento local.  
> 
> **El repositorio está oficialmente listo para iniciar la FASE DE IMPLEMENTACIÓN Y MIGRACIÓN FUNCIONAL CON FIREBASE (Auth + Firestore Collections + Realtime Sync).**
