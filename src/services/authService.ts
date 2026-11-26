import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, googleProvider, isFirebaseConfigured } from './firebase';
import type { UserRole, UserSession } from '../types';

export interface UserProfileData {
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  roleLabel: string;
  branch: string;
  createdAt?: unknown;
  lastLogin?: unknown;
}

export function roleToLabel(role: UserRole): string {
  return role === 'ADMIN' ? 'Administrador del Sistema' : 'Encargado de Bodega';
}

export async function getUserProfile(uid: string): Promise<UserProfileData | null> {
  if (!isFirebaseConfigured) return null;
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as UserProfileData;
    }
    return null;
  } catch (error) {
    console.warn('Error fetching user profile from Firestore:', error);
    return null;
  }
}

export async function createOrUpdateUserProfile(
  user: User,
  customData?: { fullName?: string; role?: UserRole; branch?: string }
): Promise<UserSession> {
  const existing = await getUserProfile(user.uid);
  const nowIso = new Date().toISOString();

  const role: UserRole =
    customData?.role ||
    existing?.role ||
    (user.email?.includes('admin') ? 'ADMIN' : 'BODEGA');

  const roleLabel = roleToLabel(role);
  const fullName =
    customData?.fullName ||
    existing?.fullName ||
    user.displayName ||
    user.email?.split('@')[0] ||
    'Usuario';

  const branch =
    customData?.branch ||
    existing?.branch ||
    'Sucursal Central - Farmacia StockCare';

  const profileData: UserProfileData = {
    uid: user.uid,
    email: user.email || '',
    fullName,
    role,
    roleLabel,
    branch,
  };

  if (isFirebaseConfigured) {
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(
        userRef,
        {
          ...profileData,
          lastLogin: serverTimestamp(),
          createdAt: existing?.createdAt || serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Could not save user profile to Firestore:', err);
    }
  }

  return {
    id: user.uid,
    username: user.email ? user.email.split('@')[0] : user.uid.slice(0, 8),
    fullName,
    email: user.email || '',
    role,
    roleLabel,
    branch,
    lastLogin: nowIso,
  };
}

export async function loginWithEmail(
  email: string,
  pass: string
): Promise<{ ok: boolean; user?: UserSession; error?: string }> {
  if (!isFirebaseConfigured) {
    return {
      ok: false,
      error:
        'Firebase no está completamente configurado en el archivo .env. Ingrese las variables de entorno de Firebase.',
    };
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    const session = await createOrUpdateUserProfile(cred.user);
    return { ok: true, user: session };
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    let msg = 'Error al iniciar sesión con correo y contraseña.';
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      msg = 'Credenciales inválidas. Compruebe el correo y la contraseña ingresados.';
    } else if (error.code === 'auth/invalid-email') {
      msg = 'El formato del correo electrónico es inválido.';
    } else if (error.code === 'auth/too-many-requests') {
      msg = 'Demasiados intentos fallidos. Intente de nuevo más tarde.';
    }
    return { ok: false, error: msg };
  }
}

export async function registerWithEmail(
  email: string,
  pass: string,
  fullName: string,
  role: UserRole = 'BODEGA'
): Promise<{ ok: boolean; user?: UserSession; error?: string }> {
  if (!isFirebaseConfigured) {
    return {
      ok: false,
      error: 'Firebase no está completamente configurado en el archivo .env.',
    };
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    const session = await createOrUpdateUserProfile(cred.user, {
      fullName,
      role,
    });
    return { ok: true, user: session };
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    let msg = 'Error al registrar la cuenta.';
    if (error.code === 'auth/email-already-in-use') {
      msg = 'El correo electrónico ya se encuentra registrado.';
    } else if (error.code === 'auth/weak-password') {
      msg = 'La contraseña debe tener al menos 6 caracteres.';
    } else if (error.code === 'auth/invalid-email') {
      msg = 'El correo electrónico no tiene un formato válido.';
    }
    return { ok: false, error: msg };
  }
}

export async function loginWithGoogle(): Promise<{
  ok: boolean;
  user?: UserSession;
  error?: string;
}> {
  if (!isFirebaseConfigured) {
    return {
      ok: false,
      error: 'Firebase no está configurado en el archivo .env.',
    };
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    const session = await createOrUpdateUserProfile(result.user);
    return { ok: true, user: session };
  } catch (err: unknown) {
    console.error('Error detallado en Google Sign-In:', err);
    const error = err as { code?: string; message?: string };
    const code = error.code || 'desconocido';
    let msg = error.message || 'No se pudo completar el inicio de sesión con Google.';

    if (code === 'auth/popup-closed-by-user') {
      msg = 'Se cerró la ventana emergente de Google antes de completar el inicio de sesión.';
    } else if (code === 'auth/unauthorized-domain') {
      msg =
        `Dominio no autorizado para OAuth en Firebase (${window.location.hostname}). Acceda mediante http://localhost:5173 o agregue "${window.location.hostname}" en Firebase Console > Authentication > Settings > Authorized Domains.`;
    } else if (code === 'auth/popup-blocked') {
      msg =
        'La ventana emergente de Google fue bloqueada por el navegador. Habilite las ventanas emergentes para este sitio.';
    } else if (code === 'auth/cancelled-popup-request') {
      msg = 'Ya hay una ventana emergente de autenticación en curso.';
    } else if (code === 'auth/network-request-failed') {
      msg = 'Fallo de conexión de red al conectar con los servidores de Google Firebase.';
    } else if (code === 'auth/operation-not-allowed') {
      msg =
        'El proveedor de Google no está habilitado en la consola de Firebase Authentication.';
    }

    return { ok: false, error: `${msg} [Código: ${code}]` };
  }
}

export async function loginWithGoogleRedirect(): Promise<void> {
  if (!isFirebaseConfigured) return;
  try {
    await signInWithRedirect(auth, googleProvider);
  } catch (err) {
    console.error('Error en signInWithRedirect:', err);
  }
}

export async function logoutUser(): Promise<void> {
  if (isFirebaseConfigured) {
    try {
      await signOut(auth);
    } catch {
      // Ignorar errores de signOut
    }
  }
}

export function subscribeToAuthChanges(
  onUserChanged: (session: UserSession | null) => void
): () => void {
  if (!isFirebaseConfigured) {
    return () => {};
  }

  // Comprobar si viene de un flujo de redirección OAuth
  getRedirectResult(auth)
    .then(async (result) => {
      if (result?.user) {
        const session = await createOrUpdateUserProfile(result.user);
        onUserChanged(session);
      }
    })
    .catch((err) => {
      console.warn('Redirect auth check error:', err);
    });

  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const session = await createOrUpdateUserProfile(firebaseUser);
      onUserChanged(session);
    } else {
      onUserChanged(null);
    }
  });
}
