# 01 — INVENTARIO TÉCNICO COMPLETO DE STOCKCARE

**Proyecto:** StockCare — Sistema de Gestión y Control de Inventario para Farmacia  
**Materia:** Análisis y Diseño de Sistemas (ADS) — Universidad Don Bosco  
**Fecha de Auditoría:** 26 de Noviembre de 2026  
**Tipo de Documento:** Auditoría Técnica Exhaustiva de Código Fuente (Fase Previa a Implementación Firebase)  
**Alcance:** Frontend React/TypeScript, configuración Firebase, assets, dependencias y arquitectura documental.

---

## 1. Estructura Completa de Directorios y Archivos

A continuación se detalla la estructura física actual del repositorio:

```text
StockCare ADS/
├── .agents/                                # Habilidades y referencias de agentes de soporte
│   └── skills/
│       ├── extension-to-functions-codebase/
│       ├── firebase-ai-logic-basics/
│       ├── firebase-analytics/
│       ├── firebase-app-hosting-basics/
│       ├── firebase-auth-basics/
│       ├── firebase-basics/
│       ├── firebase-crashlytics/
│       ├── firebase-data-connect/
│       ├── firebase-firestore/
│       ├── firebase-hosting-basics/
│       ├── firebase-remote-config-basics/
│       ├── firebase-security-rules-auditor/
│       ├── firestore-rules-creation/
│       └── xcode-project-setup/
├── dist/                                   # Artefactos de compilación generados por Vite
│   ├── assets/
│   │   ├── index-BTKdv0MQ.css
│   │   ├── index-ByZlXL5m.js
│   │   └── stockcare-logo-CpG3XUCJ.png
│   └── index.html
├── node_modules/                           # Dependencias instaladas (npm)
├── src/                                    # Código fuente de la aplicación frontend
│   ├── assets/
│   │   └── stockcare-logo.png             # Logotipo corporativo oficial de StockCare
│   ├── components/                         # Componentes UI reutilizables
│   │   ├── Alert.tsx
│   │   ├── Badge.tsx
│   │   ├── Button.tsx
│   │   ├── DataTable.tsx
│   │   ├── Input.tsx
│   │   ├── MetricCard.tsx
│   │   ├── Modal.tsx
│   │   ├── PageHeader.tsx
│   │   ├── RouteGuards.tsx
│   │   ├── Select.tsx
│   │   ├── Sidebar.tsx
│   │   ├── StockCareLogo.tsx
│   │   ├── ToastContainer.tsx
│   │   └── Topbar.tsx
│   ├── data/                               # Mocks y semillas de datos en memoria
│   │   └── mockData.ts
│   ├── features/                           # Componentes modulares por dominio de negocio
│   │   ├── entries/
│   │   │   └── EntryReceiptModal.tsx
│   │   └── products/
│   │       ├── ProductDetailModal.tsx
│   │       └── ProductForm.tsx
│   ├── hooks/                              # Hooks personalizados React
│   │   └── useStockCare.ts
│   ├── layouts/                            # Estructura general de navegación
│   │   └── AppLayout.tsx
│   ├── pages/                              # Páginas / Vistas enrutadas
│   │   ├── AlertsPage.tsx
│   │   ├── BatchesPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── EntriesListPage.tsx
│   │   ├── EntryCreatePage.tsx
│   │   ├── ExitCreatePage.tsx
│   │   ├── ExitsListPage.tsx
│   │   ├── InventoryPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── MovementsPage.tsx
│   │   ├── NotFoundPage.tsx
│   │   ├── ProductCreatePage.tsx
│   │   ├── ProductEditPage.tsx
│   │   ├── ProductsListPage.tsx
│   │   ├── ProfilePage.tsx
│   │   └── ReportsPage.tsx
│   ├── services/                           # Conectividad, contexto y persistencia
│   │   ├── authService.ts
│   │   ├── firebase.ts
│   │   ├── firestoreService.ts
│   │   ├── StockCareContext.tsx
│   │   └── storageService.ts
│   ├── types/                              # Definiciones de tipos e interfaces TypeScript
│   │   └── index.ts
│   ├── utils/                              # Funciones utilitarias puras
│   │   ├── date.ts
│   │   ├── exportCsv.ts
│   │   └── inventory.ts
│   ├── App.tsx                             # Configuración del enrutador central y proveedores
│   ├── index.css                           # Configuración de estilos Tailwind CSS v4
│   ├── main.tsx                            # Punto de entrada React (DOM mount)
│   └── vite-env.d.ts                       # Tipos del entorno cliente Vite
├── .env                                    # Variables de entorno activas (NO versionar)
├── .env.example                            # Plantilla pública de variables de entorno
├── ADS Inventario Farmacia.pdf             # Documento de investigación preliminar académica ADS
├── firebase-debug.log                      # Registro de depuración del último intento CLI de Firebase
├── firebase.json                           # Configuración declarativa de Firebase Auth & Firestore
├── firestore.rules                         # Reglas de seguridad para Cloud Firestore
├── index.html                              # Plantilla HTML raíz de Vite
├── package.json                            # Manifiesto de paquetes y scripts npm
├── package-lock.json                       # Árbol exacto de dependencias instaladas
├── skills-lock.json                        # Registro de dependencias de agentes
├── stockcare_logo.jpg                      # Archivo de imagen en raíz (posible asset redundante)
├── Sin confirmar 531720.crdownload         # Descarga inconclusa de navegador (archivo residual en raíz)
├── tsconfig.json                           # Configuración de TypeScript
├── tsconfig.tsbuildinfo                    # Caché de compilación incremental de TypeScript
└── vite.config.ts                          # Configuración del empaquetador Vite
```

---

## 2. Diagnóstico por Capa Tecnológica

### 2.1 Frontend
- **Framework:** React 19.1.0 (`react`, `react-dom`).
- **Enrutamiento:** React Router DOM v7.6.0 (`BrowserRouter`, `Routes`, `Route`, `Navigate`, `Outlet`, `useNavigate`, `useSearchParams`, `useLocation`).
- **Lenguaje:** TypeScript 5.8.3 en modo estricto (`strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`).
- **Estilos:** Tailwind CSS v4.1.7 integrado mediante `@tailwindcss/vite` e `@import "tailwindcss";` en `src/index.css`.
- **Iconografía:** Lucide React v0.511.0.

### 2.2 Backend
- **Estado Actual en el Repositorio:** **INEXISTENTE FÍSICAMENTE**.
- **Observación de Auditoría:** No existe ninguna carpeta de servidor (`server/`, `backend/`, `api/`), ni código Python/Flask (`.py`), ni scripts SQL Server (`.sql`, `.mdf`). La arquitectura original contemplaba Flask + SQL Server a nivel de especificación documental, pero el código fuente actual opera como una **Single Page Application (SPA)** autónoma apoyada en `StockCareContext` y servicios que sincronizan con `localStorage` y de forma híbrida e incipiente con Firebase (`firebase.ts`, `authService.ts`, `firestoreService.ts`).

### 2.3 Configuración de Firebase
- **SDK Instalado:** `firebase` v13.4.0 (módulos `firebase/app`, `firebase/auth`, `firebase/firestore`).
- **Archivos de configuración:**
  - `firebase.json`: Define proveedores de Auth (Email/Password habilitado, Google Sign-In configurado con display name "StockCare", soporte a `maravillacruz806@gmail.com`, URIs autorizadas de redirección) y archivo de reglas de Firestore (`firestore.rules`).
  - `.firebaserc`: **NO EXISTE** en el proyecto. El proyecto activo debe inferirse del `.env` (`stockcare-e000b`).
  - `firestore.rules`: Contiene reglas completas de Firestore para `users`, `products`, `batches`, `entries`, `exits`, `movements` y `settings`.
  - `firebase-debug.log`: Evidencia un intento fallido de `firebase deploy --only auth` el 26/11/2026 debido a un error de red (`ConnectTimeoutError` al consultar `cloudresourcemanager.googleapis.com` y `firebase.googleapis.com`).

### 2.4 Configuración de Vite y Variables de Entorno
- **Empaquetador:** Vite 6.3.5 configurado en `vite.config.ts` con plugins `@vitejs/plugin-react` y `@tailwindcss/vite`.
- **Archivo `.env.example`:**
  - `VITE_FIREBASE_API_KEY=`
  - `VITE_FIREBASE_AUTH_DOMAIN=stockcare-e000b.firebaseapp.com`
  - `VITE_FIREBASE_PROJECT_ID=stockcare-e000b`
  - `VITE_FIREBASE_STORAGE_BUCKET=stockcare-e000b.firebasestorage.app`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID=`
  - `VITE_FIREBASE_APP_ID=`
- **Archivo `.env` activo (Verificación sin exponer secretos):**
  - `VITE_FIREBASE_API_KEY`: Configurado con valor no vacío.
  - `VITE_FIREBASE_AUTH_DOMAIN`: `stockcare-e000b.firebaseapp.com`
  - `VITE_FIREBASE_PROJECT_ID`: `stockcare-e000b`
  - `VITE_FIREBASE_STORAGE_BUCKET`: `stockcare-e000b.firebasestorage.app`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID`: Configurado con valor numérico de remitente.
  - `VITE_FIREBASE_APP_ID`: Configurado con App ID web de Firebase (`1:...:web:...`).
  - `VITE_FIREBASE_MEASUREMENT_ID`: Configurado con ID de Analytics (`G-...`).

---

## 3. Matriz Exhaustiva de Archivos y Módulos

A continuación se presenta la tabla detallada de cada archivo del proyecto, su responsabilidad, estado, consumidores, dependencias y mecanismo de persistencia actual:

| Archivo / Módulo | Responsabilidad | Estado | Dónde se utiliza | Dependencias | Persistencia Actual | Observaciones |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `src/main.tsx` | Punto de entrada ReactDOM | **En uso** | `index.html` | React, `App.tsx`, `index.css` | N/A | Monta la app en el nodo `#root` en modo estricto. |
| `src/App.tsx` | Enrutador global de la SPA | **En uso** | `src/main.tsx` | `react-router-dom`, `StockCareContext`, `RouteGuards`, Pages | N/A | Declara 17 rutas y controla accesos por rol (`ADMIN` / `BODEGA`). |
| `src/index.css` | Reglas de estilos e impresión | **En uso** | `src/main.tsx` | Tailwind CSS v4 | N/A | Contiene `@media print` para comprobantes y oculta `.no-print`. |
| `src/types/index.ts` | Modelos de dominio e interfaces | **En uso** | Todo el proyecto | TypeScript nativo | N/A | Define `Product`, `Batch`, `EntryRecord`, `ExitRecord`, `MovementRecord`, etc. |
| `src/hooks/useStockCare.ts` | Acceso directo al contexto | **En uso** | Componentes y páginas | `StockCareContext.tsx` | N/A | Wrapper seguro con validación de provider activo. |
| `src/layouts/AppLayout.tsx` | Layout principal (Sidebar + Topbar + Contenido) | **En uso** | `App.tsx` | `Sidebar`, `Topbar`, `Outlet` | N/A | Administra el estado abierto/cerrado del menú responsivo. |
| `src/services/firebase.ts` | Inicialización del SDK Firebase | **En uso** | `authService`, `firestoreService`, `StockCareContext` | `firebase/app`, `firebase/auth`, `firebase/firestore` | N/A | Lee variables de entorno Vite. Instancia Auth, DB y GoogleProvider. |
| `src/services/authService.ts` | Operaciones de autenticación y perfiles | **En uso / Híbrido** | `StockCareContext.tsx`, `LoginPage.tsx` | `firebase/auth`, `firebase/firestore`, `firebase.ts` | Firebase Auth + Firestore (`users/{uid}`) | Maneja Email/Password, Google Popup, Redirect y perfiles en Firestore. |
| `src/services/firestoreService.ts` | Sincronización remota con Cloud Firestore | **En uso / Híbrido** | `StockCareContext.tsx` | `firebase/firestore`, `mockData.ts` | Cloud Firestore (`products`, `batches`, `entries`, `exits`, `movements`, `settings`) | Contiene `fetchFirestoreInventory`, `seedFirestoreData` y persistidores individuales. |
| `src/services/storageService.ts` | Persistencia en almacenamiento local de navegador | **En uso / Legacy** | `StockCareContext.tsx` | `mockData.ts`, `types/index.ts` | `localStorage` (`stockcare_inventory_state_v1`), `sessionStorage` (`stockcare_user_session_v1`) | Actúa como fallback y almacenamiento local inmediato en modo prototipo. |
| `src/services/StockCareContext.tsx` | Estado global, dispatchers y reglas | **En uso / Híbrido** | `App.tsx`, Hooks | `storageService`, `firestoreService`, `authService`, `mockData.ts` | Memoria (useState) + `localStorage` + Firestore (asíncrono) | Núcleo del frontend. Mantiene la coherencia matemática de existencias. |
| `src/data/mockData.ts` | Datos simulados y generador cronológico | **Mock / En uso** | `storageService`, `firestoreService`, `StockCareContext`, Páginas | `types/index.ts` | En memoria / fuente de semilla | Contiene 13 productos, 4 entradas, 12 salidas, 2 cuentas demo y generador. |
| `src/utils/date.ts` | Manejo de fechas ISO locales | **En uso** | Formularios, tablas, cálculos | TypeScript nativo | N/A | Evita errores de zona horaria; valida fechas pasadas/futuras. |
| `src/utils/inventory.ts` | Lógica de existencias y semáforos | **En uso** | Dashboard, Inventario, Lotes, Modales | `date.ts`, `types/index.ts` | N/A | Calcula estado de vencimiento, stock bajo, agotado y lotes FEFO. |
| `src/utils/exportCsv.ts` | Descarga de tablas a formato CSV | **En uso** | `ReportsPage.tsx` | DOM APIs | N/A | Genera CSV con BOM UTF-8 compatible con Microsoft Excel. |
| `src/components/Alert.tsx` | Banner de notificación/alerta UI | **En uso** | Login, Dashboard, Formularios, Alertas | `lucide-react` | N/A | Soporta variantes `info`, `success`, `warning`, `error`. |
| `src/components/Badge.tsx` | Píldoras de estado y categorías | **En uso** | Tablas, tarjetas, modales | `lucide-react` | N/A | Renderiza semáforos de vencimiento, nivel de stock y tipos de movimiento. |
| `src/components/Button.tsx` | Botón accesible con estados | **En uso** | Todo el proyecto | `lucide-react` | N/A | Soporta variantes, tamaños, spinner de carga e iconos laterales. |
| `src/components/DataTable.tsx` | Tabla genérica tipada y accesible | **En uso** | Páginas de listados y reportes | `Button`, `lucide-react` | N/A | Maneja columnas dinámicas, estados de carga, error y estado vacío. |
| `src/components/Input.tsx` | Campos de entrada y textarea | **En uso** | Formularios y filtros | HTML estándar | N/A | Soporta etiquetas, errores accesibles, helper text e iconos. |
| `src/components/MetricCard.tsx` | Tarjeta de indicadores cuantitativos | **En uso** | `DashboardPage.tsx` | `react-router-dom` | N/A | Muestra métricas clave con enlaces directos a vistas de detalle. |
| `src/components/Modal.tsx` | Ventana modal y ConfirmModal | **En uso** | Creación/Edición, Comprobantes | `Button`, `lucide-react` | N/A | Incluye foco, backdrop y confirmaciones destructivas. |
| `src/components/PageHeader.tsx` | Encabezado estándar con migas de pan | **En uso** | Todas las páginas | `react-router-dom`, `lucide-react` | N/A | Despliega título, subtítulo, breadcrumbs, código de Caso de Uso y acciones. |
| `src/components/RouteGuards.tsx` | Guardas de rutas protegidas y roles | **En uso** | `App.tsx` | `useStockCare`, `react-router-dom` | N/A | Bloquea usuarios no autenticados y restringe acceso con pantalla 403. |
| `src/components/Select.tsx` | Desplegable estilizado y tipado | **En uso** | Formularios y filtros | HTML estándar | N/A | Gestiona opciones dinámicas con soporte de placeholders y errores. |
| `src/components/Sidebar.tsx` | Menú lateral institucional | **En uso** | `AppLayout.tsx` | `NavLink`, `StockCareLogo`, `useStockCare` | N/A | Renderiza secciones de navegación y contadores de alerta en tiempo real. |
| `src/components/StockCareLogo.tsx` | Renderizador del logotipo | **En uso** | Sidebar, Topbar, Login, Modales | `src/assets/stockcare-logo.png` | N/A | Controla tamaños (`sm`, `md`, `lg`, `xl`) y contenedor en tarjeta blanca. |
| `src/components/ToastContainer.tsx` | Notificaciones flotantes tipo Toast | **En uso** | `App.tsx` | `useStockCare`, `lucide-react` | N/A | Muestra mensajes de confirmación o error con auto-dismiss a 4.5 segundos. |
| `src/components/Topbar.tsx` | Barra superior con usuario y alertas | **En uso** | `AppLayout.tsx` | `useStockCare`, `react-router-dom` | N/A | Muestra insignia de alertas activas y acceso al perfil del usuario autenticado. |
| `src/features/entries/EntryReceiptModal.tsx` | Comprobante de recepción imprimible | **En uso** | `EntriesListPage`, `EntryCreatePage` | `Modal`, `StockCareLogo`, `date.ts` | N/A | Cumple con requerimiento DFD 1.5 ("Generar Comprobante"). |
| `src/features/products/ProductDetailModal.tsx` | Ficha técnica y desglose de lotes | **En uso** | `ProductsListPage`, `InventoryPage` | `Modal`, `Badge`, `inventory.ts` | N/A | Presenta detalles de catálogo y tabla de lotes activos del producto. |
| `src/features/products/ProductForm.tsx` | Formulario reutilizable de producto | **En uso** | `ProductCreatePage`, `ProductEditPage` | `Input`, `Select`, `Button`, `Modal` | N/A | Valida código único, formato alfanumérico, stock mínimo y estado. |
| `src/pages/AlertsPage.tsx` | Pantalla de alertas (vencimientos y stock) | **En uso** | `App.tsx` (`/alertas`) | `useStockCare`, `Badge`, `Button` | N/A | CU-13: Lotes vencidos, próximos a vencer y productos en stock mínimo. |
| `src/pages/BatchesPage.tsx` | Control y listado de lotes | **En uso** | `App.tsx` (`/lotes`) | `DataTable`, `Badge`, `useStockCare` | N/A | CU-12: Consulta de lotes, semaforización FEFO y acceso a descarte. |
| `src/pages/DashboardPage.tsx` | Panel de control operacional | **En uso** | `App.tsx` (`/dashboard`) | `MetricCard`, `DataTable`, `useStockCare` | N/A | CU-02: 5 métricas operativas, accesos rápidos y 2 tablas de control. |
| `src/pages/EntriesListPage.tsx` | Historial de recepciones de mercadería | **En uso** | `App.tsx` (`/entradas`) | `DataTable`, `EntryReceiptModal` | N/A | CU-07: Listado de facturas, filtros por proveedor y comprobantes. |
| `src/pages/EntryCreatePage.tsx` | Registro de recepción de mercadería | **En uso** | `App.tsx` (`/entradas/nueva`) | `useStockCare`, `Modal`, `Receipt` | N/A | CU-08: Formulario maestro-detalle (N productos, lotes y vencimientos). |
| `src/pages/ExitCreatePage.tsx` | Despacho y salida de inventario | **En uso** | `App.tsx` (`/salidas/nueva`) | `useStockCare`, `Modal`, `inventory.ts` | N/A | CU-10: Selección de lote FEFO, validación de stock y regla venta/vencido. |
| `src/pages/ExitsListPage.tsx` | Historial de salidas registradas | **En uso** | `App.tsx` (`/salidas`) | `DataTable`, `Badge`, `useStockCare` | N/A | CU-09: Historial de despachos por venta, uso interno o descarte. |
| `src/pages/InventoryPage.tsx` | Consulta de existencias disponibles | **En uso** | `App.tsx` (`/inventario`) | `DataTable`, `ProductDetailModal` | N/A | CU-11: Vista consolidada de existencias físicas por producto activo. |
| `src/pages/LoginPage.tsx` | Acceso al sistema (Auth/Registro/Demo) | **En uso** | `App.tsx` (`/login`) | `useStockCare`, `Input`, `Button` | N/A | CU-01: Login híbrido (Google OAuth, Email/Pass Firebase y demo mock). |
| `src/pages/MovementsPage.tsx` | Auditoría de movimientos (Kardex) | **En uso** | `App.tsx` (`/movimientos`) | `DataTable`, `useStockCare` | N/A | CU-14: Trazabilidad cronológica de entradas y salidas con saldo resultante. |
| `src/pages/NotFoundPage.tsx` | Pantalla de error de ruta 404 | **En uso** | `App.tsx` (`*`) | `StockCareLogo`, `Button` | N/A | Ruta comodín para URLs inexistentes. |
| `src/pages/ProductCreatePage.tsx` | Vista contenedora de alta de producto | **En uso** | `App.tsx` (`/productos/nuevo`) | `ProductForm`, `useStockCare` | N/A | CU-05: Creación de medicamentos e insumos médicos en catálogo. |
| `src/pages/ProductEditPage.tsx` | Vista contenedora de edición | **En uso** | `App.tsx` (`/productos/:id/editar`) | `ProductForm`, `useStockCare` | N/A | CU-06: Modificación de atributos básicos de producto existente. |
| `src/pages/ProductsListPage.tsx` | Catálogo general de productos | **En uso** | `App.tsx` (`/productos`) | `DataTable`, `ProductDetailModal` | N/A | CU-04: Catálogo general de productos con búsqueda y filtros. |
| `src/pages/ProfilePage.tsx` | Perfil de usuario y parámetros | **En uso** | `App.tsx` (`/perfil`) | `useStockCare`, `ConfirmModal` | N/A | CU-03: Datos de cuenta activa, permisos y configuración del sistema. |
| `src/pages/ReportsPage.tsx` | Generación y exportación de reportes | **En uso** | `App.tsx` (`/reportes`) | `DataTable`, `exportCsv.ts` | N/A | CU-15: 5 reportes administrativos tabulares con exportación a Excel (CSV). |
| `stockcare_logo.jpg` | Imagen JPEG del logo en raíz | **Duplicado / No conectado** | Ninguno (raíz) | N/A | N/A | Archivo residual en raíz; la aplicación consume `src/assets/stockcare-logo.png`. |
| `Sin confirmar 531720.crdownload` | Archivo temporal de descarga (153 MB) | **Obsoleto / Basura** | Ninguno (raíz) | N/A | N/A | Descarga interrumpida de Chromium generada localmente. Candidato a eliminar. |
| `firebase-debug.log` | Log de despliegue fallido Firebase CLI | **Obsoleto** | Ninguno (raíz) | Firebase CLI | N/A | Log del comando `firebase deploy --only auth` con error de timeout. |
| `firestore.rules` | Reglas declarativas de seguridad | **Parcial / En espera** | Despliegue Firebase | Firebase Firestore | Cloud Firestore | Especificación de reglas para users, products, batches, etc. |
| `firebase.json` | Manifiesto de servicios Firebase | **En uso** | Firebase CLI | Firebase Tools | Cloud Firebase | Declara soporte para Auth providers y Firestore rules. |

---

## 4. Detección de Código Muerto o No Conectado

1. **`stockcare_logo.jpg` (en la raíz del proyecto):** Archivo de 175 KB en formato JPEG. El código de la aplicación importa exclusivamente `src/assets/stockcare-logo.png` (en `StockCareLogo.tsx`). Este archivo no posee referencias.
2. **`Sin confirmar 531720.crdownload` (en la raíz del proyecto):** Archivo de 153 MB generado por una descarga interrumpida en el navegador. No forma parte de la aplicación ni debe estar en el repositorio.
3. **Módulo de Proveedores (`suppliers`):**
   - No existe interfaz `Supplier` en `src/types/index.ts`.
   - No existe página ni servicio de proveedores.
   - En su lugar, se utiliza un arreglo de cadenas hardcodeado `COMMON_PROVIDERS` en `src/data/mockData.ts` y una entrada de texto libre en `EntryCreatePage.tsx`.
4. **Módulo de Ajustes de Inventario:**
   - La regla de negocio de inventario contempla "Ajuste de inventario" como un valor enum en `ExitReason` (salidas), pero no existe un módulo ni entidad específica de ajustes manuales (con cantidad previa, cantidad nueva, motivo, lote y aprobación).
5. **Módulo de Gestión de Usuarios y Roles:**
   - No existe vista administrativa para listar, dar de alta, asignar roles o revocar accesos de usuarios.
   - El sistema sólo provee autenticación individual y una página de consulta de perfil personal (`ProfilePage.tsx`).
