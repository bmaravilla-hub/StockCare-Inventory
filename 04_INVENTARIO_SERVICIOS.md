# 04 — INVENTARIO Y AUDITORÍA DE SERVICIOS

**Proyecto:** StockCare — Sistema de Gestión y Control de Inventario para Farmacia  
**Materia:** Análisis y Diseño de Sistemas (ADS) — Universidad Don Bosco  
**Fecha de Auditoría:** 26 de Noviembre de 2026  
**Archivos Auditados:**
- `src/services/firebase.ts`
- `src/services/authService.ts`
- `src/services/firestoreService.ts`
- `src/services/storageService.ts`
- `src/services/StockCareContext.tsx`

---

## 1. Servicio: `firebase.ts`

### Responsabilidad
Inicializar la instancia global de Firebase App y exportar los clientes de Firebase Authentication, Cloud Firestore y Google Auth Provider.

### Componentes y Constantes Exportadas

| Elemento | Tipo | Descripción | Consumidores |
| :--- | :--- | :--- | :--- |
| `firebaseConfig` | Objeto de configuración | Lee variables de entorno `VITE_FIREBASE_*` con valores de fallback para authDomain y projectId. | Inicialización de Firebase |
| `isFirebaseConfigured` | Booleano | Evalúa si `apiKey` y `projectId` no están vacíos. | `authService.ts`, `firestoreService.ts`, `StockCareContext.tsx` |
| `app` | `FirebaseApp` | Instancia singleton de Firebase obtenida mediante `getApps().length ? getApp() : initializeApp(firebaseConfig)`. | Clientes de Auth y Firestore |
| `auth` | `Auth` | Instancia del cliente de autenticación (`getAuth(app)`). | `authService.ts` |
| `db` | `Firestore` | Instancia del cliente de Cloud Firestore (`getFirestore(app)`). | `authService.ts`, `firestoreService.ts` |
| `googleProvider` | `GoogleAuthProvider` | Proveedor OAuth configurado con `prompt: 'select_account'`. | `authService.ts` |

---

## 2. Servicio: `authService.ts`

### Responsabilidad
Administración del ciclo de vida de autenticación de usuarios mediante Firebase Authentication y sincronización del perfil del usuario en la colección `users` de Cloud Firestore.

### Funciones Auditadas

#### 2.1 `roleToLabel(role: UserRole): string`
- **Parámetros:** `role: UserRole` ('ADMIN' | 'BODEGA').
- **Retorno:** `string` ('Administrador del Sistema' | 'Encargado de Bodega').
- **Dónde se utiliza:** `authService.ts` (línea 62).
- **Fuente de datos:** Lógica de mapeo local.
- **Estado:** **En uso**.
- **Equivalente Firebase:** N/A (Función de presentación en cliente).

#### 2.2 `getUserProfile(uid: string): Promise<UserProfileData | null>`
- **Parámetros:** `uid: string` (identificador único de Firebase Auth).
- **Retorno:** `Promise<UserProfileData | null>`.
- **Dónde se utiliza:** `authService.ts` (línea 54).
- **Fuente de datos:** Documento `users/{uid}` en Cloud Firestore.
- **Errores manejados:** Captura excepciones con `try/catch` y emite `console.warn`; retorna `null` ante fallos o si Firebase no está configurado.
- **Estado:** **Funcional y persistente**.
- **Dependencias:** `getDoc`, `doc`, `db`, `isFirebaseConfigured`.
- **Equivalente Firebase:** Lectura directa del documento de usuario en Firestore.

#### 2.3 `createOrUpdateUserProfile(user: User, customData?): Promise<UserSession>`
- **Parámetros:** 
  - `user: User` (objeto usuario de Firebase Auth).
  - `customData?: { fullName?: string; role?: UserRole; branch?: string }`.
- **Retorno:** `Promise<UserSession>`.
- **Dónde se utiliza:** Invocado tras `loginWithEmail`, `registerWithEmail`, `loginWithGoogle`, `getRedirectResult` y `onAuthStateChanged`.
- **Fuente de datos:** Consulta previa con `getUserProfile`, campos nativos del objeto `User` de Firebase Auth y persistencia mediante `setDoc(..., { merge: true })`.
- **Regla de asignación de rol en código:**
  ```typescript
  const role: UserRole =
    customData?.role ||
    existing?.role ||
    (user.email?.includes('admin') ? 'ADMIN' : 'BODEGA');
  ```
  *(Nota crítica: Existe una heurística que asigna rol ADMIN si el email contiene "admin", de lo contrario asigna BODEGA).*
- **Errores manejados:** `try/catch` silencioso con `console.warn` para no bloquear el login si Firestore rechaza la escritura por reglas o cuota.
- **Estado:** **Funcional con Firestore**.
- **Dependencias:** `setDoc`, `serverTimestamp`, `doc`.

#### 2.4 `loginWithEmail(email: string, pass: string): Promise<{ ok: boolean; user?: UserSession; error?: string }>`
- **Parámetros:** `email: string`, `pass: string`.
- **Retorno:** Objeto de resultado con indicador booleano `ok`, sesión activa o mensaje descriptivo de error.
- **Dónde se utiliza:** `StockCareContext.tsx` (`loginWithEmailAction`), `LoginPage.tsx`.
- **Fuente de datos:** `signInWithEmailAndPassword(auth, email.trim(), pass)`.
- **Códigos de error de Firebase Auth manejados:**
  - `auth/invalid-credential`, `auth/user-not-found`, `auth/wrong-password` -> "Credenciales inválidas. Compruebe el correo y la contraseña ingresados."
  - `auth/invalid-email` -> "El formato del correo electrónico es inválido."
  - `auth/too-many-requests` -> "Demasiados intentos fallidos. Intente de nuevo más tarde."
- **Estado:** **100% Funcional con Firebase Auth**.
- **Dependencias:** `signInWithEmailAndPassword`, `auth`, `isFirebaseConfigured`.

#### 2.5 `registerWithEmail(email, pass, fullName, role?): Promise<{ ok: boolean; user?: UserSession; error?: string }>`
- **Parámetros:** `email: string`, `pass: string`, `fullName: string`, `role: UserRole = 'BODEGA'`.
- **Retorno:** Objeto de resultado con sesión inicializada o error.
- **Dónde se utiliza:** `StockCareContext.tsx` (`registerWithEmailAction`), `LoginPage.tsx`.
- **Fuente de datos:** `createUserWithEmailAndPassword(auth, email.trim(), pass)`.
- **Códigos de error de Firebase Auth manejados:**
  - `auth/email-already-in-use` -> "El correo electrónico ya se encuentra registrado."
  - `auth/weak-password` -> "La contraseña debe tener al menos 6 caracteres."
  - `auth/invalid-email` -> "El correo electrónico no tiene un formato válido."
- **Estado:** **100% Funcional con Firebase Auth**.
- **Dependencias:** `createUserWithEmailAndPassword`, `createOrUpdateUserProfile`.

#### 2.6 `loginWithGoogle(): Promise<{ ok: boolean; user?: UserSession; error?: string }>`
- **Parámetros:** Ninguno.
- **Retorno:** Objeto de resultado con sesión del usuario o error detallado.
- **Dónde se utiliza:** `StockCareContext.tsx` (`loginWithGoogleAction`), `LoginPage.tsx` (`handleGoogleLogin`).
- **Fuente de datos:** `signInWithPopup(auth, googleProvider)`.
- **Códigos de error de Firebase Auth manejados:**
  - `auth/popup-closed-by-user` -> "Se cerró la ventana emergente de Google antes de completar el inicio de sesión."
  - `auth/unauthorized-domain` -> Mensaje instruyendo acceder por `http://localhost:5173` o autorizar el hostname en Firebase Console > Authentication > Settings > Authorized Domains.
  - `auth/popup-blocked` -> Notificación para habilitar popups en el navegador.
  - `auth/cancelled-popup-request` -> "Ya hay una ventana emergente de autenticación en curso."
  - `auth/network-request-failed` -> Fallo de conectividad a servidores de Google.
  - `auth/operation-not-allowed` -> Proveedor de Google no habilitado en la consola.
- **Estado:** **Funcional con Firebase Auth** (Sujeto a dominios autorizados de Google Cloud).
- **Dependencias:** `signInWithPopup`, `googleProvider`.

#### 2.7 `loginWithGoogleRedirect(): Promise<void>`
- **Parámetros:** Ninguno.
- **Retorno:** `Promise<void>`.
- **Dónde se utiliza:** Función auxiliar provista para dispositivos móviles o entornos donde las ventanas emergentes estén bloqueadas.
- **Fuente de datos:** `signInWithRedirect(auth, googleProvider)`.
- **Estado:** **Implementada / En reserva**.
- **Dependencias:** `signInWithRedirect`.

#### 2.8 `logoutUser(): Promise<void>`
- **Parámetros:** Ninguno.
- **Retorno:** `Promise<void>`.
- **Dónde se utiliza:** `StockCareContext.tsx` (`logout`).
- **Fuente de datos:** `signOut(auth)`.
- **Estado:** **Funcional**.
- **Dependencias:** `signOut`, `auth`.

#### 2.9 `subscribeToAuthChanges(onUserChanged): () => void`
- **Parámetros:** `onUserChanged: (session: UserSession | null) => void`.
- **Retorno:** Función de desuscripción (`unsubscribe`).
- **Dónde se utiliza:** `StockCareContext.tsx` (en `useEffect` raíz al montar el provider).
- **Fuente de datos:** `onAuthStateChanged(auth)` y `getRedirectResult(auth)`.
- **Estado:** **100% Funcional con Firebase Auth**.
- **Dependencias:** `onAuthStateChanged`, `getRedirectResult`.

---

## 3. Servicio: `firestoreService.ts`

### Responsabilidad
Sincronizar de forma bidireccional los datos maestros y operativos de inventario entre la aplicación y las colecciones de Cloud Firestore.

### Funciones Auditadas

| Función | Parámetros | Retorno | Fuente de datos | Colección Firestore | Estado | Observaciones |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `fetchFirestoreInventory` | Ninguno | `Promise<{ products, batches, entries, exits, movements, settings } \| null>` | `getDocs` en paralelo de 5 colecciones y 1 documento | `products`, `batches`, `entries`, `exits`, `movements`, `settings/system` | **Parcial / Híbrido** | Si Firestore está completamente vacío, ejecuta automáticamente `seedFirestoreData()` para sembrar el estado inicial. |
| `seedFirestoreData` | Ninguno | `Promise<void>` | `writeBatch(db)` con datos de `mockData.ts` | 6 colecciones | **Funcional** | Realiza una escritura atómica de todos los productos iniciales, lotes, entradas, salidas y movimientos. |
| `persistProduct` | `product: Product` | `Promise<void>` | `setDoc(doc(db, 'products', product.id), product)` | `products/{id}` | **Funcional** | Se ejecuta asíncronamente en segundo plano tras crear o editar en `StockCareContext`. |
| `persistBatch` | `item: Batch` | `Promise<void>` | `setDoc(doc(db, 'batches', item.id), item)` | `batches/{id}` | **Funcional** | Guarda o actualiza un lote individual cuando se registra entrada o salida. |
| `persistEntry` | `entry: EntryRecord` | `Promise<void>` | `setDoc(doc(db, 'entries', entry.id), entry)` | `entries/{id}` | **Funcional** | Registra el encabezado y detalle de la recepción de mercadería. |
| `persistExit` | `exit: ExitRecord` | `Promise<void>` | `setDoc(doc(db, 'exits', exit.id), exit)` | `exits/{id}` | **Funcional** | Almacena el comprobante de salida. |
| `persistMovement`| `movement: MovementRecord` | `Promise<void>` | `setDoc(doc(db, 'movements', movement.id), movement)` | `movements/{id}` | **Funcional** | Almacena el renglón del kardex con saldo resultante. |
| `persistSettings`| `settings: SystemSettings` | `Promise<void>` | `setDoc(doc(db, 'settings', 'system'), settings)` | `settings/system` | **Funcional** | Guarda la configuración institucional y días de alerta. |

---

## 4. Servicio: `storageService.ts`

### Responsabilidad
Persistencia local sincrónica en el navegador mediante las APIs de `localStorage` y `sessionStorage`. Actúa como motor de persistencia del prototipo offline y fallback de inicio rápido.

### Constantes de Clave de Almacenamiento
- `DATA_STORAGE_KEY`: `'stockcare_inventory_state_v1'` (`localStorage`).
- `SESSION_STORAGE_KEY`: `'stockcare_user_session_v1'` (`sessionStorage`).

### Funciones Auditadas

| Función | Parámetros | Retorno | Almacén | Estado | Riesgo / Observación |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `getInitialPersistedState` | Ninguno | `PersistedInventoryState` | Memoria | **Mock** | Retorna la semilla de `mockData.ts` ejecutando `buildInitialInventoryState()`. |
| `loadInventoryState` | Ninguno | `PersistedInventoryState` | `localStorage` | **En uso** | Lee y parsea JSON. Si no existe o está corrupto, retorna `getInitialPersistedState()`. |
| `saveInventoryState` | `state: PersistedInventoryState` | `void` | `localStorage` | **En uso** | Serializa todo el estado del inventario en un único string JSON. |
| `clearInventoryState` | Ninguno | `PersistedInventoryState` | `localStorage` | **En uso** | Borra la clave y reinstala los datos iniciales de prueba. |
| `loadUserSession` | Ninguno | `UserSession \| null` | `sessionStorage` | **En uso** | Restaura la sesión del usuario al recargar la pestaña. |
| `saveUserSession` | `session: UserSession \| null` | `void` | `sessionStorage` | **En uso** | Guarda o remueve la sesión en la pestaña actual. |

---

## 5. Auditoría Crítica de la Transición a Firebase en `authService.ts`

1. **Estado de Integración con Firebase Authentication:**
   - La integración con Firebase Auth está implementada y funcional a nivel de código (`signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `signInWithPopup`, `signOut`, `onAuthStateChanged`).
2. **Duplicidad Detectada (Código Demo vs Firebase Auth):**
   - En `StockCareContext.tsx:234` la función `login` mantiene un desvío: si el usuario ingresado no contiene `@` o se usa un botón de acceso rápido demo, busca en el array `DEMO_ACCOUNTS` y genera una sesión simulada en `sessionStorage` sin interactuar con Firebase Auth.
   - Si el input contiene `@` y Firebase está configurado, invoca a `loginWithEmailAction` (Firebase Auth real).
3. **Persistencia Híbrida de Sesión:**
   - Si el usuario inicia sesión con Firebase Auth, el listener `onAuthStateChanged` captura el evento, crea/actualiza el documento en `users/{uid}` y actualiza `session` en React, pero simultáneamente guarda la sesión en `sessionStorage` (`stockcare_user_session_v1`).
4. **Problema de Autorización de Dominios (Google Sign-In):**
   - El código ya incluye un manejo exhaustivo de excepciones para el error `auth/unauthorized-domain`. Este error ocurre cuando la aplicación se ejecuta en una URL o puerto que no ha sido agregado expresamente en la consola de Firebase (`https://console.firebase.google.com/project/stockcare-e000b/authentication/settings`).
5. **Inconsistencia de Permisos en Documentos de Usuario:**
   - En `authService.ts:60`, la regla `(user.email?.includes('admin') ? 'ADMIN' : 'BODEGA')` es vulnerable y temporal. En un entorno de producción, los roles deben ser asignados explícitamente por un Administrador y verificados mediante Custom Claims en el token JWT o consultando el documento protegido de Firestore.
