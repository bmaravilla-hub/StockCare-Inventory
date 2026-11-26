import { useContext } from 'react';
import { StockCareContext } from '../services/StockCareContext';

export function useStockCare() {
  const ctx = useContext(StockCareContext);
  if (!ctx) {
    throw new Error('useStockCare debe utilizarse dentro de StockCareProvider');
  }
  return ctx;
}

