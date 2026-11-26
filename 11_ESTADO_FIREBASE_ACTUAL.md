# 11 — ESTADO ACTUAL DE FIREBASE EN STOCKCARE

**Proyecto:** StockCare — Sistema de Gestión y Control de Inventario para Farmacia  
**Materia:** Análisis y Diseño de Sistemas (ADS) — Universidad Don Bosco  
**Fecha de Auditoría:** 26 de Noviembre de 2026  
**Proyecto Firebase:** `stockcare-e000b`  
**Región / Dominio:** `stockcare-e000b.firebaseapp.com`  
**Storage Bucket:** `stockcare-e000b.firebasestorage.app`

---

## 1. Inventario de Productos Firebase

| Producto Firebase | Configurado en Repositorio | Estado Operativo Actual | Archivos Involucrados | Diagnóstico Técnico |
| :--- | :---: | :---: | :--- | :--- |
| **Authentication** | **SÍ** | **Funcional Parcial** | `firebase.ts`, `authService.ts`, `firebase.json` | Email/Password y Registro operativos. Google Sign-In opera con popup pero sensible a dominios autorizados. |
| **Cloud Firestore** | **SÍ** | **Configurado / Híbrido** | `firebase.ts`, `firestoreService.ts`, `firestore.rules` | Reglas de seguridad creadas en local (`firestore.rules`). Funciones de persistencia implementadas pero con fallback local. |
| **Firebase Storage** | **NO** | **No utilizado** | Variable en `.env` (`VITE_FIREBASE_STORAGE_BUCKET`) | No se utiliza el SDK de Storage (`firebase/storage`). No hay carga de imágenes (el logo es local). |
| **Firebase Hosting** | **NO** | **No configurado** | Ausente en `firebase.json` | No hay bloque `"hosting"` en `firebase.json`. Solo se compila con `npm run build` a la carpeta `dist/`. |
| **Cloud Functions** | **NO** | **Inexistente** | Carpeta `.agents/skills` contiene guías, pero no hay código | No hay carpeta `functions/` ni triggers backend. |
| **Remote Config** | **NO** | **Inexistente** | No implementado | Solo presente como guía en habilidades de soporte. |
| **Analytics** | **PARCIAL** | **Pasivo** | Variable `VITE_FIREBASE_MEASUREMENT_ID` | Variable declarada en `.env` pero no se invoca `getAnalytics()` en `firebase.ts`. |

---

## 2. Auditoría de Archivos de Configuración Firebase

### 2.1 Archivo `firebase.json`
El archivo existe en la raíz con el siguiente contenido:
```json
{
  "auth": {
    "providers": {
      "emailPassword": true,
      "googleSignIn": {
        "oAuthBrandDisplayName": "StockCare",
        "supportEmail": "maravillacruz806@gmail.com",
        "authorizedRedirectUris": [
          "https://stockcare-e000b.firebaseapp.com/__/auth/handler",
          "http://localhost",
          "http://127.0.0.1"
        ]
      }
    }
  },
  "firestore": {
    "rules": "firestore.rules"
  }
}
```
**Observaciones:**
- Configura la declaración de Auth y la ruta de `firestore.rules`.
- Carece de sección `"hosting"`. Para desplegar a Firebase Hosting se requerirá agregar:
  ```json
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
  ```

### 2.2 Archivo `.firebaserc`
- **Estado:** **INEXISTENTE**.
- **Impacto:** Si un desarrollador ejecuta comandos CLI como `firebase deploy` o `firebase use`, la herramienta no reconoce automáticamente el proyecto por defecto y solicita seleccionarlo manualmente.
- **Acción requerida para implementación:** Crear `.firebaserc` asociando el target `default: "stockcare-e000b"`.

### 2.3 Variables de Entorno (`.env`)
Las variables necesarias para el SDK web de Firebase están configuradas:
- `VITE_FIREBASE_API_KEY`: Configurado con clave válida de Google Identity Toolkit.
- `VITE_FIREBASE_AUTH_DOMAIN`: `stockcare-e000b.firebaseapp.com`
- `VITE_FIREBASE_PROJECT_ID`: `stockcare-e000b`
- `VITE_FIREBASE_STORAGE_BUCKET`: `stockcare-e000b.firebasestorage.app`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`: Configurado con sender ID numérico.
- `VITE_FIREBASE_APP_ID`: Configurado con identificador web.
- `VITE_FIREBASE_MEASUREMENT_ID`: Configurado con ID de Analytics.

---

## 3. Diagnóstico Específico de Authentication y Google Sign-In

### 3.1 Mecanismo de Google Sign-In
En `src/services/authService.ts:190` se ejecuta:
```typescript
const result = await signInWithPopup(auth, googleProvider);
const session = await createOrUpdateUserProfile(result.user);
```

### 3.2 Códigos de Error Manejados en Código
El archivo `authService.ts` implementa una captura exhaustiva de códigos de error:
1. `auth/unauthorized-domain`:
   - **Diagnóstico:** Ocurre cuando se ejecuta la aplicación en un puerto o IP distinta a las autorizadas en la consola de Google. Por ejemplo, si Vite corre en `http://localhost:5173`, `http://localhost` suele estar autorizado, pero si se accede mediante la IP local (ej. `http://192.168.1.15:5173`) o un túnel, Google rechaza la autenticación OAuth con este error.
   - **Mensaje provisto:** Informa al usuario acceder mediante `http://localhost:5173` o añadir el dominio en Firebase Console > Authentication > Settings > Authorized Domains.
2. `auth/popup-closed-by-user`:
   - Captura el cierre voluntario o accidental de la ventana emergente de Google antes de finalizar el login.
3. `auth/popup-blocked`:
   - Detecta si el navegador del usuario bloqueó la ventana emergente de OAuth e instruye a habilitarla.
4. `auth/cancelled-popup-request`:
   - Maneja colisiones si el usuario hace clic repetido en el botón de Google.
5. `auth/network-request-failed`:
   - Captura caídas de red o bloqueos de firewall al conectar con los servidores de Google.
6. `auth/operation-not-allowed`:
   - Advierte si el proveedor de Google no ha sido activado en la consola de Firebase.

### 3.3 Registro de Depuración CLI (`firebase-debug.log`)
El archivo de log presente en la raíz evidencia que a las 11:11:28 GMT-0600 del 26/11/2026 se intentó ejecutar:
`firebase deploy --only auth`
- El comando falló con `ConnectTimeoutError` al intentar hacer POST a `https://cloudresourcemanager.googleapis.com/v1/projects/stockcare-e000b:testIamPermissions` y GET a `https://firebase.googleapis.com/v1beta1/projects/stockcare-e000b:searchApps`.
- **Causa raíz del fallo en log:** Problema de conectividad de red o bloqueo de firewall local en el entorno de desarrollo que impidió a la CLI de Node comunicarse con las APIs de Google Cloud durante el despliegue.

---

## 4. Estado de Cloud Firestore y Reglas de Seguridad

### 4.1 Reglas Actuales (`firestore.rules`)
El archivo `firestore.rules` contiene 151 líneas de reglas declarativas bien estructuradas:
- **Colección `users`:**
  - `allow read: if isAuthenticated();`
  - `allow create, update: if isOwner(userId);`
  - `allow delete: if false;` (Prohíbe eliminación física de usuarios).
- **Colecciones `products`, `batches`:**
  - `allow read, create, update, delete: if isAuthenticated();` (Requiere restringir `delete` y limitar `create/update` al rol `BODEGA` o `ADMIN`).
- **Colecciones `entries`, `exits`, `movements`:**
  - `allow read, create: if isAuthenticated();`
  - `allow update, delete: if false;` (Protección contra manipulación del Kardex contable).
- **Colección `settings`:**
  - `allow read, write: if isAuthenticated();` (Debe restringirse a que solo el rol `ADMIN` pueda escribir).

### 4.2 Índices Compuestos
Actualmente **NO EXISTE** el archivo `firestore.indexes.json` en el repositorio.
- **Riesgo:** Consultas combinadas (ej. `movements` filtrado por `date >= X && date <= Y` ordenado por `date desc`, o `batches` filtrado por `quantity > 0` ordenado por `expiryDate`) requerirán índices compuestos en Firestore; de lo contrario, la API arrojará errores de índice faltante en consola con el enlace para crearlo.
