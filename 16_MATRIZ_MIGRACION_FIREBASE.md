# 16 — MATRIZ DE MIGRACIÓN A FIREBASE

**Proyecto:** StockCare — Sistema de Gestión y Control de Inventario para Farmacia  
**Materia:** Análisis y Diseño de Sistemas (ADS) — Universidad Don Bosco  
**Fecha de Auditoría:** 26 de Noviembre de 2026  
**Objetivo:** Establecer la correspondencia directa entre los elementos del estado actual y su componente destino en la infraestructura de Google Firebase (Fase III).

---

## 1. Convenciones de Acción de Migración

- **CONSERVAR:** El código actual es óptimo, moderno y se mantiene sin alteraciones significativas.
- **MIGRAR:** Se traslada la lógica de datos o estructuras existentes hacia los servicios de Firebase correspondientes.
- **REEMPLAZAR:** El mecanismo actual (ej. `localStorage`, arrays mock) se sustituye íntegramente por APIs de Firebase.
- **ELIMINAR:** Módulos, archivos basura o código bypass que deben ser purgados para producción.
- **REFACTORIZAR:** El componente o servicio se ajusta para operar con promesas asíncronas, listeners en tiempo real o transacciones de Firestore.
- **REVISAR:** Requiere validación de permisos en Firebase Console (ej. authorized domains, reglas IAM).

---

## 2. Matriz de Componentes Actuales vs. Destino Firebase

| Elemento Actual | Destino en Firebase | Acción | Justificación Técnica |
| :--- | :--- | :---: | :--- |
| **`LoginPage.tsx` (Google Popup)** | Firebase Auth (OAuth Google Provider) | **CONSERVAR / REVISAR** | El código ya está integrado. Solo se requiere verificar los Authorized Domains en Firebase Console. |
| **`LoginPage.tsx` (Email / Password)** | Firebase Auth (Email/Password Provider) | **CONSERVAR** | Completamente funcional mediante `signInWithEmailAndPassword` y `createUserWithEmailAndPassword`. |
| **`LoginPage.tsx` (Botones Demo)** | Inexistente (Login con usuarios reales en Auth) | **ELIMINAR** | Los accesos rápidos por bypass `login('', role)` deben eliminarse en el release de producción. |
| **`DEMO_ACCOUNTS` (`mockData.ts`)** | Colección `users` en Firestore + Firebase Auth | **ELIMINAR / MIGRAR** | Sembrar cuentas reales con contraseñas seguras en Auth y perfiles en Firestore. |
| **`storageService.ts` (`localStorage`)** | Cloud Firestore SDK (`db`) | **REEMPLAZAR** | Eliminar la serialización JSON en `localStorage` (`stockcare_inventory_state_v1`). Las lecturas deben ser remotas con caché offline del SDK. |
| **`storageService.ts` (`sessionStorage`)**| Firebase Auth Client SDK Persistence | **REEMPLAZAR** | El SDK de Firebase Auth maneja internamente la persistencia del token (IndexedDB/LocalStorage seguro). No se requiere `sessionStorage` manual. |
| **`StockCareContext.tsx` (Estado reactivo)** | React Context + Listeners Firestore (`onSnapshot`) | **REFACTORIZAR** | Transformar las mutaciones síncronas en operaciones asíncronas con transacciones de Firestore (`runTransaction`). |
| **`INITIAL_PRODUCTS` (`mockData.ts`)** | Colección `products` en Cloud Firestore | **MIGRAR** | El catálogo inicial debe residir en Firestore como documentos independientes. |
| **`INITIAL_ENTRIES` (`mockData.ts`)** | Colección `entries` en Cloud Firestore | **MIGRAR** | Almacenar las recepciones de mercadería como documentos con array de `items`. |
| **`INITIAL_EXITS` (`mockData.ts`)** | Colección `exits` en Cloud Firestore | **MIGRAR** | Almacenar los despachos como documentos inmutables. |
| **Lotes calculados (`batches`)** | Colección `batches` en Cloud Firestore | **MIGRAR** | Cada lote existirá como documento en `batches` con `quantity`, `initialQuantity`, `expiryDate` y `productId`. |
| **Kardex de Movimientos (`movements`)** | Colección `movements` en Cloud Firestore | **MIGRAR** | Renglones de kardex append-only en la colección `movements`. |
| **`INITIAL_SETTINGS` (`mockData.ts`)** | Documento `settings/system` en Firestore | **MIGRAR** | Configuración institucional de la farmacia y días de alerta por vencimiento. |
| **Proveedores (`COMMON_PROVIDERS`)** | Colección `suppliers` en Cloud Firestore | **REEMPLAZAR** | Reemplazar el arreglo plano de strings por una colección formal con datos de contacto. |
| **Reglas de seguridad (`firestore.rules`)** | Cloud Firestore Security Rules | **MIGRAR / REFACTORIZAR**| Ajustar reglas para restringir escrituras por rol (`request.auth.token.role` o consulta a `users`). |
| **Compilación Vite (`dist/`)** | Firebase Hosting | **MIGRAR** | Configurar el bloque `"hosting"` en `firebase.json` y desplegar mediante `firebase deploy --only hosting`. |
| **Archivo `Sin confirmar 531720.crdownload`**| Ninguno | **ELIMINAR** | Archivo temporal de descarga de 153 MB ajeno al proyecto. |
| **Archivo `stockcare_logo.jpg` (raíz)** | Ninguno | **ELIMINAR** | Asset JPEG redundante. La app utiliza el PNG optimizado en `src/assets/`. |
| **Archivo `.firebaserc`** | Configuración de proyecto Firebase CLI | **CREAR** | Establecer el proyecto por defecto `stockcare-e000b` para despliegues automatizados. |
