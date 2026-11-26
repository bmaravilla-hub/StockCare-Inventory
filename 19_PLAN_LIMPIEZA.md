# 19 — PLAN DE LIMPIEZA Y DEPURACIÓN PREVIA A LA MIGRACIÓN

**Proyecto:** StockCare — Sistema de Gestión y Control de Inventario para Farmacia  
**Materia:** Análisis y Diseño de Sistemas (ADS) — Universidad Don Bosco  
**Fecha de Auditoría:** 26 de Noviembre de 2026  
**Regla de Seguridad de la Auditoría:** **NO ELIMINAR NINGÚN ELEMENTO EN ESTA ETAPA**. Este plan es una guía estructurada para ejecutarse por fases una vez recibida la aprobación del plan de implementación.

---

## 1. Escala de Prioridades de Limpieza

- **P0 — Eliminar Antes de Iniciar Firebase:** Elementos residuales o bloqueantes que ensucian el entorno de trabajo o consumen almacenamiento innecesario sin tener relación con la lógica de negocio.
- **P1 — Eliminar Durante la Migración:** Mocks, serialización en `localStorage` y bypasses de autenticación que deben sustituirse en el momento exacto en que se conecte cada colección de Firestore.
- **P2 — Eliminar al Finalizar:** Código de fallback, semillas en memoria y funciones auxiliares que queden sin consumidores tras completar las pruebas integrales.
- **P3 — Conservar:** Archivos de documentación, utilitarios de fechas, exportación a CSV y componentes de diseño que forman parte de la identidad y especificación académica del proyecto.

---

## 2. Inventario de Elementos Clasificados

| Elemento / Archivo / Función | Tipo | Ubicación | Prioridad | Motivo Técnico de Limpieza |
| :--- | :--- | :--- | :---: | :--- |
| `Sin confirmar 531720.crdownload` | Archivo basura | Raíz del proyecto | **P0** | Archivo temporal de descarga de 153 MB ajeno a la aplicación. |
| `stockcare_logo.jpg` | Asset redundante | Raíz del proyecto | **P0** | Imagen JPEG sin referencias; la aplicación utiliza el PNG de `src/assets/`. |
| `firebase-debug.log` | Log de depuración | Raíz del proyecto | **P0** | Registro de error CLI de intentos previos; debe agregarse al `.gitignore`. |
| Cuentas demo en Login | Bypass UI | `LoginPage.tsx:328-354` | **P1** | Botones de acceso rápido `handleQuickDemoLogin` que omiten contraseña y token de Firebase Auth. |
| Heurística de rol por email | Lógica vulnerable | `authService.ts:60` | **P1** | Regla `user.email?.includes('admin') ? 'ADMIN' : 'BODEGA'`. Sustituir por lectura de rol en Firestore o Custom Claims. |
| Persistencia en `localStorage` | Almacenamiento local | `storageService.ts:18, 42-75` | **P1** | La clave `stockcare_inventory_state_v1` aísla los datos por dispositivo e impide el funcionamiento multiusuario en red. |
| Persistencia en `sessionStorage`| Almacenamiento local | `storageService.ts:19, 88-110` | **P1** | El SDK de Firebase Auth ya gestiona el token y la sesión; almacenar JSON en `sessionStorage` genera duplicidad. |
| Sembrado automático ciego | Lógica de auto-seed | `firestoreService.ts:45, 73` | **P1** | `seedFirestoreData()` se dispara si la base está vacía. Debe convertirse en un script controlado de seed y no ejecutarse en el arranque de la app. |
| Desvío de login síncrono | Lógica condicional | `StockCareContext.tsx:234-291`| **P1** | La función `login` desvía usuarios sin `@` hacia `DEMO_ACCOUNTS`. Debe unificarse en `loginWithEmail` y `loginWithGoogle`. |
| `DEMO_ACCOUNTS` | Arreglo de prueba | `mockData.ts:41-64` | **P2** | Cuentas en memoria `admin` y `bodega`. Se eliminarán una vez creadas las cuentas reales en Firebase Auth. |
| `INITIAL_PRODUCTS` | Arreglo mock | `mockData.ts:74-231` | **P2** | Catálogo inicial en memoria. Se migrará como semilla inicial de la colección `products` de Firestore. |
| `INITIAL_ENTRIES` | Arreglo mock | `mockData.ts:233-383` | **P2** | Recepciones iniciales. Se migrarán a la colección `entries`. |
| `INITIAL_EXITS` | Arreglo mock | `mockData.ts:385-534` | **P2** | Despachos iniciales. Se migrarán a la colección `exits`. |
| `buildInitialInventoryState` | Función de simulación | `mockData.ts:540-636` | **P2** | Generador cronológico en cliente. Al existir Firestore, las existencias y movimientos se leen directamente de la base de datos. |
| `COMMON_PROVIDERS` | Arreglo plano | `mockData.ts:25-31` | **P2** | Sustituir por la lectura reactiva de la colección `suppliers` en Firestore. |
| `clearInventoryState` / Reset | Función de reset demo | `storageService.ts:77`, `ProfilePage.tsx:291` | **P2** | El botón "Restablecer datos demo" debe eliminarse de la interfaz de producción o limitarse a un ambiente de staging. |
| `ADS Inventario Farmacia.pdf` | Documento de diseño | Raíz del proyecto | **P3** | Documento oficial de investigación y especificación académica de ADS. **CONSERVAR**. |
| `src/assets/stockcare-logo.png` | Asset oficial | `src/assets/` | **P3** | Logotipo de la aplicación en alta resolución. **CONSERVAR**. |
| `EXIT_REASONS` | Tipado de negocio | `mockData.ts:33` | **P3** | Enum de motivos de salida permitidos en farmacia. Mover a `types/index.ts` y **CONSERVAR**. |
| `PRODUCT_CATEGORIES` | Catálogo base | `mockData.ts:11` | **P3** | Categorías terapéuticas de referencia. **CONSERVAR**. |

---

## 3. Aclaración sobre el Código de Backend Original (Flask / SQL Server)
Durante la auditoría se verificó exhaustivamente el repositorio en búsqueda de archivos de Python (`.py`), Flask (`app.py`), scripts de SQL Server (`.sql`, migraciones o esquemas) o clientes HTTP (`axios`, `fetch` hacia servidores locales).
- **Hallazgo:** **NO EXISTE CÓDIGO DE BACKEND FLASK EN ESTE REPOSITORIO**.
- La arquitectura Flask + SQL Server correspondió a la propuesta documental de la Fase I/II, pero el desarrollo de la Fase actual se realizó enteramente sobre frontend React/TypeScript con almacenamiento local e integración directa con Firebase.
- **Acción:** No se requiere eliminar ni desinstalar ningún paquete de Flask o SQL Server, pues nunca formaron parte física del repositorio.
