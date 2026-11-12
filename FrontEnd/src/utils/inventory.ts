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

