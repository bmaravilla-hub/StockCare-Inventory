import React, { createContext, useCallback, useEffect, useState } from 'react';
import type {
  Batch,
  EntryInput,
  EntryRecord,
  ExitReason,
  ExitRecord,
  MovementRecord,
  Product,
  ProductStatus,
  Supplier,
  SupplierInput,
  SystemSettings,
  ToastMessage,
  UserSession,
} from '../types';
import { getBatchExpiryStatus, getProductTotalStock } from '../utils/inventory';
import { isValidNotFutureDate } from '../utils/date';
import { isFirebaseConfigured } from './firebase';
import {
  loginWithEmail as fbLoginEmail,
  registerWithEmail as fbRegisterEmail,
  loginWithGoogle as fbLoginGoogle,
  logoutUser as fbLogout,
  subscribeToAuthChanges,
  updateUserProfile,
} from './authService';
import {
  fetchFirestoreInventory,
  persistBatch,
  persistExit,
  persistMovement,
  persistSettings,
  DEFAULT_SYSTEM_SETTINGS,
  subscribeToProducts,
  createProductFirestore,
  updateProductFirestore,
  subscribeToSuppliers,
  createSupplierFirestore,
  updateSupplierFirestore,
  subscribeToEntries,
  subscribeToBatches,
  registerEntryFirestore,
} from './firestoreService';

export interface ProductInput {
  code: string;
  name: string;
  category: string;
  presentation: string;
  minStock: number;
  status: ProductStatus;
  description?: string;
}

export type { EntryInput } from '../types';

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

export interface InventoryState {
  exits: ExitRecord[];
  movements: MovementRecord[];
  settings: SystemSettings;
}

const INITIAL_STATE: InventoryState = {
  exits: [],
  movements: [],
  settings: DEFAULT_SYSTEM_SETTINGS,
};

export interface StockCareContextValue {
  session: UserSession | null;
  isAuthReady: boolean;
  products: Product[];
  isLoadingProducts: boolean;
  productsError: string | null;
  suppliers: Supplier[];
  isSuppliersLoading: boolean;
  isLoadingSuppliers: boolean;
  suppliersError: string | null;
  entries: EntryRecord[];
  isEntriesLoading: boolean;
  isLoadingEntries: boolean;
  entriesError: string | null;
  batches: Batch[];
  isBatchesLoading: boolean;
  isLoadingBatches: boolean;
  batchesError: string | null;
  exits: ExitRecord[];
  movements: MovementRecord[];
  settings: SystemSettings;
  toasts: ToastMessage[];
  isFirebaseConfigured: boolean;
  login: (email: string, pass: string) => Promise<ActionResult<UserSession>>;
  loginWithEmail: (email: string, pass: string) => Promise<ActionResult<UserSession>>;
  registerWithEmail: (
    email: string,
    pass: string,
    fullName: string
  ) => Promise<ActionResult<UserSession>>;
  loginWithGoogle: () => Promise<ActionResult<UserSession>>;
  logout: () => void;
  updateProfile: (payload: { fullName: string; branch?: string }) => Promise<ActionResult>;
  updateSettings: (next: SystemSettings) => void;
  createProduct: (input: ProductInput) => Promise<ActionResult<Product>>;
  updateProduct: (id: string, input: ProductInput) => Promise<ActionResult<Product>>;
  createSupplier: (input: SupplierInput) => Promise<ActionResult<Supplier>>;
  updateSupplier: (id: string, input: SupplierInput) => Promise<ActionResult<Supplier>>;
  registerEntry: (input: EntryInput) => Promise<ActionResult<EntryRecord>>;
  registerExit: (input: ExitInput) => ActionResult<ExitRecord>;
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
}

export const StockCareContext = createContext<StockCareContextValue | null>(null);

export const StockCareProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isSuppliersLoading, setIsSuppliersLoading] = useState(true);
  const [suppliersError, setSuppliersError] = useState<string | null>(null);
  const [entries, setEntries] = useState<EntryRecord[]>([]);
  const [isEntriesLoading, setIsEntriesLoading] = useState(true);
  const [entriesError, setEntriesError] = useState<string | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isBatchesLoading, setIsBatchesLoading] = useState(true);
  const [batchesError, setBatchesError] = useState<string | null>(null);
  const [state, setState] = useState<InventoryState>(INITIAL_STATE);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Suscribirse a cambios de estado de autenticación en Firebase
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((firebaseSession) => {
      setSession(firebaseSession);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Suscribirse en tiempo real al catálogo de productos en Cloud Firestore (onSnapshot)
  useEffect(() => {
    if (!isFirebaseConfigured || !isAuthReady) {
      return;
    }

    if (!session) {
      setProducts([]);
      setIsLoadingProducts(false);
      setProductsError(null);
      return;
    }

    setIsLoadingProducts(true);
    setProductsError(null);

    const unsubscribe = subscribeToProducts(
      (items) => {
        setProducts(items);
        setIsLoadingProducts(false);
        setProductsError(null);
      },
      (err) => {
        console.error('Error en suscripción de productos Firestore:', err);
        setProductsError('No fue posible sincronizar el catálogo de productos con la base de datos.');
        setIsLoadingProducts(false);
      }
    );

    return () => unsubscribe();
  }, [session?.id, isAuthReady]);

  // Suscribirse en tiempo real al catálogo de proveedores en Cloud Firestore (onSnapshot)
  useEffect(() => {
    if (!isFirebaseConfigured || !isAuthReady) {
      return;
    }

    if (!session) {
      setSuppliers([]);
      setIsSuppliersLoading(false);
      setSuppliersError(null);
      return;
    }

    setIsSuppliersLoading(true);
    setSuppliersError(null);

    const unsubscribe = subscribeToSuppliers(
      (items) => {
        setSuppliers(items);
        setIsSuppliersLoading(false);
        setSuppliersError(null);
      },
      (err) => {
        console.error('Error en suscripción de proveedores Firestore:', err);
        setSuppliersError('No fue posible sincronizar el catálogo de proveedores con la base de datos.');
        setIsSuppliersLoading(false);
      }
    );

    return () => unsubscribe();
  }, [session?.id, isAuthReady]);

  // Suscribirse en tiempo real al historial de entradas en Cloud Firestore (onSnapshot)
  useEffect(() => {
    if (!isFirebaseConfigured || !isAuthReady) {
      return;
    }

    if (!session) {
      setEntries([]);
      setIsEntriesLoading(false);
      setEntriesError(null);
      return;
    }

    setIsEntriesLoading(true);
    setEntriesError(null);

    const unsubscribe = subscribeToEntries(
      (items) => {
        setEntries(items);
        setIsEntriesLoading(false);
        setEntriesError(null);
      },
      (err) => {
        console.error('Error en suscripción de entradas Firestore:', err);
        setEntriesError('No fue posible sincronizar las entradas con la base de datos.');
        setIsEntriesLoading(false);
      }
    );

    return () => unsubscribe();
  }, [session?.id, isAuthReady]);

  // Suscribirse en tiempo real a los lotes en Cloud Firestore (onSnapshot)
  useEffect(() => {
    if (!isFirebaseConfigured || !isAuthReady) {
      return;
    }

    if (!session) {
      setBatches([]);
      setIsBatchesLoading(false);
      setBatchesError(null);
      return;
    }

    setIsBatchesLoading(true);
    setBatchesError(null);

    const unsubscribe = subscribeToBatches(
      (items) => {
        setBatches(items);
        setIsBatchesLoading(false);
        setBatchesError(null);
      },
      (err) => {
        console.error('Error en suscripción de lotes Firestore:', err);
        setBatchesError('No fue posible sincronizar los lotes con la base de datos.');
        setIsBatchesLoading(false);
      }
    );

    return () => unsubscribe();
  }, [session?.id, isAuthReady]);

  // Cargar inventario restante (exits, movements, settings) desde Firestore si el usuario está autenticado
  useEffect(() => {
    if (!isFirebaseConfigured || !isAuthReady || !session) return;
    let isMounted = true;
    fetchFirestoreInventory().then((remoteData) => {
      if (isMounted && remoteData) {
        setState({
          exits: remoteData.exits,
          movements: remoteData.movements,
          settings: remoteData.settings,
        });
      }
    });
    return () => {
      isMounted = false;
    };
  }, [session?.id, isAuthReady]);

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

  const loginWithEmailAction = useCallback(
    async (email: string, pass: string): Promise<ActionResult<UserSession>> => {
      const res = await fbLoginEmail(email, pass);
      if (res.ok && res.user) {
        setSession(res.user);
        addToast({
          type: 'success',
          title: `Bienvenido, ${res.user.fullName}`,
          message: `Sesión iniciada correctamente (${res.user.roleLabel}).`,
        });
        return { ok: true, data: res.user };
      }
      return { ok: false, error: res.error };
    },
    [addToast]
  );

  const registerWithEmailAction = useCallback(
    async (
      email: string,
      pass: string,
      fullName: string
    ): Promise<ActionResult<UserSession>> => {
      const res = await fbRegisterEmail(email, pass, fullName);
      if (res.ok && res.user) {
        setSession(res.user);
        addToast({
          type: 'success',
          title: 'Cuenta creada exitosamente',
          message: `Bienvenido a StockCare, ${res.user.fullName}.`,
        });
        return { ok: true, data: res.user };
      }
      return { ok: false, error: res.error };
    },
    [addToast]
  );

  const loginWithGoogleAction = useCallback(async (): Promise<ActionResult<UserSession>> => {
    const res = await fbLoginGoogle();
    if (res.ok && res.user) {
      setSession(res.user);
      addToast({
        type: 'success',
        title: `Bienvenido, ${res.user.fullName}`,
        message: `Sesión iniciada con Google en StockCare (${res.user.roleLabel}).`,
      });
      return { ok: true, data: res.user };
    }
    return { ok: false, error: res.error };
  }, [addToast]);

  const login = useCallback(
    async (
      emailInput: string,
      passwordInput?: string
    ): Promise<ActionResult<UserSession>> => {
      if (!passwordInput || !emailInput.trim()) {
        return {
          ok: false,
          error: 'Ingrese correo electrónico y contraseña válidos.',
        };
      }
      return loginWithEmailAction(emailInput.trim(), passwordInput);
    },
    [loginWithEmailAction]
  );

  const logout = useCallback(() => {
    fbLogout();
    setSession(null);
    addToast({
      type: 'info',
      title: 'Sesión cerrada',
      message: 'Ha finalizado su sesión en StockCare de forma segura.',
    });
  }, [addToast]);

  const updateProfile = useCallback(
    async (payload: { fullName: string; branch?: string }): Promise<ActionResult> => {
      if (!session) {
        return { ok: false, error: 'No hay una sesión activa.' };
      }
      const res = await updateUserProfile(session.id, payload);
      if (res.ok) {
        setSession((prev) =>
          prev
            ? {
                ...prev,
                fullName: payload.fullName.trim(),
                branch: payload.branch?.trim() || prev.branch,
                updatedAt: new Date().toISOString(),
              }
            : null
        );
        addToast({
          type: 'success',
          title: 'Perfil actualizado',
          message: 'Sus datos de usuario han sido guardados en Firestore.',
        });
        return { ok: true };
      } else {
        addToast({
          type: 'error',
          title: 'Error al actualizar',
          message: res.error ?? 'No fue posible guardar los cambios en su perfil.',
        });
        return { ok: false, error: res.error };
      }
    },
    [session, addToast]
  );

  const updateSettings = useCallback(
    (next: SystemSettings) => {
      setState((prev) => ({
        ...prev,
        settings: next,
      }));
      persistSettings(next);
      addToast({
        type: 'success',
        title: 'Configuración guardada',
        message: 'Los parámetros generales del sistema fueron actualizados.',
      });
    },
    [addToast]
  );

  const createProduct = useCallback(
    async (input: ProductInput): Promise<ActionResult<Product>> => {
      if (!session) {
        return { ok: false, error: 'Debe iniciar sesión para registrar un producto.' };
      }
      const res = await createProductFirestore(input, session.id);
      if (res.ok && res.data) {
        addToast({
          type: 'success',
          title: 'Producto registrado',
          message: `${res.data.code} — ${res.data.name}`,
        });
        return { ok: true, data: res.data };
      }
      return { ok: false, error: res.error };
    },
    [session, addToast]
  );

  const updateProduct = useCallback(
    async (id: string, input: ProductInput): Promise<ActionResult<Product>> => {
      if (!session) {
        return { ok: false, error: 'Debe iniciar sesión para actualizar un producto.' };
      }
      const res = await updateProductFirestore(id, input, session.id);
      if (res.ok && res.data) {
        addToast({
          type: 'success',
          title: 'Producto actualizado',
          message: `${res.data.code} — ${res.data.name}`,
        });
        return { ok: true, data: res.data };
      }
      return { ok: false, error: res.error };
    },
    [session, addToast]
  );

  const createSupplier = useCallback(
    async (input: SupplierInput): Promise<ActionResult<Supplier>> => {
      if (!session) {
        return { ok: false, error: 'Debe iniciar sesión para registrar un proveedor.' };
      }
      if (session.role !== 'BODEGA') {
        return {
          ok: false,
          error: 'Rol no autorizado. Solo el personal de BODEGA puede registrar proveedores.',
        };
      }
      const res = await createSupplierFirestore(input, session.id);
      if (res.ok && res.data) {
        addToast({
          type: 'success',
          title: 'Proveedor registrado',
          message: `${res.data.name}`,
        });
        return { ok: true, data: res.data };
      }
      return { ok: false, error: res.error };
    },
    [session, addToast]
  );

  const updateSupplier = useCallback(
    async (id: string, input: SupplierInput): Promise<ActionResult<Supplier>> => {
      if (!session) {
        return { ok: false, error: 'Debe iniciar sesión para actualizar un proveedor.' };
      }
      if (session.role !== 'BODEGA') {
        return {
          ok: false,
          error: 'Rol no autorizado. Solo el personal de BODEGA puede actualizar proveedores.',
        };
      }
      const res = await updateSupplierFirestore(id, input, session.id);
      if (res.ok && res.data) {
        addToast({
          type: 'success',
          title: 'Proveedor actualizado',
          message: `${res.data.name}`,
        });
        return { ok: true, data: res.data };
      }
      return { ok: false, error: res.error };
    },
    [session, addToast]
  );

  const registerEntry = useCallback(
    async (input: EntryInput): Promise<ActionResult<EntryRecord>> => {
      if (!session) {
        return { ok: false, error: 'Debe iniciar sesión para registrar una entrada de inventario.' };
      }
      if (session.role !== 'BODEGA') {
        return {
          ok: false,
          error: 'Rol no autorizado. Solo el personal de BODEGA puede registrar entradas de inventario.',
        };
      }

      const res = await registerEntryFirestore(input, session.id, session.fullName);
      if (res.ok && res.data) {
        addToast({
          type: 'success',
          title: 'Entrada registrada correctamente',
          message: `Documento ${res.data.documentNumber} (${res.data.items.length} línea/s) guardado en inventario.`,
        });
        return { ok: true, data: res.data };
      }
      return { ok: false, error: res.error };
    },
    [session, addToast]
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

      const batch = batches.find(
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

      const currentTotal = getProductTotalStock(input.productId, batches);
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

      const updatedBatch: Batch = {
        ...batch,
        quantity: batch.quantity - input.quantity,
      };

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
        movements: [newMovement, ...prev.movements],
      }));

      persistExit(newExit);
      persistBatch(updatedBatch);
      persistMovement(newMovement);

      addToast({
        type: 'success',
        title: 'Salida registrada correctamente',
        message: `Se descontaron ${input.quantity} unidades del lote ${batch.batchNumber}.`,
      });

      return { ok: true, data: newExit };
    },
    [session, batches, state.exits.length, state.settings.expiryAlertDays, addToast]
  );

  return (
    <StockCareContext.Provider
      value={{
        session,
        isAuthReady,
        products,
        isLoadingProducts,
        productsError,
        suppliers,
        isSuppliersLoading,
        isLoadingSuppliers: isSuppliersLoading,
        suppliersError,
        entries,
        isEntriesLoading,
        isLoadingEntries: isEntriesLoading,
        entriesError,
        batches,
        isBatchesLoading,
        isLoadingBatches: isBatchesLoading,
        batchesError,
        exits: state.exits,
        movements: state.movements,
        settings: state.settings,
        toasts,
        isFirebaseConfigured,
        login,
        loginWithEmail: loginWithEmailAction,
        registerWithEmail: registerWithEmailAction,
        loginWithGoogle: loginWithGoogleAction,
        logout,
        updateProfile,
        updateSettings,
        createProduct,
        updateProduct,
        createSupplier,
        updateSupplier,
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
