# 09 — REGLAS DE NEGOCIO ACTUALES DE STOCKCARE

**Proyecto:** StockCare — Sistema de Gestión y Control de Inventario para Farmacia  
**Materia:** Análisis y Diseño de Sistemas (ADS) — Universidad Don Bosco  
**Fecha de Auditoría:** 26 de Noviembre de 2026  
**Criterio de Evaluación:** Verificación de enforcement real en código frontend y servicios.

---

## 1. Escala de Clasificación

- **IMPLEMENTADA:** La regla está programada, validada en formulario y procesada en el estado/servicios con bloqueo estricto ante violaciones.
- **PARCIAL:** La regla se cumple en ciertos flujos pero presenta excepciones o carece de validación en el backend/reglas.
- **SOLO UI:** Existe una indicación visual (texto, tooltip, color) pero no hay código que impida la acción prohibida.
- **NO IMPLEMENTADA:** No existe lógica ni interfaz para la regla especificada.
- **INCONSISTENTE:** La regla está implementada de manera contradictoria entre distintas pantallas o servicios.

---

## 2. Matriz de Auditoría de Reglas de Negocio

| Dominio | Regla de Negocio Específica | Ubicación en Código | Clasificación | Análisis y Comportamiento Real |
| :--- | :--- | :--- | :---: | :--- |
| **PRODUCTOS** | Código de producto único | `StockCareContext.tsx:359`, `ProductForm.tsx:52` | **IMPLEMENTADA** | Verifica `state.products.some(p => p.code === cleanCode)`. En edición excluye el ID propio. Rechaza duplicados. |
| **PRODUCTOS** | Formato de código alfanumérico | `ProductForm.tsx:54` | **IMPLEMENTADA** | Valida mediante expresión regular `^[A-Z0-9-]+$` sin espacios. Transforma a mayúsculas automáticamente. |
| **PRODUCTOS** | Estado del producto (Activo/Inactivo) | `types/index.ts:33`, `ProductForm.tsx:181` | **IMPLEMENTADA** | Los productos inactivos se ocultan de los selectores de entradas, salidas e inventario, pero se conservan en histórico. |
| **PRODUCTOS** | Stock mínimo mayor o igual a cero | `StockCareContext.tsx:356`, `ProductForm.tsx:73` | **IMPLEMENTADA** | Exige número entero no negativo. Determina el umbral de disparo de la alerta de reposición. |
| **ENTRADAS** | Cantidad mayor a cero y entera | `StockCareContext.tsx:474`, `EntryCreatePage.tsx:103` | **IMPLEMENTADA** | `Number.isInteger(qty) && qty > 0`. Bloquea cantidades con decimales, negativas o cero. |
| **ENTRADAS** | Proveedor obligatorio | `StockCareContext.tsx:453`, `EntryCreatePage.tsx:81` | **IMPLEMENTADA** | Exige seleccionar de la lista o ingresar texto si se marca "Otro proveedor". |
| **ENTRADAS** | Fecha de recepción no futura | `utils/date.ts:63`, `StockCareContext.tsx:459` | **IMPLEMENTADA** | `isValidNotFutureDate(date)`. Impide registrar recepciones con fecha de mañana o posterior. |
| **ENTRADAS** | Fecha de vencimiento futura o de hoy | `utils/date.ts:57`, `StockCareContext.tsx:483` | **IMPLEMENTADA** | `isValidFutureOrTodayDate(expiryDate)`. **Bloquea estrictamente la recepción de mercadería ya vencida**. |
| **ENTRADAS** | Incremento automático de existencias | `StockCareContext.tsx:538` | **IMPLEMENTADA** | Si el lote ya existe (mismo código y vencimiento), incrementa su `quantity` e `initialQuantity`; si no, crea uno nuevo. |
| **ENTRADAS** | Comprobante de recepción automático | `EntryReceiptModal.tsx` | **IMPLEMENTADA** | Cumple DFD 1.5. Muestra comprobante formal con botón de impresión directa tras confirmar la entrada. |
| **SALIDAS** | Cantidad mayor a cero y entera | `StockCareContext.tsx:610`, `ExitCreatePage.tsx:102` | **IMPLEMENTADA** | Bloquea decimales, ceros y números negativos. |
| **SALIDAS** | Selección de lote específico | `StockCareContext.tsx:601`, `ExitCreatePage.tsx:97` | **IMPLEMENTADA** | Exige vincular la salida a un lote existente del producto seleccionado. |
| **SALIDAS** | Evitar stock negativo en el lote | `StockCareContext.tsx:626`, `ExitCreatePage.tsx:106` | **IMPLEMENTADA** | `input.quantity <= batch.quantity`. Bloquea si la cantidad solicitada supera las unidades del lote. |
| **SALIDAS** | Evitar stock negativo global | `StockCareContext.tsx:645` | **IMPLEMENTADA** | `input.quantity <= currentTotal`. Doble validación contra el stock total del producto. |
| **SALIDAS** | Prohibición de venta de lotes vencidos | `StockCareContext.tsx:637`, `ExitCreatePage.tsx:111` | **IMPLEMENTADA** | Si `status === 'Vencido'` y `reason === 'Venta'`, rechaza la salida. Exige 'Descarte por vencimiento' o 'Devolución'. |
| **SALIDAS** | Descremento de existencias | `StockCareContext.tsx:672` | **IMPLEMENTADA** | Resta unidades del lote y del stock global; actualiza el saldo en el movimiento Kardex. |
| **LOTES** | Lote vinculado estrictamente a producto | `types/index.ts:50`, `StockCareContext.tsx:545` | **IMPLEMENTADA** | Todo lote almacena obligatoriamente `productId` y `entryId`. |
| **LOTES** | Control de existencias por lote | `types/index.ts:52`, `BatchesPage.tsx` | **IMPLEMENTADA** | Cada lote almacena `initialQuantity` y `quantity` disponible remanente. |
| **LOTES** | Estrategia de rotación FEFO | `ExitCreatePage.tsx:194`, `BatchesPage.tsx:73` | **IMPLEMENTADA** | Los selectores de lotes y listados ordenan automáticamente por fecha de vencimiento más próxima primero. |
| **VENCIMIENTOS**| Clasificación en 3 estados | `utils/inventory.ts:9` | **IMPLEMENTADA** | 1. 'Vencido' (`días < 0`). 2. 'ProximoAVencer' (`0 <= días <= umbral`). 3. 'Vigente' (`días > umbral`). |
| **VENCIMIENTOS**| Umbral de alerta dinámico | `utils/inventory.ts:11`, `ProfilePage.tsx:250` | **IMPLEMENTADA** | Configurable a 30, 60 o 90 días en la configuración del sistema. Recalcula semáforos globalmente. |
| **MOVIMIENTOS** | Trazabilidad completa (Kardex) | `StockCareContext.tsx:562, 682` | **IMPLEMENTADA** | Registra: `id`, `date`, `createdAt`, `productId`, `batchNumber`, `type`, `quantity`, `user`, `reference`, `detail`, `resultingStock`. |
| **MOVIMIENTOS** | Inmutabilidad de movimientos | `firestore.rules:143` | **IMPLEMENTADA** | No existe en UI ni servicios función de modificación o borrado de movimientos históricos. |
| **AJUSTES** | Registro formal de ajuste físico | Inexistente | **NO IMPLEMENTADA** | Solo existe 'Ajuste de inventario' como motivo en salidas. No registra stock anterior vs nuevo, ni ajuste positivo. |
| **ALERTAS** | Detección de stock bajo / agotado | `utils/inventory.ts:31`, `AlertsPage.tsx:65` | **IMPLEMENTADA** | Normal (`stock > minStock`), Stock Bajo (`0 < stock <= minStock`), Sin Existencias (`stock <= 0`). |
| **ALERTAS** | Notificación en barra superior | `Topbar.tsx:14`, `Sidebar.tsx:37` | **IMPLEMENTADA** | Insignia numérica con contador en tiempo real de lotes en riesgo y productos bajos. |

---

## 3. Diagnóstico de Fortalezas y Carencias de Negocio

### Fortalezas Relevantes
1. **La regla de bloqueo de venta para lotes vencidos** está implementada de manera excepcional en `ExitCreatePage.tsx` y reforzada en `StockCareContext.tsx:637`.
2. **La coherencia matemática de existencias** está garantizada: ninguna salida puede dejar en negativo un lote ni el inventario total.
3. **El algoritmo de ordenamiento FEFO (First Expired, First Out)** se aplica consistentemente en la interfaz de despacho.

### Carencias por Subsanar en Fase de Implementación
1. **Falta de Módulo de Ajustes Físicos:** Se requiere una funcionalidad de conciliación de inventario con motivo, usuario supervisor, conteo físico, diferencia (+ / -) y generación de movimientos Kardex de ajuste.
2. **Validación de reglas en el Servidor (Security Rules):** Si bien el frontend valida estrictamente todas las reglas, un usuario malintencionado con el SDK de Firebase podría intentar escribir cantidades negativas si las reglas de seguridad de Firestore no duplican estas restricciones.
