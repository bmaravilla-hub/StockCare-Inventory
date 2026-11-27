/**
 * Constantes de dominio de negocio para StockCare.
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

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const EXIT_REASONS = [
  'Venta',
  'Descarte por vencimiento',
  'Uso interno',
  'Devolución a proveedor',
  'Ajuste de inventario',
] as const;

export type ExitReasonOption = (typeof EXIT_REASONS)[number];
