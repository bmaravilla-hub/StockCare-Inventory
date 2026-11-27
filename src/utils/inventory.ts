import type {
  Batch,
  BatchExpiryStatus,
  Product,
  StockLevelStatus,
} from '../types';
import { diffDaysFromToday } from './date';

export function getBatchExpiryStatus(
  expiryDate: string,
  alertThresholdDays = 60
): BatchExpiryStatus {
  const days = diffDaysFromToday(expiryDate);
  if (days < 0) return 'Vencido';
  if (days <= alertThresholdDays) return 'ProximoAVencer';
  return 'Vigente';
}

export function getProductTotalStock(productId: string, batches: Batch[]): number {
  return batches
    .filter((b) => b.productId === productId && b.quantity > 0)
    .reduce((acc, b) => acc + b.quantity, 0);
}

export function getProductActiveBatches(productId: string, batches: Batch[]): Batch[] {
  return batches
    .filter((b) => b.productId === productId && b.quantity > 0)
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
}

export function getStockLevelStatus(
  currentStock: number,
  minStock: number
): StockLevelStatus {
  if (currentStock <= 0) return 'SinExistencias';
  if (currentStock <= minStock) return 'StockBajo';
  return 'Normal';
}

export function getNearestExpiryDate(productId: string, batches: Batch[]): string | null {
  const active = getProductActiveBatches(productId, batches);
  return active.length > 0 ? active[0].expiryDate : null;
}

export function getExpiryStatusLabel(
  status: BatchExpiryStatus,
  daysRemaining: number
): string {
  if (status === 'Vencido') {
    const overdue = Math.abs(daysRemaining);
    return overdue === 1 ? 'Vencido (hace 1 día)' : `Vencido (hace ${overdue} días)`;
  }
  if (status === 'ProximoAVencer') {
    if (daysRemaining === 0) return 'Vence hoy';
    return daysRemaining === 1
      ? 'Próximo a vencer (1 día)'
      : `Próximo a vencer (${daysRemaining} días)`;
  }
  return 'Vigente';
}

export function getProductStockSummary(
  product: Product,
  batches: Batch[],
  alertThresholdDays = 60
) {
  const productBatches = getProductActiveBatches(product.id, batches);
  const totalStock = productBatches.reduce((sum, b) => sum + b.quantity, 0);
  const stockStatus = getStockLevelStatus(totalStock, product.minStock);
  const nearestExpiry = productBatches[0]?.expiryDate ?? null;
  const nearestStatus = nearestExpiry
    ? getBatchExpiryStatus(nearestExpiry, alertThresholdDays)
    : null;

  return {
    totalStock,
    stockStatus,
    activeBatchesCount: productBatches.length,
    nearestExpiry,
    nearestStatus,
    batches: productBatches,
  };
}

export interface ExpiredBatchAlert {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
  daysRemaining: number;
}

export interface ExpiringSoonBatchAlert {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
  daysRemaining: number;
}

export interface OutOfStockProductAlert {
  product: Product;
  currentStock: number;
  minStock: number;
}

export interface LowStockProductAlert {
  product: Product;
  currentStock: number;
  minStock: number;
}

export interface InventoryAlertsSummary {
  expiredBatches: ExpiredBatchAlert[];
  outOfStockProducts: OutOfStockProductAlert[];
  lowStockProducts: LowStockProductAlert[];
  expiringSoonBatches: ExpiringSoonBatchAlert[];
  totalAlerts: number;
}

/**
 * Calcula de manera centralizada y reactiva todas las alertas operativas del inventario:
 * Prioridad 1: Lotes vencidos con existencia física (expiryDate < hoy && quantity > 0)
 * Prioridad 2: Productos activos agotados (status == 'Activo' && currentStock == 0)
 * Prioridad 3: Productos activos con stock bajo (status == 'Activo' && currentStock > 0 && currentStock <= minStock)
 * Prioridad 4: Lotes próximos a vencer con existencia física (expiryDate >= hoy && expiryDate <= threshold && quantity > 0)
 *
 * Reglas de negocio:
 * - Lotes agotados (quantity == 0) NO alertan vencimiento.
 * - Productos inactivos (status == 'Inactivo') NO generan alertas de existencias.
 */
export function getInventoryAlerts(
  products: Product[],
  batches: Batch[],
  alertThresholdDays = 60
): InventoryAlertsSummary {
  const expiredBatches: ExpiredBatchAlert[] = [];
  const expiringSoonBatches: ExpiringSoonBatchAlert[] = [];

  // 1. Evaluar lotes con existencia física > 0
  for (const b of batches) {
    if (b.quantity <= 0) continue;
    const days = diffDaysFromToday(b.expiryDate);
    const prod = products.find((p) => p.id === b.productId);
    const item = {
      id: b.id,
      productId: b.productId,
      productCode: prod?.code ?? 'N/A',
      productName: prod?.name ?? 'Producto',
      batchNumber: b.batchNumber,
      quantity: b.quantity,
      expiryDate: b.expiryDate,
      daysRemaining: days,
    };

    if (days < 0) {
      expiredBatches.push(item);
    } else if (days <= alertThresholdDays) {
      expiringSoonBatches.push(item);
    }
  }

  // Ordenar lotes: más vencidos o próximos a vencer primero
  expiredBatches.sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
  expiringSoonBatches.sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

  // 2. Evaluar productos activos (los inactivos NO generan alertas operativas)
  const activeProducts = products.filter((p) => p.status === 'Activo');
  const outOfStockProducts: OutOfStockProductAlert[] = [];
  const lowStockProducts: LowStockProductAlert[] = [];

  for (const p of activeProducts) {
    const stock = typeof p.currentStock === 'number' ? p.currentStock : getProductTotalStock(p.id, batches);
    if (stock === 0) {
      outOfStockProducts.push({
        product: p,
        currentStock: 0,
        minStock: p.minStock,
      });
    } else if (stock <= p.minStock) {
      lowStockProducts.push({
        product: p,
        currentStock: stock,
        minStock: p.minStock,
      });
    }
  }

  // Ordenar productos: alfabéticamente por código y nombre
  outOfStockProducts.sort((a, b) => a.product.name.localeCompare(b.product.name));
  lowStockProducts.sort((a, b) => a.product.name.localeCompare(b.product.name));

  const totalAlerts =
    expiredBatches.length +
    outOfStockProducts.length +
    lowStockProducts.length +
    expiringSoonBatches.length;

  return {
    expiredBatches,
    outOfStockProducts,
    lowStockProducts,
    expiringSoonBatches,
    totalAlerts,
  };
}

