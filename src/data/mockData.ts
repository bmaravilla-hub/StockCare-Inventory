/**
 * Constantes de dominio de negocio para StockCare.
 * 
 * NOTA DE AUDITORÍA Y LIMPIEZA:
 * Se eliminaron todos los mocks de datos transaccionales (INITIAL_PRODUCTS, INITIAL_ENTRIES,
 * INITIAL_EXITS, DEMO_ACCOUNTS, INITIAL_SETTINGS, buildInitialInventoryState).
 * Únicamente se conservan catálogos/enums fijos requeridos por la lógica de negocio.
 */

export const PRODUCT_CATEGORIES = [
  'Analgésicos',
  'Antibióticos',
  'Antiinflamatorios',
  'Antihipertensivos',
  'Antihistamínicos',
  'Antigripales',
  'Gastrointestinales',
  'Hidratación',
  'Respiratorios',
  'Antisépticos e Insumos',
  'Insumos Médicos',
] as const;

export const EXIT_REASONS = [
  'Venta',
  'Descarte por vencimiento',
  'Uso interno',
  'Devolución a proveedor',
  'Ajuste de inventario',
] as const;
