import type {
  Batch,
  EntryRecord,
  ExitRecord,
  MovementRecord,
  Product,
  SystemSettings,
  UserSession,
} from '../types';
import {
  INITIAL_ENTRIES,
  INITIAL_EXITS,
  INITIAL_PRODUCTS,
  INITIAL_SETTINGS,
  buildInitialInventoryState,
} from '../data/mockData';

const DATA_STORAGE_KEY = 'stockcare_inventory_state_v1';
const SESSION_STORAGE_KEY = 'stockcare_user_session_v1';

export interface PersistedInventoryState {
  products: Product[];
  entries: EntryRecord[];
  exits: ExitRecord[];
  batches: Batch[];
  movements: MovementRecord[];
  settings: SystemSettings;
}

export function getInitialPersistedState(): PersistedInventoryState {
  const { batches, movements } = buildInitialInventoryState();
  return {
    products: INITIAL_PRODUCTS,
    entries: INITIAL_ENTRIES,
    exits: INITIAL_EXITS,
    batches,
    movements,
    settings: INITIAL_SETTINGS,
  };
}

export function loadInventoryState(): PersistedInventoryState {
  try {
    const raw = localStorage.getItem(DATA_STORAGE_KEY);
    if (!raw) return getInitialPersistedState();
    const parsed = JSON.parse(raw) as Partial<PersistedInventoryState>;
    if (
      !Array.isArray(parsed.products) ||
      !Array.isArray(parsed.batches) ||
      !Array.isArray(parsed.movements) ||
      !Array.isArray(parsed.entries) ||
      !Array.isArray(parsed.exits)
    ) {
      return getInitialPersistedState();
    }
    return {
      products: parsed.products,
      entries: parsed.entries,
      exits: parsed.exits,
      batches: parsed.batches,
      movements: parsed.movements,
      settings: parsed.settings ?? INITIAL_SETTINGS,
    };
  } catch {
    return getInitialPersistedState();
  }
}

export function saveInventoryState(state: PersistedInventoryState): void {
  try {
    localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignorar errores de cuota de almacenamiento en modo prototipo
  }
}

export function clearInventoryState(): PersistedInventoryState {
  try {
    localStorage.removeItem(DATA_STORAGE_KEY);
  } catch {
    // Ignorar
  }
  const fresh = getInitialPersistedState();
  saveInventoryState(fresh);
  return fresh;
}

export function loadUserSession(): UserSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserSession;
    if (!parsed || !parsed.id || !parsed.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveUserSession(session: UserSession | null): void {
  try {
    if (!session) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } else {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  } catch {
    // Ignorar
  }
}

