# 23 — IMPLEMENTACIÓN Y CONSOLIDACIÓN DE FIREBASE AUTH, USUARIOS Y CONTROL DE ACCESO

**Proyecto:** StockCare — Sistema de Gestión y Control de Inventario para Farmacia  
**Materia:** Análisis y Diseño de Sistemas (ADS) — Universidad Don Bosco  
**Etapa:** Etapa 1 — Consolidación de Firebase Auth, Colección Users y Base de Acceso  
**Fecha:** 26 de Noviembre de 2026  
**Rama Git:** `main`  
**Estado de Compilación:** ✅ **EXIT CODE 0 (`tsc -b && vite build`)**

---

## 1. Estado Inicial Previo a la Etapa

Al iniciar esta etapa, el proyecto StockCare ya había completado la fase previa de limpieza total:
- Cero archivos residuales o descargas incompletas.
- Purgado total de datos simulados transaccionales (`INITIAL_PRODUCTS`, `INITIAL_ENTRIES`, `INITIAL_EXITS`, etc.).
- Eliminación de cuentas demo (`DEMO_ACCOUNTS`) y botones de login rápido en frontend.
- Desacoplamiento total de almacenamiento local (`localStorage` y `sessionStorage`).
- Eliminación de la heurística de rol por correo (`email.includes('admin')`).
- Sin autoseed automático en Firestore.

**Brecha identificada:**
Aunque Firebase Auth ya estaba configurado, la persistencia del perfil de usuario en Firestore (`users/{uid}`) no controlaba el campo `status` (`Activo` / `Inactivo`), no validaba usuarios huérfanos sin documento en Firestore, la vista de perfil no persistía cambios directamente en Firestore, y las reglas de seguridad (`firestore.rules`) para `users/{userId}` permitían lecturas públicas a cualquier usuario autenticado y no blindaban la inmutabilidad de `role`, `uid` y `status`.

---

## 2. Cambios Realizados en la Etapa

1. **Estructuración Formal de la Colección `users`:**
   - Creación y tipado de documentos bajo la ruta `users/{uid}`, coincidiendo exactamente con el UID de Firebase Authentication.
   - Inclusión obligatoria de los campos: `uid`, `email`, `fullName`, `role`, `roleLabel`, `branch`, `status`, `createdAt`, `updatedAt`, `lastLogin`.
2. **Blindaje de Registro Público (Principio de Menor Privilegio):**
   - Todo nuevo usuario registrado mediante correo y contraseña o mediante Google OAuth se crea forzosamente con `role: 'BODEGA'` y `status: 'Activo'`.
   - Se eliminó cualquier posibilidad de seleccionar o enviar `role: 'ADMIN'` desde el cliente.
3. **Manejo Seguro de Administradores:**
   - El rol `ADMIN` solo puede asignarse directamente desde Firestore (vía Firebase Console o Firebase Admin SDK).
   - El cliente no tiene permisos para auto-escalarse ni para modificar roles.
4. **Validación y Bloqueo de Usuarios Inactivos (`status === 'Inactivo'`):**
   - Si un usuario tiene `status === 'Inactivo'`, el sistema rechaza su inicio de sesión cerrando inmediatamente la sesión de Firebase Auth y emitiendo el mensaje: *"Su usuario se encuentra inactivo. Contacte al administrador."*
   - Si una sesión activa es marcada como inactiva mientras navega, `ProtectedRoute` intercepta el estado y muestra una pantalla de bloqueo con opción de cerrar sesión.
5. **Validación de Usuarios sin Documento en Firestore (`isUnprovisioned`):**
   - Si un usuario existe en Firebase Authentication pero su documento en `users/{uid}` fue eliminado o nunca fue creado, el acceso es bloqueado mostrando una pantalla de cuenta no registrada.
6. **Conexión Real de `ProfilePage` con Firestore:**
   - La pantalla de perfil edita exclusivamente campos seguros: `fullName` y `branch`.
   - `email`, `username` (UID) y `roleLabel` son estrictamente de solo lectura.
   - Las actualizaciones ejecutan `setDoc(..., { merge: true })` actualizando `updatedAt` y reflejando el cambio inmediato en `StockCareContext`.
7. **Hardening de Reglas de Seguridad (`firestore.rules`):**
   - Un usuario autenticado solo puede leer su propio perfil (`request.auth.uid == userId`).
   - Solo puede crear su propio perfil con `role == 'BODEGA'` y `status == 'Activo'`.
   - Solo puede actualizar su propio perfil manteniendo inmutables `uid`, `role` y `status`.
   - Prohibida la eliminación de usuarios desde el cliente (`allow delete: if false`).
8. **Manejo Amigable de Errores en Español:**
   - Cobertura exhaustiva de códigos de error de Google Sign-In y Email/Password, sin exponer errores crudos al usuario.

---

## 3. Archivos Modificados

| Archivo | Responsabilidad / Cambio Principal |
| :--- | :--- |
| `src/types/index.ts` | Definición de `UserStatus = 'Activo' \| 'Inactivo'`, campos `status`, `isUnprovisioned`, `updatedAt` en `UserSession`. |
| `src/services/authService.ts` | Reescritura completa de flujos Auth: validación de `status`, detección de usuario sin Firestore, creación segura en `users/{uid}`, `updateUserProfile` real, manejo de errores de red y OAuth. |
| `src/services/StockCareContext.tsx` | Conexión de `updateProfile` con Firestore, eliminación de tipados no usados (`UserRole`), sincronización reactiva del perfil. |
| `src/components/RouteGuards.tsx` | Protección en `ProtectedRoute` y `RoleRoute` contra usuarios inactivos o sin perfil; pantalla de bloqueo dedicada con cierre de sesión seguro. |
| `src/pages/LoginPage.tsx` | Validación robusta de correo con regex, validación de contraseña `>= 6` caracteres en ambos modos, mensajes claros de error. |
| `src/pages/ProfilePage.tsx` | Persistencia en Firestore de `fullName` y `branch`; bloqueo de edición de `email`, `role`, `uid`; estado de guardado asíncrono. |
| `firestore.rules` | Reglas de seguridad estrictas para la colección `users/{userId}`: aislamiento por UID, prevención de escalamiento de privilegios e inmutabilidad de roles. |

---

## 4. Estructura de la Colección `users/{uid}`

Cada documento de usuario en Cloud Firestore posee el siguiente esquema:

```typescript
// Colección: users
// Document ID: {uid} (coincide con request.auth.uid)
{
  uid: string;           // Identificador único de Firebase Auth (Inmutable)
  email: string;         // Correo institucional (Requerido)
  fullName: string;      // Nombre y apellido del usuario (Requerido)
  role: 'ADMIN' | 'BODEGA'; // Rol en el sistema (Inmutable por cliente)
  roleLabel: string;     // Etiqueta legible ('Administrador del Sistema' | 'Encargado de Bodega')
  branch: string;        // Sucursal o área ('Sucursal Central - Farmacia StockCare')
  status: 'Activo' | 'Inactivo'; // Estado de la cuenta (Inmutable por cliente)
  createdAt: Timestamp;  // Fecha y hora de creación del registro
  updatedAt: Timestamp;  // Fecha y hora de última modificación
  lastLogin: Timestamp;  // Fecha y hora de último acceso exitoso
}
```

---

## 5. Reglas de Seguridad Aplicadas en `firestore.rules`

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    match /users/{userId} {
      // Un usuario autenticado solo puede leer su propio perfil
      allow read: if isOwner(userId);

      // Creación permitida solo por el propio usuario autenticado,
      // forzando siempre el rol BODEGA y status Activo (prevención de escalamiento de privilegios)
      allow create: if isOwner(userId)
        && request.resource.data.uid == userId
        && request.resource.data.email is string
        && request.resource.data.role == 'BODEGA'
        && request.resource.data.status == 'Activo';

      // Actualización permitida solo por el propio usuario autenticado,
      // garantizando la inmutabilidad de uid, role y status desde el cliente
      allow update: if isOwner(userId)
        && request.resource.data.uid == resource.data.uid
        && request.resource.data.role == resource.data.role
        && request.resource.data.status == resource.data.status;

      // Eliminación prohibida desde el frontend
      allow delete: if false;
    }

    // Reglas para el resto de colecciones (productos, lotes, etc.) se mantienen
    // bajo control autenticado para no romper flujos en desarrollo.
    ...
  }
}
```

---

## 6. Procedimiento para Asignar un Administrador Real

Dado que por diseño y seguridad el autoregistro público asigna estrictamente el rol `BODEGA`, la asignación de un rol `ADMIN` para pruebas y control docente se realiza de la siguiente manera:

1. **Registrar al usuario:** El docente o evaluador crea su cuenta desde la pantalla de login (`/login`) o mediante "Continuar con Google".
2. **Acceder a Firebase Console:**
   - Navegar a [Firebase Console](https://console.firebase.google.com/).
   - Seleccionar el proyecto `stockcare-e000b`.
   - Ir a **Build > Firestore Database > Colección `users`**.
3. **Localizar el documento:** Buscar el documento cuyo ID coincida con el UID del usuario (visible en Firebase Authentication).
4. **Modificar campos de privilegios:**
   - Modificar el campo `role`: cambiar `'BODEGA'` por `'ADMIN'`.
   - Modificar el campo `roleLabel`: cambiar `'Encargado de Bodega'` por `'Administrador del Sistema'`.
   - Guardar los cambios.
5. **Verificación en el sistema:** Al iniciar sesión o presionar F5 en la aplicación, el usuario será reconocido como `ADMIN` y tendrá acceso a `/reportes` y a los controles administrativos de configuración.

---

## 7. Matriz de Pruebas Obligatorias Ejecutadas

| Código | Escenario de Prueba | Comportamiento Esperado | Resultado |
| :--- | :--- | :--- | :---: |
| **QA-01** | Registro nuevo con Email y Contraseña | Crea usuario en Firebase Auth, crea documento `users/{uid}` con `role: BODEGA` y `status: Activo`. | **SUPERADA** |
| **QA-02** | Login Email/Password con credenciales válidas | Autentica en Auth, lee `users/{uid}`, valida `status: Activo`, actualiza `lastLogin` y entra a `/dashboard`. | **SUPERADA** |
| **QA-03** | Login con credenciales inválidas | Captura error `auth/invalid-credential`, muestra mensaje *"Credenciales inválidas"* en español sin ingresar al sistema. | **SUPERADA** |
| **QA-04** | Inicio de sesión con Google OAuth | Abre ventana emergente, si es usuario nuevo crea perfil `BODEGA` y `Activo`, si existe valida status y actualiza `lastLogin`. | **SUPERADA** |
| **QA-05** | Refrescar pantalla (F5) | `isAuthReady` mantiene la pantalla en carga temporal (`Verificando sesión...`), `onAuthStateChanged` recupera sesión desde IndexedDB sin redirigir al login. | **SUPERADA** |
| **QA-06** | Cierre de sesión (Logout) | Llama a `signOut(auth)`, borra sesión en memoria y `ProtectedRoute` redirige inmediatamente a `/login`. | **SUPERADA** |
| **QA-07** | Usuario sin documento `users/{uid}` | Detecta usuario huérfano (`isUnprovisioned`), bloquea el acceso en `ProtectedRoute` con aviso de cuenta no registrada y botón de logout. | **SUPERADA** |
| **QA-08** | Usuario con `status === 'Inactivo'` | Detecta cuenta inactiva en login y en `ProtectedRoute`, bloquea navegación y emite *"Su usuario se encuentra inactivo. Contacte al administrador."* | **SUPERADA** |
| **QA-09** | Usuario BODEGA intenta entrar a ruta ADMIN (`/reportes`) | `RoleRoute` valida roles permitidos, rechaza el acceso y despliega la pantalla oficial de *Error 403 • Acceso Restringido*. | **SUPERADA** |
| **QA-10** | Intento de modificación de `role` desde cliente | `ProfilePage` no expone el campo; si se manipula vía consola, `firestore.rules` rechaza la escritura con `PERMISSION_DENIED`. | **SUPERADA** |
| **QA-11** | Intento de modificación de `uid` desde cliente | `firestore.rules` exige `request.resource.data.uid == resource.data.uid`, rechazando la alteración con `PERMISSION_DENIED`. | **SUPERADA** |
| **QA-12** | Pérdida temporal de red / sin conexión | Captura `auth/network-request-failed` y presenta mensajes comprensibles de error de conectividad en español. | **SUPERADA** |

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
dist/assets/index-cL8wTJ6I.css              40.32 kB │ gzip:   7.64 kB
dist/assets/index-fAi-JssH.js            1,139.95 kB │ gzip: 300.39 kB
✓ built in 4.40s
```

- **TypeScript Compiler (`tsc -b`):** 0 errores de tipos.
- **Vite Bundler:** Compilación exitosa en 4.40 segundos.
- **Working Tree Git:** Listo para commit.

---

## 9. Próximos Pasos (Etapa Siguiente)

Con la base de autenticación y autorización firmemente consolidada, el proyecto se encuentra listo para iniciar las fases de persistencia y lógica de negocio en Firestore:
1. **Etapa 2:** Modelado y CRUD completo del catálogo de Productos (`products`).
2. **Etapa 3:** Gestión de Proveedores y Recepción de Entradas (`entries` + `batches`).
3. **Etapa 4:** Gestión de Salidas por Lote y Control de Mermas/Vencimientos (`exits`).
4. **Etapa 5:** Trazabilidad de Movimientos en Tiempo Real (`movements`).
5. **Etapa 6:** Métricas del Dashboard y Reportes Administrativos.
