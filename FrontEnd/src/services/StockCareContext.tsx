import React, { createContext, useCallback, useEffect, useState } from 'react';
import type {
  Batch,
  EntryItem,
  EntryRecord,
  ExitReason,
  ExitRecord,
  MovementRecord,
  Product,
  ProductStatus,
  SystemSettings,
  ToastMessage,
  UserRole,
  UserSession,
} from '../types';
import { DEMO_ACCOUNTS } from '../data/mockData';
import {
  clearInventoryState,
  loadInventoryState,
  loadUserSession,
  saveInventoryState,
  saveUserSession,
  type PersistedInventoryState,
} from './storageService';
import { getBatchExpiryStatus, getProductTotalStock } from '../utils/inventory';
import { isValidFutureOrTodayDate, isValidNotFutureDate } from '../utils/date';
import {
  obtenerInventario,
  obtenerLotes,
  registrarEntrada,
} from './api';

export interface ProductInput {
  code: string;
  name: string;
  category: string;
  presentation: string;
  minStock: number;
  status: ProductStatus;
  description?: string;
}

export interface EntryInput {
  provider: string;
  documentNumber: string;
  date: string;
  notes?: string;
  items: Array<{
    productId: string;
    quantity: number;
    batchNumber: string;
    expiryDate: string;
  }>;
}

export interface ExitInput {
  productId: string;
  batchId: string;
  quantity: number;
  reason: ExitReason;
  reference: string;
  date: string;
  notes?: string;
}

export interface ActionResult<T = undefined> {
  ok: boolean;
  error?: string;
  data?: T;
}

export interface StockCareContextValue {
  session: UserSession | null;
  products: Product[];
  entries: EntryRecord[];
  exits: ExitRecord[];
  batches: Batch[];
  movements: MovementRecord[];
  settings: SystemSettings;
  toasts: ToastMessage[];
  login: (username: string, roleOverride?: UserRole) => Promise<ActionResult<UserSession>>;
  logout: () => void;
  updateProfile: (payload: { fullName: string; email: string }) => void;
  updateSettings: (next: SystemSettings) => void;
  resetDemoData: () => void;
  createProduct: (input: ProductInput) => ActionResult<Product>;
  updateProduct: (id: string, input: ProductInput) => ActionResult<Product>;
  registerEntry: (input: EntryInput) => Promise<ActionResult<EntryRecord>>;
  registerExit: (input: ExitInput) => ActionResult<ExitRecord>;
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
}

export const StockCareContext = createContext<StockCareContextValue | null>(null);

export const StockCareProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<UserSession | null>(() => loadUserSession());
  const [state, setState] = useState<PersistedInventoryState>(() =>
    loadInventoryState()
  );
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

useEffect(() => {
  saveInventoryState(state);
}, [state]);

useEffect(() => {
  saveUserSession(session);
}, [session]);

const dismissToast = useCallback((id: string) => {
  setToasts((prev) => prev.filter((t) => t.id !== id));
}, []);

const addToast = useCallback(
  (toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    setToasts((prev) => [...prev, { ...toast, id }]);

    setTimeout(() => {
      dismissToast(id);
    }, 4500);
  },
  [dismissToast]
);

useEffect(() => {
  const cargarInventario = async () => {
    try {
      const [datos, lotes] = await Promise.all([
        obtenerInventario(),
        obtenerLotes(),
      ]);

      setState((prev) => ({
        ...prev,

        products: datos.map((producto) => ({
          id: String(producto.id_producto),
          code: producto.codigo_barra,
          name: producto.nombre_producto,
          category: 'Sin categoría',
          presentation: 'No especificada',
          minStock: producto.stock_minimo ?? 0,
          status: 'Activo' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          description: `Precio unitario: $${producto.precio_unitario}`,
        })),

        batches: lotes.map((lote) => ({
          id: String(lote.id_lote),
          productId: String(lote.id_producto),
          batchNumber: lote.numero_lote,
          quantity: lote.stock_lote,
          initialQuantity: lote.stock_lote,
          expiryDate: String(lote.fecha_vencimiento).split('T')[0],
          entryId: '',
          createdAt: new Date().toISOString(),
        })),
      }));
    } catch (error) {
      console.error('Error al cargar inventario:', error);

      addToast({
        type: 'error',
        title: 'Error de conexión',
        message: 'No se pudo cargar el inventario desde SQL Server.',
      });
    }
  };

  cargarInventario();
}, [addToast]);

const login = useCallback(
async (
usernameInput: string,
roleOverride?: UserRole
): Promise<ActionResult<UserSession>> => {
await new Promise((resolve) => setTimeout(resolve, 350));
const normalized = usernameInput.trim().toLowerCase();

const account = roleOverride
  ? DEMO_ACCOUNTS.find((a) => a.role === roleOverride)
  : DEMO_ACCOUNTS.find(
      (a) =>
        a.username.toLowerCase() === normalized ||
        a.email.toLowerCase() === normalized
    );

if (!account) {
  return {
    ok: false,
    error:
      'Usuario no reconocido. Utilice "admin" o "bodega", o seleccione un acceso rápido.',
  };
}

const newSession: UserSession = {
  id: account.id,
  username: account.username,
  fullName: account.fullName,
  email: account.email,
  role: account.role,
  roleLabel: account.roleLabel,
  branch: account.branch,
  lastLogin: new Date().toISOString(),
};

setSession(newSession);
addToast({
  type: 'success',
  title: `Bienvenido, ${newSession.fullName}`,
  message: `Sesión iniciada como ${newSession.roleLabel}.`,
});

return { ok: true, data: newSession };

},
[addToast]
);

  const logout = useCallback(() => {
    setSession(null);
    addToast({
      type: 'info',
      title: 'Sesión cerrada',
      message: 'Ha finalizado su sesión en StockCare de forma segura.',
    });
  }, [addToast]);

  const updateProfile = useCallback(
    (payload: { fullName: string; email: string }) => {
      setSession((prev) =>
        prev
          ? {
              ...prev,
              fullName: payload.fullName.trim(),
              email: payload.email.trim(),
            }
          : null
      );
      addToast({
        type: 'success',
        title: 'Perfil actualizado',
        message: 'Sus datos de usuario han sido guardados.',
      });
    },
    [addToast]
  );

  const updateSettings = useCallback(
    (next: SystemSettings) => {
      setState((prev) => ({
        ...prev,
        settings: next,
      }));
      addToast({
        type: 'success',
        title: 'Configuración guardada',
        message: 'Los parámetros generales del sistema fueron actualizados.',
      });
    },
    [addToast]
  );

  const resetDemoData = useCallback(() => {
    const fresh = clearInventoryState();
    setState(fresh);
    addToast({
      type: 'info',
      title: 'Datos restablecidos',
      message: 'Se restauró el conjunto inicial de datos de prueba.',
    });
  }, [addToast]);

  const createProduct = useCallback(
    (input: ProductInput): ActionResult<Product> => {
      const cleanCode = input.code.trim().toUpperCase();
      const cleanName = input.name.trim();
      if (!cleanCode || !cleanName || !input.category.trim() || !input.presentation.trim()) {
        return { ok: false, error: 'Complete todos los campos obligatorios del producto.' };
      }
      if (input.minStock < 0 || !Number.isFinite(input.minStock)) {
        return { ok: false, error: 'El stock mínimo no puede ser negativo.' };
      }
      const duplicate = state.products.some(
        (p) => p.code.toUpperCase() === cleanCode
      );
      if (duplicate) {
        return {
          ok: false,
          error: `Ya existe un producto registrado con el código ${cleanCode}.`,
        };
      }

      const now = new Date().toISOString();
      const newProduct: Product = {
        id: `prod-${Date.now()}`,
        code: cleanCode,
        name: cleanName,
        category: input.category.trim(),
        presentation: input.presentation.trim(),
        minStock: Math.floor(input.minStock),
        status: input.status,
        description: input.description?.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };

      setState((prev) => ({
        ...prev,
        products: [newProduct, ...prev.products],
      }));

      addToast({
        type: 'success',
        title: 'Producto registrado',
        message: `${newProduct.code} — ${newProduct.name}`,
      });

      return { ok: true, data: newProduct };
    },
    [state.products, addToast]
  );

  const updateProduct = useCallback(
    (id: string, input: ProductInput): ActionResult<Product> => {
      const existing = state.products.find((p) => p.id === id);
      if (!existing) {
        return { ok: false, error: 'El producto solicitado no existe.' };
      }
      const cleanCode = input.code.trim().toUpperCase();
      const duplicate = state.products.some(
        (p) => p.id !== id && p.code.toUpperCase() === cleanCode
      );
      if (duplicate) {
        return {
          ok: false,
          error: `Otro producto ya utiliza el código ${cleanCode}.`,
        };
      }
      if (input.minStock < 0 || !Number.isFinite(input.minStock)) {
        return { ok: false, error: 'El stock mínimo no puede ser negativo.' };
      }

      const updated: Product = {
        ...existing,
        code: cleanCode,
        name: input.name.trim(),
        category: input.category.trim(),
        presentation: input.presentation.trim(),
        minStock: Math.floor(input.minStock),
        status: input.status,
        description: input.description?.trim() || undefined,
        updatedAt: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        products: prev.products.map((p) => (p.id === id ? updated : p)),
      }));

      addToast({
        type: 'success',
        title: 'Producto actualizado',
        message: `${updated.code} — ${updated.name}`,
      });

      return { ok: true, data: updated };
    },
    [state.products, addToast]
  );

  const registerEntry = useCallback(
    async (input: EntryInput): Promise<ActionResult<EntryRecord>> => {
    if (!input.provider.trim() || !input.documentNumber.trim() || !input.date) {
    return {
    ok: false,
    error: 'Proveedor, número de documento y fecha son obligatorios.',
    };
    }

    if (!isValidNotFutureDate(input.date)) {
      return {
        ok: false,
        error: 'La fecha de recepción no puede ser posterior al día de hoy.',
      };
    }

    if (input.items.length === 0) {
      return {
        ok: false,
        error: 'Debe agregar al menos un producto a la recepción.',
      };
    }

    for (let i = 0; i < input.items.length; i++) {
      const item = input.items[i];

      if (!item.productId) {
        return { ok: false, error: `Línea ${i + 1}: Seleccione un producto.` };
      }

      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        return {
          ok: false,
          error: `Línea ${i + 1}: La cantidad debe ser un número entero mayor que cero.`,
        };
      }

      if (!item.batchNumber.trim()) {
        return { ok: false, error: `Línea ${i + 1}: Ingrese el número de lote.` };
      }

      if (!isValidFutureOrTodayDate(item.expiryDate)) {
        return {
          ok: false,
          error: `Línea ${i + 1}: La fecha de vencimiento es inválida o corresponde a un producto ya vencido.`,
        };
      }
    }

    // Enviar todos los productos a SQL Server
    try {
      await registrarEntrada({
        items: input.items.map((item) => ({
          id_producto: Number(item.productId),
          numero_lote: item.batchNumber.trim().toUpperCase(),
          fecha_vencimiento: item.expiryDate,
          cantidad: item.quantity,
        })),
      });
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo registrar la entrada en la base de datos.',
      };
    }

    // Actualizar el estado local después de confirmar el registro
    const now = new Date().toISOString();
    const entryId = `ent-${Date.now()}`;
    const userName = session?.fullName ?? 'Personal de Bodega';

    const normalizedItems: EntryItem[] = input.items.map((item, idx) => ({
      id: `${entryId}-${idx + 1}`,
      productId: item.productId,
      quantity: item.quantity,
      batchNumber: item.batchNumber.trim().toUpperCase(),
      expiryDate: item.expiryDate,
    }));

    const newEntry: EntryRecord = {
      id: entryId,
      documentNumber: input.documentNumber.trim().toUpperCase(),
      provider: input.provider.trim(),
      date: input.date,
      notes: input.notes?.trim() || undefined,
      registeredBy: userName,
      createdAt: now,
      items: normalizedItems,
    };

    const nextBatches = [...state.batches];
    const newMovements: MovementRecord[] = [];
    const runningStockByProduct = new Map<string, number>();

    for (const prod of state.products) {
      runningStockByProduct.set(
        prod.id,
        getProductTotalStock(prod.id, nextBatches)
      );
    }

    normalizedItems.forEach((item, idx) => {
      const existingBatchIdx = nextBatches.findIndex(
        (b) =>
          b.productId === item.productId &&
          b.batchNumber.toUpperCase() === item.batchNumber.toUpperCase() &&
          b.expiryDate === item.expiryDate
      );

      if (existingBatchIdx >= 0) {
        const existingBatch = nextBatches[existingBatchIdx];

        nextBatches[existingBatchIdx] = {
          ...existingBatch,
          quantity: existingBatch.quantity + item.quantity,
          initialQuantity: existingBatch.initialQuantity + item.quantity,
        };
      } else {
        nextBatches.push({
          id: `lot-${item.id}`,
          productId: item.productId,
          batchNumber: item.batchNumber,
          quantity: item.quantity,
          initialQuantity: item.quantity,
          expiryDate: item.expiryDate,
          entryId: newEntry.id,
          createdAt: now,
        });
      }

      const nextStock =
        (runningStockByProduct.get(item.productId) ?? 0) + item.quantity;

      runningStockByProduct.set(item.productId, nextStock);

      newMovements.push({
        id: `mov-${newEntry.id}-${idx + 1}`,
        date: newEntry.date,
        createdAt: now,
        productId: item.productId,
        batchNumber: item.batchNumber,
        type: 'Entrada',
        quantity: item.quantity,
        user: userName,
        reference: newEntry.documentNumber,
        detail: `Recepción de ${newEntry.provider}`,
        resultingStock: nextStock,
      });
    });

    setState((prev) => ({
      ...prev,
      entries: [newEntry, ...prev.entries],
      batches: nextBatches,
      movements: [...newMovements.reverse(), ...prev.movements],
    }));

    addToast({
      type: 'success',
      title: 'Entrada registrada correctamente',
      message: `Documento ${newEntry.documentNumber} (${normalizedItems.length} línea/s) actualizado en inventario.`,
    });

    return { ok: true, data: newEntry };

    },
    [session, state.batches, state.products, addToast]
    );

  const registerExit = useCallback(
    (input: ExitInput): ActionResult<ExitRecord> => {
      if (!input.productId || !input.batchId || !input.reason || !input.date) {
        return { ok: false, error: 'Complete todos los campos obligatorios de la salida.' };
      }
      if (!isValidNotFutureDate(input.date)) {
        return {
          ok: false,
          error: 'La fecha de salida no puede ser posterior al día de hoy.',
        };
      }
      if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
        return {
          ok: false,
          error: 'La cantidad a retirar debe ser mayor que cero.',
        };
      }

      const batch = state.batches.find(
        (b) => b.id === input.batchId && b.productId === input.productId
      );
      if (!batch || batch.quantity <= 0) {
        return {
          ok: false,
          error: 'El lote seleccionado no cuenta con existencias disponibles.',
        };
      }
      if (input.quantity > batch.quantity) {
        return {
          ok: false,
          error: `La cantidad solicitada (${input.quantity}) supera la existencia disponible del lote ${batch.batchNumber} (${batch.quantity} unidades).`,
        };
      }

      const expiryStatus = getBatchExpiryStatus(
        batch.expiryDate,
        state.settings.expiryAlertDays
      );
      if (expiryStatus === 'Vencido' && input.reason === 'Venta') {
        return {
          ok: false,
          error: `El lote ${batch.batchNumber} se encuentra vencido. No puede registrarse como "Venta"; seleccione "Descarte por vencimiento" o "Devolución a proveedor".`,
        };
      }

      const currentTotal = getProductTotalStock(input.productId, state.batches);
      if (input.quantity > currentTotal) {
        return {
          ok: false,
          error: 'La cantidad solicitada supera la existencia total del producto.',
        };
      }

      const now = new Date().toISOString();
      const userName = session?.fullName ?? 'Personal de Bodega';
      const referenceCode =
        input.reference.trim().toUpperCase() ||
        `SAL-${new Date().getFullYear()}-${String(state.exits.length + 101).padStart(4, '0')}`;

      const newExit: ExitRecord = {
        id: `sal-${Date.now()}`,
        productId: input.productId,
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        quantity: input.quantity,
        reason: input.reason,
        reference: referenceCode,
        date: input.date,
        notes: input.notes?.trim() || undefined,
        registeredBy: userName,
        createdAt: now,
      };

      const nextBatches = state.batches.map((b) =>
        b.id === batch.id ? { ...b, quantity: b.quantity - input.quantity } : b
      );
      const nextStock = currentTotal - input.quantity;

      const newMovement: MovementRecord = {
        id: `mov-${newExit.id}`,
        date: newExit.date,
        createdAt: now,
        productId: input.productId,
        batchNumber: batch.batchNumber,
        type: 'Salida',
        quantity: input.quantity,
        user: userName,
        reference: newExit.reference,
        detail: newExit.reason,
        resultingStock: nextStock,
      };

      setState((prev) => ({
        ...prev,
        exits: [newExit, ...prev.exits],
        batches: nextBatches,
        movements: [newMovement, ...prev.movements],
      }));

      addToast({
        type: 'success',
        title: 'Salida registrada correctamente',
        message: `Se descontaron ${input.quantity} unidades del lote ${batch.batchNumber}.`,
      });

      return { ok: true, data: newExit };
    },
    [session, state.batches, state.exits.length, state.settings.expiryAlertDays, addToast]
  );

  return (
    <StockCareContext.Provider
      value={{
        session,
        products: state.products,
        entries: state.entries,
        exits: state.exits,
        batches: state.batches,
        movements: state.movements,
        settings: state.settings,
        toasts,
        login,
        logout,
        updateProfile,
        updateSettings,
        resetDemoData,
        createProduct,
        updateProduct,
        registerEntry,
        registerExit,
        addToast,
        dismissToast,
      }}
    >
      {children}
    </StockCareContext.Provider>
  );
};

