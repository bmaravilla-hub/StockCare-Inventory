# 13 — INVENTARIO DE COMPONENTES REUTILIZABLES

**Proyecto:** StockCare — Sistema de Gestión y Control de Inventario para Farmacia  
**Materia:** Análisis y Diseño de Sistemas (ADS) — Universidad Don Bosco  
**Fecha de Auditoría:** 26 de Noviembre de 2026  
**Ubicación:** `src/components/` y `src/features/`

---

## 1. Inventario de Componentes UI

A continuación se detalla cada componente base, su firma de propiedades (Props), estado de reutilización y dependencias:

| Componente | Archivo | Responsabilidad / Variantes | Dónde se utiliza | Dependencias | Calidad / Duplicación |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`Button`** | `src/components/Button.tsx` | Botón accesible con estados `isLoading`, iconos y variantes (`primary`, `secondary`, `outline`, `danger`, `ghost`). Tamaños `sm`, `md`, `lg`. | En todas las páginas y modales | `lucide-react` (`Loader2`) | Excelente. Sin duplicación. Centraliza estilos y estados interactivos. |
| **`Input`** | `src/components/Input.tsx` | Campo de texto accesible con soporte de `label`, `error` (role alert), `helperText`, `leftIcon`, `required`. | Formularios y filtros de búsqueda | HTML estándar | Excelente. Vincula `htmlFor` con IDs automáticos. |
| **`Textarea`** | `src/components/Input.tsx` | Área de texto multilínea con control de filas, etiqueta y errores. | `ProductForm`, `EntryCreatePage`, `ExitCreatePage` | HTML estándar | Bien integrada en el mismo archivo de `Input`. |
| **`Select`** | `src/components/Select.tsx` | Desplegable nativo estilizado con interfaz `SelectOption { value, label, disabled }`, placeholder y error. | Todos los formularios y filtros de selección | HTML estándar | Consistente. Evita dependencias pesadas de selectores custom. |
| **`DataTable`** | `src/components/DataTable.tsx` | Tabla tipada genérica `<T>` con soporte de columnas, alineación, formateo celda, estados de carga (skeleton), error y estado vacío. | Todas las vistas de listado y reportes | `Button`, `lucide-react` | **Excelente componente**. No hay tablas HTML duplicadas en listados generales. |
| **`Modal`** | `src/components/Modal.tsx` | Diálogo emergente accesible (`role="dialog"`, `aria-modal`), bloqueo de foco, cierre con tecla Escape y clic en backdrop. Tamaños `sm` a `xl`. | Comprobantes, resumen de entrada, detalle de producto | `Button`, `lucide-react` (`X`) | Robusto. Base para todas las ventanas emergentes del sistema. |
| **`ConfirmModal`** | `src/components/Modal.tsx` | Diálogo de confirmación con icono de advertencia, variantes (`primary` / `danger`) y estado de carga. | `ProductForm`, `ExitCreatePage`, `ProfilePage` | `Modal`, `Button`, `AlertTriangle` | Reutilizado sistemáticamente para evitar confirmaciones nativas de `window.confirm`. |
| **`Badge`** | `src/components/Badge.tsx` | Píldora de estado con variantes cromáticas (`neutral`, `success`, `warning`, `danger`, `info`). | Tablas, tarjetas, modales | `lucide-react` | Base reutilizable. |
| **`BatchStatusBadge`** | `src/components/Badge.tsx` | Píldora especializada para vencimientos: Vigente (verde), Próximo a vencer (ámbar), Vencido (rojo). | Dashboard, Lotes, Inventario, Alertas | `Badge`, `lucide-react` | Estandariza la semaforización en todo el software. |
| **`StockLevelBadge`** | `src/components/Badge.tsx` | Píldora para niveles de stock: Normal, Stock bajo, Sin existencias. | Productos, Inventario, Reportes | `Badge`, `lucide-react` | Mantiene coherencia visual para alertas de reposición. |
| **`MovementTypeBadge`** | `src/components/Badge.tsx` | Píldora para tipo de movimiento: Entrada (azul/verde) o Salida (ámbar). | Kardex, Dashboard, Reportes | `Badge`, `lucide-react` | Reutilizado en todos los listados de movimientos. |
| **`ProductStatusBadge`** | `src/components/Badge.tsx` | Píldora para estado de producto: Activo / Inactivo. | Catálogo de productos y modales | `Badge`, `lucide-react` | Claridad visual en productos descontinuados. |
| **`Alert`** | `src/components/Alert.tsx` | Banner de alerta con variantes (`info`, `success`, `warning`, `error`), icono representativo y botón de acción opcional. | Login, Dashboard, Alertas, Formularios | `lucide-react` | Reutilizable y accesible (`role="alert"` / `role="status"`). |
| **`MetricCard`** | `src/components/MetricCard.tsx` | Tarjeta cuantitativa de KPI con título, valor grande, subtítulo, icono temático y enlace de navegación. | `DashboardPage.tsx` | `react-router-dom` | Modular y visualmente pulida. |
| **`PageHeader`** | `src/components/PageHeader.tsx` | Encabezado estándar con migas de pan (Breadcrumbs), título de pantalla, código de Caso de Uso y acciones. | Todas las páginas | `react-router-dom`, `lucide-react` | Asegura consistencia en toda la navegación. |
| **`Sidebar`** | `src/components/Sidebar.tsx` | Barra lateral responsiva con navegación agrupada, control de roles e insignia de alertas activas en tiempo real. | `AppLayout.tsx` | `NavLink`, `StockCareLogo`, `useStockCare` | Adaptable a móviles con backdrop oscuro. |
| **`Topbar`** | `src/components/Topbar.tsx` | Barra superior con botón hamburguesa (móvil), acceso a alertas y ficha rápida del usuario activo. | `AppLayout.tsx` | `react-router-dom`, `useStockCare` | Integra botón de alertas con contador dinámico. |
| **`ToastContainer`** | `src/components/ToastContainer.tsx` | Gestor flotante de notificaciones emergentes (Toasts) con auto-dismiss. | `App.tsx` | `useStockCare`, `lucide-react` | Renderiza mensajes de confirmación de operaciones. |
| **`StockCareLogo`** | `src/components/StockCareLogo.tsx` | Componente gráfico que renderiza la imagen oficial de StockCare en 4 escalas (`sm`, `md`, `lg`, `xl`). | Sidebar, Topbar, Login, Modales, Comprobantes | `stockcare-logo.png` | Centraliza el logo; evita `<img src="...">` dispersos. |

---

## 2. Diagnóstico de Duplicación y Componentes Faltantes

### 2.1 Duplicaciones Detectadas
- **Ninguna duplicación estructural severa.** La arquitectura de componentes está bien modularizada: se reutilizan `DataTable`, `Modal`, `Badge`, `Input` y `Button` en lugar de reinventar tablas o formularios ad-hoc.
- **Observación menor:** En `EntryReceiptModal.tsx` y `ProductDetailModal.tsx` existen pequeñas tablas `<table>` nativas en lugar de usar `DataTable`. Esto es justificado porque son tablas compactas de solo lectura dentro de un modal con estilos de impresión específicos.

### 2.2 Componentes Faltantes para la Fase III (Firebase)
1. **Paginador / Pagination Controls:** `DataTable` no tiene controles de paginación (`Paginator` con página previa, siguiente y tamaño de página). Al migrar a consultas indexadas con `limit(25)` en Firestore, se requerirá un componente de paginación.
2. **Selector de Rango de Fechas Integrado (`DateRangePicker`):** Actualmente se usan dos campos `<Input type="date">` separados en `MovementsPage` y `ReportsPage`.
3. **Selector con Búsqueda (`Autocomplete / Combobox`):** Para farmacias con catálogos superiores a 500 productos, el `<Select>` nativo en salidas o entradas resulta largo de scrollear; se beneficiaría de un buscador integrado.
