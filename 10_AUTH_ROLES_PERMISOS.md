# 10 — AUDITORÍA DE AUTENTICACIÓN, ROLES Y PERMISOS

**Proyecto:** StockCare — Sistema de Gestión y Control de Inventario para Farmacia  
**Materia:** Análisis y Diseño de Sistemas (ADS) — Universidad Don Bosco  
**Fecha de Auditoría:** 26 de Noviembre de 2026  
**Módulos Evaluados:** `LoginPage.tsx`, `authService.ts`, `RouteGuards.tsx`, `Sidebar.tsx`, `Topbar.tsx`, `ProfilePage.tsx`, `StockCareContext.tsx`.

---

## 1. Estado Actual de la Autenticación

El sistema presenta una arquitectura de autenticación **HÍBRIDA** en transición entre un esquema simulado de prototipo y Firebase Authentication.

### 1.1 Qué componentes ya utilizan Firebase Authentication
1. **Google OAuth Sign-In:** `signInWithPopup(auth, googleProvider)` en `authService.ts:190`.
2. **Inicio de sesión con Correo y Clave:** `signInWithEmailAndPassword(auth, email, pass)` en `authService.ts:126`.
3. **Registro de Nuevos Usuarios:** `createUserWithEmailAndPassword(auth, email, pass)` en `authService.ts:157`.
4. **Cierre de Sesión Remoto:** `signOut(auth)` en `authService.ts:232`.
5. **Listener de Cambio de Estado:** `onAuthStateChanged(auth)` y `getRedirectResult(auth)` en `authService.ts:247-265`.
6. **Almacenamiento de Perfil de Usuario en Nube:** Colección `users/{uid}` en Cloud Firestore con campos `uid`, `email`, `fullName`, `role`, `roleLabel`, `branch`, `createdAt`, `lastLogin`.

### 1.2 Qué componentes siguen utilizando lógica simulada (Mock / Demo)
1. **Botones de Acceso Rápido Demo:** En `LoginPage.tsx:328-354`, dos botones que invocan `login('', 'ADMIN')` y `login('', 'BODEGA')`.
2. **Arreglo `DEMO_ACCOUNTS`:** En `mockData.ts:41-64`, con los usuarios `admin` y `bodega`.
3. **Almacenamiento de Sesión en `sessionStorage`:** Clave `stockcare_user_session_v1` en `storageService.ts:90`, la cual guarda el objeto JSON del usuario sin verificar la validez de un token JWT real de Firebase.
4. **Asignación Heurística de Rol:** En `authService.ts:60`, el código contiene:
   ```typescript
   const role: UserRole = customData?.role || existing?.role || (user.email?.includes('admin') ? 'ADMIN' : 'BODEGA');
   ```
   Si un usuario se registra con Google y su correo contiene "admin", se le otorga automáticamente el rol de Administrador.

---

## 2. Roles del Sistema: Esperados vs. Implementados

### Definición en Tipos TypeScript
En `src/types/index.ts:1` se define:
```typescript
export type UserRole = 'ADMIN' | 'BODEGA';
```

### Discrepancia Identificada
- **Roles esperados en análisis institucional:**
  1. `ADMINISTRADOR`: Gestión global, reportes, auditoría, parámetros del sistema.
  2. `ENCARGADO DE INVENTARIO`: Recepción de mercadería, altas de catálogo, lotes y vencimientos.
  3. `DEPENDIENTE`: Despacho en mostrador, ventas y consulta de existencias.
- **Implementación actual en código:**
  - El rol `BODEGA` agrupa actualmente las funciones de **Encargado de Inventario** y **Dependiente** bajo la etiqueta `"Encargado de Bodega / Dependiente"`.
  - No existe segregación entre quien recibe mercadería de proveedores y quien despacha ventas a clientes; ambos utilizan el rol `BODEGA`.

---

## 3. Matriz de Permisos por Rol

A continuación se detalla la matriz de permisos para los roles esperados y cómo están implementados actualmente en el código:

| Función / Pantalla | Administrador | Encargado de Bodega | Dependiente (Propuesto) | Implementación Actual en Código | Ubicación en Código |
| :--- | :---: | :---: | :---: | :--- | :--- |
| **Acceso al Dashboard (`/dashboard`)** | **SÍ** | **SÍ** | **SÍ** | Acceso público para cualquier rol autenticado. Acciones rápidas contextuales. | `DashboardPage.tsx:195-235` |
| **Consultar Catálogo de Productos (`/productos`)** | **SÍ** | **SÍ** | **SÍ** | Visible para todos los roles autenticados. | `ProductsListPage.tsx:23` |
| **Registrar Nuevo Producto (`/productos/nuevo`)** | **NO** | **SÍ** | **NO** | Restringido exclusivamente a `BODEGA`. Error 403 para `ADMIN`. | `App.tsx:45`, `RouteGuards.tsx:29` |
| **Editar Producto Existente (`/productos/:id/editar`)**| **NO** | **SÍ** | **NO** | Restringido exclusivamente a `BODEGA`. Error 403 para `ADMIN`. | `App.tsx:48` |
| **Consultar Inventario y Existencias (`/inventario`)**| **SÍ** | **SÍ** | **SÍ** | Visible para todos los roles. Botón "Reabastecer" solo para `BODEGA`. | `InventoryPage.tsx:29` |
| **Registrar Entrada de Mercadería (`/entradas/nueva`)**| **NO** | **SÍ** | **NO** | Restringido exclusivamente a `BODEGA`. Error 403 para `ADMIN`. | `App.tsx:54` |
| **Consultar Historial de Entradas (`/entradas`)** | **SÍ** | **SÍ** | **SÍ** | Visible para todos los roles. Botón "Registrar entrada" solo para `BODEGA`.| `EntriesListPage.tsx:17` |
| **Registrar Salida / Despacho (`/salidas/nueva`)** | **NO** | **SÍ** | **SÍ** | Restringido a `BODEGA`. (El dependiente debería tener acceso aquí). | `App.tsx:59` |
| **Consultar Historial de Salidas (`/salidas`)** | **SÍ** | **SÍ** | **SÍ** | Visible para todos los roles. | `ExitsListPage.tsx:17` |
| **Control de Lotes y Vencimientos (`/lotes`)** | **SÍ** | **SÍ** | **SÍ** | Visible para todos. Botón "Descartar / Salida" solo para `BODEGA`. | `BatchesPage.tsx:34` |
| **Monitoreo de Alertas (`/alertas`)** | **SÍ** | **SÍ** | **SÍ** | Visible para todos. Enlace a reportes solo para `ADMIN`; descartes para `BODEGA`. | `AlertsPage.tsx:26` |
| **Kardex de Movimientos (`/movimientos`)** | **SÍ** | **SÍ** | **SÍ** | Visible para todos los roles autenticados. | `MovementsPage.tsx` |
| **Generación y Exportación de Reportes (`/reportes`)**| **SÍ** | **NO** | **NO** | **Exclusivo para `ADMIN`**. Bloqueado con `RoleRoute` para `BODEGA`. | `App.tsx:68`, `Sidebar.tsx:115` |
| **Modificar Configuración de Farmacia (`/perfil`)** | **SÍ** | **NO** | **NO** | Campos deshabilitados y alerta informativa si el rol no es `ADMIN`. | `ProfilePage.tsx:200` |
| **Restablecer Datos Demo (Reset)** | **SÍ** | **NO** | **NO** | Botón de reinicio visible únicamente para `ADMIN`. | `ProfilePage.tsx:267` |

---

## 4. Plan de Limpieza y Fortalecimiento de Auth

1. **Eliminar Bypass Demo:** Retirar `handleQuickDemoLogin` y el array `DEMO_ACCOUNTS`.
2. **Desacoplar de `sessionStorage`:** Dejar que el SDK de Firebase gestione la persistencia del token (IndexedDB/WebStorage nativo de Firebase Auth) y consumir el estado reactivo mediante el hook de contexto.
3. **Incorporar Rol `DEPENDIENTE`:**
   - Modificar `UserRole`: `'ADMIN' | 'ENCARGADO_BODEGA' | 'DEPENDIENTE'`.
   - Permitir al Dependiente registrar únicamente salidas por 'Venta'.
   - Restringir la creación de productos y recepción de entradas exclusivamente al Encargado de Bodega y Administrador.
4. **Implementar Firebase Custom Claims o Validación Firestore:** Reemplazar la heurística del correo (`email.includes('admin')`) por verificación del campo `role` en `users/{uid}` o Custom Claims en el token de autenticación.
