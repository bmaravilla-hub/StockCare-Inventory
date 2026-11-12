export type UserRole = 'ADMIN' | 'BODEGA';

export interface UserSession {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  roleLabel: string;
  branch: string;
  lastLogin: string;
}

export interface DemoAccount {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  roleLabel: string;
  branch: string;
  description: string;
}

export interface SystemSettings {
  pharmacyName: string;
  branchName: string;
  branchAddress: string;
  phone: string;
  expiryAlertDays: number;
}

export type ProductStatus = 'Activo' | 'Inactivo';

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  presentation: string;
  minStock: number;
  status: ProductStatus;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Batch {
  id: string;
  productId: string;
  batchNumber: string;
  quantity: number;
  initialQuantity: number;
  expiryDate: string; // YYYY-MM-DD
  entryId: string;
  createdAt: string;
}

export type BatchExpiryStatus = 'Vigente' | 'ProximoAVencer' | 'Vencido';

export type StockLevelStatus = 'Normal' | 'StockBajo' | 'SinExistencias';

export interface EntryItem {
  id: string;
  productId: string;
  quantity: number;
  batchNumber: string;
  expiryDate: string; // YYYY-MM-DD
}

export interface EntryRecord {
  id: string;
  documentNumber: string;
  provider: string;
  date: string; // YYYY-MM-DD
  notes?: string;
  registeredBy: string;
  createdAt: string;
  items: EntryItem[];
}

export type ExitReason =
  | 'Venta'
  | 'Descarte por vencimiento'
  | 'Uso interno'
  | 'Devolución a proveedor'
  | 'Ajuste de inventario';

export interface ExitRecord {
  id: string;
  productId: string;
  batchId: string;
  batchNumber: string;
  quantity: number;
  reason: ExitReason;
  reference: string;
  date: string; // YYYY-MM-DD
  notes?: string;
  registeredBy: string;
  createdAt: string;
}

export type MovementType = 'Entrada' | 'Salida';

export interface MovementRecord {
  id: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
  productId: string;
  batchNumber: string;
  type: MovementType;
  quantity: number;
  user: string;
  reference: string;
  detail: string;
  resultingStock: number;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
}

