import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import type {
  Batch,
  EntryRecord,
  ExitRecord,
  MovementRecord,
  Product,
  SystemSettings,
} from '../types';
import {
  INITIAL_ENTRIES,
  INITIAL_EXITS,
  INITIAL_PRODUCTS,
  INITIAL_SETTINGS,
  buildInitialInventoryState,
} from '../data/mockData';

export async function fetchFirestoreInventory(): Promise<{
  products: Product[];
  batches: Batch[];
  entries: EntryRecord[];
  exits: ExitRecord[];
  movements: MovementRecord[];
  settings: SystemSettings;
} | null> {
  if (!isFirebaseConfigured) return null;

  try {
    const productsSnap = await getDocs(collection(db, 'products'));
    const batchesSnap = await getDocs(collection(db, 'batches'));
    const entriesSnap = await getDocs(collection(db, 'entries'));
    const exitsSnap = await getDocs(collection(db, 'exits'));
    const movementsSnap = await getDocs(collection(db, 'movements'));
    const settingsSnap = await getDoc(doc(db, 'settings', 'system'));

    // Si la base de datos está completamente vacía, podemos sembrar los datos iniciales
    if (productsSnap.empty && batchesSnap.empty) {
      await seedFirestoreData();
      return fetchFirestoreInventory();
    }

    const products = productsSnap.docs.map((d) => d.data() as Product);
    const batches = batchesSnap.docs.map((d) => d.data() as Batch);
    const entries = entriesSnap.docs.map((d) => d.data() as EntryRecord);
    const exits = exitsSnap.docs.map((d) => d.data() as ExitRecord);
    const movements = movementsSnap.docs.map((d) => d.data() as MovementRecord);
    const settings = settingsSnap.exists()
      ? (settingsSnap.data() as SystemSettings)
      : INITIAL_SETTINGS;

    return {
      products,
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

export async function seedFirestoreData(): Promise<void> {
  if (!isFirebaseConfigured) return;

  try {
    const { batches, movements } = buildInitialInventoryState();
    const batch = writeBatch(db);

    INITIAL_PRODUCTS.forEach((p) => {
      batch.set(doc(db, 'products', p.id), p);
    });

    batches.forEach((b) => {
      batch.set(doc(db, 'batches', b.id), b);
    });

    INITIAL_ENTRIES.forEach((e) => {
      batch.set(doc(db, 'entries', e.id), e);
    });

    INITIAL_EXITS.forEach((ex) => {
      batch.set(doc(db, 'exits', ex.id), ex);
    });

    movements.forEach((m) => {
      batch.set(doc(db, 'movements', m.id), m);
    });

    batch.set(doc(db, 'settings', 'system'), INITIAL_SETTINGS);

    await batch.commit();
  } catch (err) {
    console.warn('Error seeding initial Firestore data:', err);
  }
}

export async function persistProduct(product: Product): Promise<void> {
  if (!isFirebaseConfigured) return;
  try {
    await setDoc(doc(db, 'products', product.id), product);
  } catch (err) {
    console.warn('Error saving product to Firestore:', err);
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
