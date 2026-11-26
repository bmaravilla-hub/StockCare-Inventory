import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import type {
  Batch,
  EntryRecord,
  ExitRecord,
  MovementRecord,
  Product,
  ProductStatus,
  Supplier,
  SupplierInput,
  SupplierStatus,
  SystemSettings,
} from '../types';
import type { ActionResult, ProductInput } from './StockCareContext';

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  pharmacyName: 'Farmacia StockCare',
  branchName: 'Sucursal Central - Farmacia StockCare',
  branchAddress: 'Calle Plan del Pino km 1.5, Soyapango, San Salvador',
  phone: '+503 2251-8200',
  expiryAlertDays: 60,
};

/**
 * Escucha cambios en tiempo real sobre la colección de productos mediante onSnapshot().
 * Ordena de forma estable los productos alfabéticamente por nombre.
 */
export function subscribeToProducts(
  onProductsChanged: (products: Product[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (!isFirebaseConfigured) {
    onProductsChanged([]);
    return () => {};
  }

  const productsRef = collection(db, 'products');

  return onSnapshot(
    productsRef,
    (snap) => {
      const items: Product[] = snap.docs.map((docSnap) => {
        const data = docSnap.data();
        const createdAt = data.createdAt?.toDate
          ? data.createdAt.toDate().toISOString()
          : (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString());
        const updatedAt = data.updatedAt?.toDate
          ? data.updatedAt.toDate().toISOString()
          : (typeof data.updatedAt === 'string' ? data.updatedAt : createdAt);

        return {
          id: docSnap.id,
          code: data.code || '',
          name: data.name || '',
          category: data.category || '',
          presentation: data.presentation || '',
          minStock: typeof data.minStock === 'number' ? data.minStock : 0,
          status: (data.status === 'Inactivo' ? 'Inactivo' : 'Activo') as ProductStatus,
          description: data.description || undefined,
          currentStock: typeof data.currentStock === 'number' ? data.currentStock : 0,
          createdAt,
          updatedAt,
          createdBy: data.createdBy,
          updatedBy: data.updatedBy,
        };
      });

      // Ordenamiento estable alfabético por nombre
      items.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));

      onProductsChanged(items);
    },
    (err) => {
      console.error('Error en listener onSnapshot de productos:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Verifica si un código de producto ya existe en Firestore.
 * Si se pasa excludeProductId, se excluye ese documento de la verificación (para edición).
 */
export async function checkProductCodeExists(
  code: string,
  excludeProductId?: string
): Promise<boolean> {
  if (!isFirebaseConfigured) return false;
  const normalizedCode = code.trim().toUpperCase();
  const q = query(
    collection(db, 'products'),
    where('code', '==', normalizedCode)
  );
  const snap = await getDocs(q);
  if (snap.empty) return false;
  if (!excludeProductId) return true;
  return snap.docs.some((d) => d.id !== excludeProductId);
}

/**
 * Registra un nuevo producto en Firestore con validaciones exhaustivas.
 */
export async function createProductFirestore(
  input: ProductInput,
  userId: string
): Promise<ActionResult<Product>> {
  if (!isFirebaseConfigured) {
    return { ok: false, error: 'Firebase no está configurado en el archivo .env.' };
  }

  const cleanCode = input.code.trim().toUpperCase();
  const cleanName = input.name.trim();
  const cleanCategory = input.category.trim();
  const cleanPresentation = input.presentation.trim();
  const minStock = Math.floor(input.minStock);

  // Validaciones del servidor
  if (!cleanCode) {
    return { ok: false, error: 'El código del producto es obligatorio.' };
  }
  if (!/^[A-Z0-9-]+$/.test(cleanCode)) {
    return {
      ok: false,
      error: 'El código debe contener únicamente letras mayúsculas, números y guiones (sin espacios).',
    };
  }
  if (!cleanName || cleanName.length < 3) {
    return { ok: false, error: 'El nombre del producto debe contener al menos 3 caracteres.' };
  }
  if (!cleanCategory) {
    return { ok: false, error: 'La categoría del producto es obligatoria.' };
  }
  if (!cleanPresentation) {
    return { ok: false, error: 'La presentación del producto es obligatoria.' };
  }
  if (minStock < 0 || !Number.isFinite(minStock)) {
    return { ok: false, error: 'El stock mínimo debe ser un número entero mayor o igual a cero.' };
  }
  if (input.status !== 'Activo' && input.status !== 'Inactivo') {
    return { ok: false, error: 'El estado del producto debe ser Activo o Inactivo.' };
  }

  try {
    // Validación de unicidad de código
    const codeExists = await checkProductCodeExists(cleanCode);
    if (codeExists) {
      return { ok: false, error: `Ya existe un producto registrado con el código "${cleanCode}".` };
    }

    const docRef = doc(collection(db, 'products'));
    const nowIso = new Date().toISOString();

    const firestoreData = {
      id: docRef.id,
      code: cleanCode,
      name: cleanName,
      category: cleanCategory,
      presentation: cleanPresentation,
      minStock,
      status: input.status,
      description: input.description?.trim() || null,
      currentStock: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userId,
      updatedBy: userId,
    };

    await setDoc(docRef, firestoreData);

    const clientProduct: Product = {
      id: docRef.id,
      code: cleanCode,
      name: cleanName,
      category: cleanCategory,
      presentation: cleanPresentation,
      minStock,
      status: input.status,
      description: input.description?.trim() || undefined,
      currentStock: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: userId,
      updatedBy: userId,
    };

    return { ok: true, data: clientProduct };
  } catch (err: unknown) {
    console.error('Error al crear producto en Firestore:', err);
    const error = err as { code?: string; message?: string };
    if (error.code === 'permission-denied') {
      return { ok: false, error: 'Permiso denegado: no cuenta con autorización para registrar productos.' };
    }
    if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
      return { ok: false, error: 'El servicio de base de datos no está disponible. Verifique su conexión.' };
    }
    return { ok: false, error: 'No fue posible guardar el producto en la base de datos.' };
  }
}

/**
 * Actualiza los datos de un producto en Firestore sin alterar campos protegidos.
 */
export async function updateProductFirestore(
  productId: string,
  input: ProductInput,
  userId: string
): Promise<ActionResult<Product>> {
  if (!isFirebaseConfigured) {
    return { ok: false, error: 'Firebase no está configurado en el archivo .env.' };
  }

  const cleanCode = input.code.trim().toUpperCase();
  const cleanName = input.name.trim();
  const cleanCategory = input.category.trim();
  const cleanPresentation = input.presentation.trim();
  const minStock = Math.floor(input.minStock);

  if (!productId) {
    return { ok: false, error: 'Identificador de producto inválido.' };
  }
  if (!cleanCode) {
    return { ok: false, error: 'El código del producto es obligatorio.' };
  }
  if (!/^[A-Z0-9-]+$/.test(cleanCode)) {
    return {
      ok: false,
      error: 'El código debe contener únicamente letras mayúsculas, números y guiones.',
    };
  }
  if (!cleanName || cleanName.length < 3) {
    return { ok: false, error: 'El nombre del producto debe contener al menos 3 caracteres.' };
  }
  if (!cleanCategory) {
    return { ok: false, error: 'La categoría del producto es obligatoria.' };
  }
  if (!cleanPresentation) {
    return { ok: false, error: 'La presentación del producto es obligatoria.' };
  }
  if (minStock < 0 || !Number.isFinite(minStock)) {
    return { ok: false, error: 'El stock mínimo debe ser un número entero mayor o igual a cero.' };
  }
  if (input.status !== 'Activo' && input.status !== 'Inactivo') {
    return { ok: false, error: 'El estado del producto debe ser Activo o Inactivo.' };
  }

  try {
    const docRef = doc(db, 'products', productId);
    const existingSnap = await getDoc(docRef);

    if (!existingSnap.exists()) {
      return { ok: false, error: 'El producto solicitado no existe en la base de datos.' };
    }

    const existingData = existingSnap.data();

    // Si cambió el código, validar que no colisione con otro producto
    if (existingData.code !== cleanCode) {
      const codeExists = await checkProductCodeExists(cleanCode, productId);
      if (codeExists) {
        return { ok: false, error: `Otro producto ya utiliza el código "${cleanCode}".` };
      }
    }

    const nowIso = new Date().toISOString();

    const updatePayload = {
      code: cleanCode,
      name: cleanName,
      category: cleanCategory,
      presentation: cleanPresentation,
      minStock,
      status: input.status,
      description: input.description?.trim() || null,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    };

    await updateDoc(docRef, updatePayload);

    const updatedProduct: Product = {
      id: productId,
      code: cleanCode,
      name: cleanName,
      category: cleanCategory,
      presentation: cleanPresentation,
      minStock,
      status: input.status,
      description: input.description?.trim() || undefined,
      currentStock: typeof existingData.currentStock === 'number' ? existingData.currentStock : 0,
      createdAt: existingData.createdAt?.toDate ? existingData.createdAt.toDate().toISOString() : nowIso,
      updatedAt: nowIso,
      createdBy: existingData.createdBy,
      updatedBy: userId,
    };

    return { ok: true, data: updatedProduct };
  } catch (err: unknown) {
    console.error('Error al actualizar producto en Firestore:', err);
    const error = err as { code?: string; message?: string };
    if (error.code === 'permission-denied') {
      return { ok: false, error: 'Permiso denegado: no cuenta con autorización para editar productos.' };
    }
    if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
      return { ok: false, error: 'El servicio de base de datos no está disponible. Verifique su conexión.' };
    }
    return { ok: false, error: 'No fue posible actualizar el producto en la base de datos.' };
  }
}

/**
 * Escucha cambios en tiempo real sobre la colección de proveedores mediante onSnapshot().
 * Ordena de forma estable los proveedores alfabéticamente por nombre.
 */
export function subscribeToSuppliers(
  onSuppliersChanged: (suppliers: Supplier[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (!isFirebaseConfigured) {
    onSuppliersChanged([]);
    return () => {};
  }

  const suppliersRef = collection(db, 'suppliers');

  return onSnapshot(
    suppliersRef,
    (snap) => {
      const items: Supplier[] = snap.docs.map((docSnap) => {
        const data = docSnap.data();
        const createdAt = data.createdAt?.toDate
          ? data.createdAt.toDate().toISOString()
          : (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString());
        const updatedAt = data.updatedAt?.toDate
          ? data.updatedAt.toDate().toISOString()
          : (typeof data.updatedAt === 'string' ? data.updatedAt : createdAt);

        return {
          id: docSnap.id,
          name: data.name || '',
          nit: data.nit || undefined,
          nrc: data.nrc || undefined,
          phone: data.phone || undefined,
          email: data.email || undefined,
          contactName: data.contactName || undefined,
          status: (data.status === 'Inactivo' ? 'Inactivo' : 'Activo') as SupplierStatus,
          createdAt,
          updatedAt,
          createdBy: data.createdBy,
          updatedBy: data.updatedBy,
        };
      });

      // Ordenamiento estable alfabético por nombre
      items.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));

      onSuppliersChanged(items);
    },
    (err) => {
      console.error('Error en listener onSnapshot de proveedores:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Verifica si un proveedor con el mismo nombre ya existe en Firestore (comparación normalizada e insensible a mayúsculas).
 * Si se proporciona excludeSupplierId, se ignora dicho documento (útil durante edición).
 */
export async function checkSupplierNameExists(
  name: string,
  excludeSupplierId?: string
): Promise<boolean> {
  if (!isFirebaseConfigured) return false;
  const normalized = name.trim().toLowerCase();
  try {
    const snap = await getDocs(collection(db, 'suppliers'));
    return snap.docs.some((docSnap) => {
      if (excludeSupplierId && docSnap.id === excludeSupplierId) return false;
      const data = docSnap.data();
      return (data.name || '').trim().toLowerCase() === normalized;
    });
  } catch (err) {
    console.error('Error al verificar nombre de proveedor:', err);
    return false;
  }
}

/**
 * Crea un nuevo proveedor en Cloud Firestore con validaciones de campos y auditoría.
 */
export async function createSupplierFirestore(
  input: SupplierInput,
  userId: string
): Promise<ActionResult<Supplier>> {
  if (!isFirebaseConfigured) {
    return { ok: false, error: 'Firebase no está configurado en el archivo .env.' };
  }

  const cleanName = input.name.trim();
  const cleanEmail = input.email?.trim() || '';

  if (!cleanName || cleanName.length < 3) {
    return { ok: false, error: 'El nombre del proveedor es obligatorio y debe contener al menos 3 caracteres.' };
  }

  if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { ok: false, error: 'El formato de correo electrónico no es válido.' };
  }

  if (input.status !== 'Activo' && input.status !== 'Inactivo') {
    return { ok: false, error: 'El estado del proveedor debe ser Activo o Inactivo.' };
  }

  try {
    const nameExists = await checkSupplierNameExists(cleanName);
    if (nameExists) {
      return { ok: false, error: `Ya existe un proveedor registrado con el nombre "${cleanName}".` };
    }

    const docRef = doc(collection(db, 'suppliers'));
    const nowIso = new Date().toISOString();

    const firestoreData = {
      name: cleanName,
      nit: input.nit?.trim() || null,
      nrc: input.nrc?.trim() || null,
      phone: input.phone?.trim() || null,
      email: cleanEmail || null,
      contactName: input.contactName?.trim() || null,
      status: input.status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userId,
      updatedBy: userId,
    };

    await setDoc(docRef, firestoreData);

    const clientSupplier: Supplier = {
      id: docRef.id,
      name: cleanName,
      nit: input.nit?.trim() || undefined,
      nrc: input.nrc?.trim() || undefined,
      phone: input.phone?.trim() || undefined,
      email: cleanEmail || undefined,
      contactName: input.contactName?.trim() || undefined,
      status: input.status,
      createdAt: nowIso,
      updatedAt: nowIso,
      createdBy: userId,
      updatedBy: userId,
    };

    return { ok: true, data: clientSupplier };
  } catch (err: unknown) {
    console.error('Error al crear proveedor en Firestore:', err);
    const error = err as { code?: string; message?: string };
    if (error.code === 'permission-denied') {
      return { ok: false, error: 'Permiso denegado: no cuenta con autorización para registrar proveedores.' };
    }
    if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
      return { ok: false, error: 'El servicio de base de datos no está disponible. Verifique su conexión.' };
    }
    return { ok: false, error: 'No fue posible guardar el proveedor en la base de datos.' };
  }
}

/**
 * Actualiza los datos de un proveedor en Firestore sin alterar campos protegidos.
 */
export async function updateSupplierFirestore(
  supplierId: string,
  input: SupplierInput,
  userId: string
): Promise<ActionResult<Supplier>> {
  if (!isFirebaseConfigured) {
    return { ok: false, error: 'Firebase no está configurado en el archivo .env.' };
  }

  const cleanName = input.name.trim();
  const cleanEmail = input.email?.trim() || '';

  if (!supplierId) {
    return { ok: false, error: 'Identificador de proveedor inválido.' };
  }
  if (!cleanName || cleanName.length < 3) {
    return { ok: false, error: 'El nombre del proveedor es obligatorio y debe contener al menos 3 caracteres.' };
  }
  if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { ok: false, error: 'El formato de correo electrónico no es válido.' };
  }
  if (input.status !== 'Activo' && input.status !== 'Inactivo') {
    return { ok: false, error: 'El estado del proveedor debe ser Activo o Inactivo.' };
  }

  try {
    const docRef = doc(db, 'suppliers', supplierId);
    const existingSnap = await getDoc(docRef);

    if (!existingSnap.exists()) {
      return { ok: false, error: 'El proveedor solicitado no existe en la base de datos.' };
    }

    const existingData = existingSnap.data();

    // Si cambió el nombre, validar que no colisione con otro proveedor
    if ((existingData.name || '').trim().toLowerCase() !== cleanName.toLowerCase()) {
      const nameExists = await checkSupplierNameExists(cleanName, supplierId);
      if (nameExists) {
        return { ok: false, error: `Otro proveedor ya utiliza el nombre "${cleanName}".` };
      }
    }

    const nowIso = new Date().toISOString();

    const updatePayload = {
      name: cleanName,
      nit: input.nit?.trim() || null,
      nrc: input.nrc?.trim() || null,
      phone: input.phone?.trim() || null,
      email: cleanEmail || null,
      contactName: input.contactName?.trim() || null,
      status: input.status,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    };

    await updateDoc(docRef, updatePayload);

    const updatedSupplier: Supplier = {
      id: supplierId,
      name: cleanName,
      nit: input.nit?.trim() || undefined,
      nrc: input.nrc?.trim() || undefined,
      phone: input.phone?.trim() || undefined,
      email: cleanEmail || undefined,
      contactName: input.contactName?.trim() || undefined,
      status: input.status,
      createdAt: existingData.createdAt?.toDate ? existingData.createdAt.toDate().toISOString() : nowIso,
      updatedAt: nowIso,
      createdBy: existingData.createdBy,
      updatedBy: userId,
    };

    return { ok: true, data: updatedSupplier };
  } catch (err: unknown) {
    console.error('Error al actualizar proveedor en Firestore:', err);
    const error = err as { code?: string; message?: string };
    if (error.code === 'permission-denied') {
      return { ok: false, error: 'Permiso denegado: no cuenta con autorización para modificar proveedores.' };
    }
    if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
      return { ok: false, error: 'El servicio de base de datos no está disponible. Verifique su conexión.' };
    }
    return { ok: false, error: 'No fue posible actualizar el proveedor en la base de datos.' };
  }
}

/**
 * Carga inicial de datos de inventario y configuración de sistema.
 */
export async function fetchFirestoreInventory(): Promise<{
  batches: Batch[];
  entries: EntryRecord[];
  exits: ExitRecord[];
  movements: MovementRecord[];
  settings: SystemSettings;
} | null> {
  if (!isFirebaseConfigured) return null;

  try {
    const batchesSnap = await getDocs(collection(db, 'batches'));
    const entriesSnap = await getDocs(collection(db, 'entries'));
    const exitsSnap = await getDocs(collection(db, 'exits'));
    const movementsSnap = await getDocs(collection(db, 'movements'));
    const settingsSnap = await getDoc(doc(db, 'settings', 'system'));

    const batches = batchesSnap.docs.map((d) => d.data() as Batch);
    const entries = entriesSnap.docs.map((d) => d.data() as EntryRecord);
    const exits = exitsSnap.docs.map((d) => d.data() as ExitRecord);
    const movements = movementsSnap.docs.map((d) => d.data() as MovementRecord);
    const settings = settingsSnap.exists()
      ? (settingsSnap.data() as SystemSettings)
      : DEFAULT_SYSTEM_SETTINGS;

    return {
      batches,
      entries,
      exits,
      movements,
      settings,
    };
  } catch (error) {
    console.warn('Error reading data from Firestore:', error);
    return null;
  }
}

export async function persistBatch(item: Batch): Promise<void> {
  if (!isFirebaseConfigured) return;
  try {
    await setDoc(doc(db, 'batches', item.id), item);
  } catch (err) {
    console.warn('Error saving batch to Firestore:', err);
  }
}

export async function persistEntry(entry: EntryRecord): Promise<void> {
  if (!isFirebaseConfigured) return;
  try {
    await setDoc(doc(db, 'entries', entry.id), entry);
  } catch (err) {
    console.warn('Error saving entry to Firestore:', err);
  }
}

export async function persistExit(exit: ExitRecord): Promise<void> {
  if (!isFirebaseConfigured) return;
  try {
    await setDoc(doc(db, 'exits', exit.id), exit);
  } catch (err) {
    console.warn('Error saving exit to Firestore:', err);
  }
}

export async function persistMovement(movement: MovementRecord): Promise<void> {
  if (!isFirebaseConfigured) return;
  try {
    await setDoc(doc(db, 'movements', movement.id), movement);
  } catch (err) {
    console.warn('Error saving movement to Firestore:', err);
  }
}

export async function persistSettings(settings: SystemSettings): Promise<void> {
  if (!isFirebaseConfigured) return;
  try {
    await setDoc(doc(db, 'settings', 'system'), settings);
  } catch (err) {
    console.warn('Error saving settings to Firestore:', err);
  }
}
