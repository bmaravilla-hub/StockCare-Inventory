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
  runTransaction,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import type {
  Batch,
  BatchExpiryStatus,
  EntryInput,
  EntryItem,
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
import { getBatchExpiryStatus } from '../utils/inventory';
import { isValidFutureOrTodayDate, isValidNotFutureDate } from '../utils/date';

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
 * Escucha cambios en tiempo real sobre la colección de entradas mediante onSnapshot().
 * Ordena descendentemente por fecha de creación (más recientes primero).
 */
export function subscribeToEntries(
  onEntriesChanged: (entries: EntryRecord[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (!isFirebaseConfigured) {
    onEntriesChanged([]);
    return () => {};
  }

  const entriesRef = collection(db, 'entries');

  return onSnapshot(
    entriesRef,
    (snap) => {
      const items: EntryRecord[] = snap.docs.map((docSnap) => {
        const data = docSnap.data();
        const createdAt = data.createdAt?.toDate
          ? data.createdAt.toDate().toISOString()
          : (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString());

        const itemsMapped: EntryItem[] = Array.isArray(data.items)
          ? data.items.map((it: any, idx: number) => ({
              id: it.id || `${docSnap.id}-${idx + 1}`,
              productId: it.productId || '',
              productCode: it.productCode || '',
              productName: it.productName || '',
              quantity: typeof it.quantity === 'number' ? it.quantity : 0,
              batchNumber: it.batchNumber || '',
              expiryDate: it.expiryDate || '',
            }))
          : [];

        const supplierName = data.supplierName || data.provider || '';

        return {
          id: docSnap.id,
          documentNumber: data.documentNumber || '',
          supplierId: data.supplierId || '',
          supplierName,
          provider: supplierName,
          date: data.date || '',
          notes: data.notes || undefined,
          registeredBy: data.registeredBy || '',
          registeredByUid: data.registeredByUid || undefined,
          createdAt,
          items: itemsMapped,
        };
      });

      // Ordenar descendente por fecha de creación
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      onEntriesChanged(items);
    },
    (err) => {
      console.error('Error en listener onSnapshot de entradas:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Escucha cambios en tiempo real sobre la colección de lotes mediante onSnapshot().
 * Ordena ascendentemente por fecha de vencimiento (próximos a vencer primero).
 */
export function subscribeToBatches(
  onBatchesChanged: (batches: Batch[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (!isFirebaseConfigured) {
    onBatchesChanged([]);
    return () => {};
  }

  const batchesRef = collection(db, 'batches');

  return onSnapshot(
    batchesRef,
    (snap) => {
      const items: Batch[] = snap.docs.map((docSnap) => {
        const data = docSnap.data();
        const createdAt = data.createdAt?.toDate
          ? data.createdAt.toDate().toISOString()
          : (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString());
        const updatedAt = data.updatedAt?.toDate
          ? data.updatedAt.toDate().toISOString()
          : (typeof data.updatedAt === 'string' ? data.updatedAt : createdAt);

        const expiryDate = data.expiryDate || '';
        const status = (data.status as BatchExpiryStatus) || getBatchExpiryStatus(expiryDate);

        return {
          id: docSnap.id,
          productId: data.productId || '',
          entryId: data.entryId || '',
          supplierId: data.supplierId || '',
          batchNumber: data.batchNumber || '',
          expiryDate,
          initialQuantity: typeof data.initialQuantity === 'number' ? data.initialQuantity : 0,
          quantity: typeof data.quantity === 'number' ? data.quantity : 0,
          status,
          createdAt,
          updatedAt,
          createdBy: data.createdBy,
        };
      });

      // Ordenar por fecha de vencimiento (próximos a vencer primero)
      items.sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

      onBatchesChanged(items);
    },
    (err) => {
      console.error('Error en listener onSnapshot de lotes:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Verifica si ya existe una entrada con el mismo número de documento para el mismo proveedor.
 */
export async function checkEntryDocumentExists(
  documentNumber: string,
  supplierId: string
): Promise<boolean> {
  if (!isFirebaseConfigured) return false;
  const cleanDoc = documentNumber.trim().toUpperCase();
  try {
    const q = query(
      collection(db, 'entries'),
      where('documentNumber', '==', cleanDoc),
      where('supplierId', '==', supplierId)
    );
    const snap = await getDocs(q);
    return !snap.empty;
  } catch (err) {
    console.error('Error al verificar documento de entrada duplicado:', err);
    return false;
  }
}

/**
 * Busca si existe un lote previo con exactamente el mismo productId, batchNumber y expiryDate.
 */
export async function findExistingBatch(
  productId: string,
  batchNumber: string,
  expiryDate: string
): Promise<{ id: string; ref: any; data: any } | null> {
  if (!isFirebaseConfigured) return null;
  const cleanBatchNumber = batchNumber.trim().toUpperCase();
  try {
    const q = query(
      collection(db, 'batches'),
      where('productId', '==', productId),
      where('batchNumber', '==', cleanBatchNumber),
      where('expiryDate', '==', expiryDate)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      return {
        id: docSnap.id,
        ref: docSnap.ref,
        data: docSnap.data(),
      };
    }
    return null;
  } catch (err) {
    console.error('Error al buscar lote existente:', err);
    return null;
  }
}

/**
 * Registra una entrada de inventario de forma estrictamente atómica mediante runTransaction:
 * 1. Valida los campos de entrada y formato de ítems.
 * 2. Verifica la no duplicidad del documento para el proveedor dado.
 * 3. Valida existencia y estado 'Activo' del proveedor.
 * 4. Ejecuta runTransaction:
 *    - Lectura previa de todos los productos involucrados (verificando que existan y estén activos).
 *    - Lectura previa de lotes candidatos con la misma tripleta (productId, batchNumber, expiryDate).
 *    - Creación del documento entries/{entryId} con snapshot histórico.
 *    - Creación o actualización (acumulación de cantidad) de batches/{batchId}.
 *    - Incremento atómico de products.currentStock.
 *    - Registro de auditoría Kardex en movements/{movementId}.
 */
export async function registerEntryFirestore(
  input: EntryInput,
  userId: string,
  userName: string
): Promise<ActionResult<EntryRecord>> {
  if (!isFirebaseConfigured) {
    return { ok: false, error: 'Firebase no está configurado en el archivo .env.' };
  }

  const cleanDoc = input.documentNumber.trim().toUpperCase();
  const cleanSupplierId = input.supplierId.trim();
  const cleanDate = input.date.trim();

  if (!cleanDoc || cleanDoc.length < 2) {
    return { ok: false, error: 'El número de factura o documento de entrada es obligatorio (mínimo 2 caracteres).' };
  }
  if (!cleanSupplierId) {
    return { ok: false, error: 'Debe seleccionar un proveedor válido del catálogo.' };
  }
  if (!cleanDate || !isValidNotFutureDate(cleanDate)) {
    return { ok: false, error: 'La fecha de recepción no puede ser posterior al día de hoy.' };
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    return { ok: false, error: 'Debe agregar al menos un producto a la recepción de inventario.' };
  }

  // Validar cada ítem
  for (let i = 0; i < input.items.length; i++) {
    const item = input.items[i];
    if (!item.productId) {
      return { ok: false, error: `Línea ${i + 1}: Debe seleccionar un producto.` };
    }
    const qty = Number(item.quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      return { ok: false, error: `Línea ${i + 1}: La cantidad debe ser un número entero mayor que cero.` };
    }
    const batchNum = item.batchNumber.trim();
    if (!batchNum) {
      return { ok: false, error: `Línea ${i + 1}: El número de lote es obligatorio.` };
    }
    if (!item.expiryDate || !isValidFutureOrTodayDate(item.expiryDate)) {
      return { ok: false, error: `Línea ${i + 1}: La fecha de vencimiento es inválida o corresponde a un producto vencido.` };
    }
  }

  try {
    // 1. Verificar duplicidad de documento / proveedor
    const isDuplicate = await checkEntryDocumentExists(cleanDoc, cleanSupplierId);
    if (isDuplicate) {
      return {
        ok: false,
        error: 'Ya existe una entrada registrada con este número de documento para el proveedor seleccionado.',
      };
    }

    // 2. Obtener proveedor y validar estado Activo
    const supplierRef = doc(db, 'suppliers', cleanSupplierId);
    const supplierSnap = await getDoc(supplierRef);
    if (!supplierSnap.exists()) {
      return { ok: false, error: 'El proveedor seleccionado no existe en la base de datos.' };
    }
    const supplierData = supplierSnap.data();
    if (supplierData.status !== 'Activo') {
      return { ok: false, error: 'El proveedor seleccionado se encuentra inactivo y no admite recepciones de mercadería.' };
    }
    const supplierName = supplierData.name || input.supplierName || 'Proveedor';

    // 3. Pre-buscar candidatos de lotes existentes para leer dentro de la transacción
    const candidateBatchesMap = new Map<string, { id: string; ref: any }>();
    for (const item of input.items) {
      const cleanBatch = item.batchNumber.trim().toUpperCase();
      const key = `${item.productId}_${cleanBatch}_${item.expiryDate}`;
      if (!candidateBatchesMap.has(key)) {
        const found = await findExistingBatch(item.productId, cleanBatch, item.expiryDate);
        if (found) {
          candidateBatchesMap.set(key, { id: found.id, ref: found.ref });
        }
      }
    }

    // Calcular suma de cantidades agregadas por producto
    const productQtyMap = new Map<string, number>();
    for (const item of input.items) {
      const current = productQtyMap.get(item.productId) || 0;
      productQtyMap.set(item.productId, current + item.quantity);
    }
    const uniqueProductIds = Array.from(productQtyMap.keys());

    // 4. Ejecutar Transacción Atómica
    const entryRef = doc(collection(db, 'entries'));
    const nowIso = new Date().toISOString();

    const createdEntry = await runTransaction(db, async (tx) => {
      // --- FASE DE LECTURAS ---
      const productDataMap = new Map<string, any>();
      for (const prodId of uniqueProductIds) {
        const pRef = doc(db, 'products', prodId);
        const pSnap = await tx.get(pRef);
        if (!pSnap.exists()) {
          throw new Error(`El producto con ID "${prodId}" no existe en el catálogo.`);
        }
        const pData = pSnap.data();
        if (pData.status !== 'Activo') {
          throw new Error(`El producto "${pData.name}" se encuentra inactivo y no admite ingresos de inventario.`);
        }
        productDataMap.set(prodId, pData);
      }

      const existingBatchDataMap = new Map<string, { id: string; ref: any; data: any }>();
      for (const [key, candidate] of candidateBatchesMap.entries()) {
        const bSnap = await tx.get(candidate.ref);
        if (bSnap.exists()) {
          existingBatchDataMap.set(key, { id: candidate.id, ref: candidate.ref, data: bSnap.data() });
        }
      }

      // --- FASE DE ESCRITURAS ---
      // 1) Crear documento entries/{entryId}
      const normalizedItems: EntryItem[] = input.items.map((item, idx) => {
        const pData = productDataMap.get(item.productId);
        return {
          id: `${entryRef.id}-${idx + 1}`,
          productId: item.productId,
          productCode: pData?.code || '',
          productName: pData?.name || '',
          quantity: item.quantity,
          batchNumber: item.batchNumber.trim().toUpperCase(),
          expiryDate: item.expiryDate,
        };
      });

      const entryDocData = {
        documentNumber: cleanDoc,
        supplierId: cleanSupplierId,
        supplierName,
        provider: supplierName,
        date: cleanDate,
        notes: input.notes?.trim() || null,
        registeredBy: userName,
        registeredByUid: userId,
        createdAt: serverTimestamp(),
        items: normalizedItems,
      };

      tx.set(entryRef, entryDocData);

      // 2) Actualizar o Crear Batches
      const accumulatedBatchesInTx = new Map<string, { newInitial: number; newQty: number }>();

      for (const item of input.items) {
        const cleanBatch = item.batchNumber.trim().toUpperCase();
        const key = `${item.productId}_${cleanBatch}_${item.expiryDate}`;
        const existingBatch = existingBatchDataMap.get(key);

        if (existingBatch) {
          const currentAccum = accumulatedBatchesInTx.get(key) || {
            newInitial: existingBatch.data.initialQuantity || 0,
            newQty: existingBatch.data.quantity || 0,
          };
          const nextInitial = currentAccum.newInitial + item.quantity;
          const nextQty = currentAccum.newQty + item.quantity;
          accumulatedBatchesInTx.set(key, { newInitial: nextInitial, newQty: nextQty });

          tx.update(existingBatch.ref, {
            initialQuantity: nextInitial,
            quantity: nextQty,
            status: getBatchExpiryStatus(item.expiryDate),
            updatedAt: serverTimestamp(),
          });
        } else {
          const newBatchRef = doc(collection(db, 'batches'));
          tx.set(newBatchRef, {
            productId: item.productId,
            entryId: entryRef.id,
            supplierId: cleanSupplierId,
            batchNumber: cleanBatch,
            expiryDate: item.expiryDate,
            initialQuantity: item.quantity,
            quantity: item.quantity,
            status: getBatchExpiryStatus(item.expiryDate),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: userId,
          });

          // Registrar en mapa en caso de que otra línea de la misma entrada tenga el mismo lote
          existingBatchDataMap.set(key, {
            id: newBatchRef.id,
            ref: newBatchRef,
            data: { initialQuantity: item.quantity, quantity: item.quantity },
          });
          accumulatedBatchesInTx.set(key, { newInitial: item.quantity, newQty: item.quantity });
        }
      }

      // 3) Incrementar products.currentStock
      const runningStockMap = new Map<string, number>();
      for (const [prodId, addedQty] of productQtyMap.entries()) {
        const pData = productDataMap.get(prodId);
        const currentStock = typeof pData.currentStock === 'number' ? pData.currentStock : 0;
        const newStock = currentStock + addedQty;
        runningStockMap.set(prodId, newStock);

        const pRef = doc(db, 'products', prodId);
        tx.update(pRef, {
          currentStock: newStock,
          updatedAt: serverTimestamp(),
          updatedBy: userId,
        });
      }

      // 4) Registrar movimientos Kardex tipo Entrada
      for (let idx = 0; idx < input.items.length; idx++) {
        const item = input.items[idx];
        const movRef = doc(collection(db, 'movements'));
        const resultingStock = runningStockMap.get(item.productId) || 0;
        tx.set(movRef, {
          date: cleanDate,
          createdAt: serverTimestamp(),
          productId: item.productId,
          batchNumber: item.batchNumber.trim().toUpperCase(),
          type: 'Entrada',
          quantity: item.quantity,
          user: userName,
          reference: cleanDoc,
          detail: `Recepción de ${supplierName}`,
          resultingStock,
        });
      }

      return {
        id: entryRef.id,
        documentNumber: cleanDoc,
        supplierId: cleanSupplierId,
        supplierName,
        provider: supplierName,
        date: cleanDate,
        notes: input.notes?.trim() || undefined,
        registeredBy: userName,
        registeredByUid: userId,
        createdAt: nowIso,
        items: normalizedItems,
      };
    });

    return { ok: true, data: createdEntry };
  } catch (err: unknown) {
    console.error('Error al registrar entrada en Firestore:', err);
    const error = err as { code?: string; message?: string };
    if (error.code === 'permission-denied') {
      return { ok: false, error: 'Permiso denegado: no cuenta con autorización para registrar entradas de inventario.' };
    }
    if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
      return { ok: false, error: 'El servicio de base de datos no está disponible. Verifique su conexión.' };
    }
    return { ok: false, error: error.message || 'No fue posible registrar la entrada en la base de datos.' };
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
