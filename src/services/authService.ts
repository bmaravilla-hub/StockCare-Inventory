import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, googleProvider, isFirebaseConfigured } from './firebase';
import type { UserRole, UserSession, UserStatus } from '../types';

export interface UserProfileData {
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  roleLabel: string;
  branch: string;
  status: UserStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
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
    console.error('Error fetching user profile from Firestore:', error);
    return null;
  }
}

export async function updateUserProfile(
  uid: string,
  data: { fullName: string; branch?: string }
): Promise<{ ok: boolean; error?: string }> {
  if (!isFirebaseConfigured) {
    return { ok: false, error: 'Firebase no está configurado en el archivo .env.' };
  }
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(
      userRef,
      {
        fullName: data.fullName.trim(),
        branch: data.branch?.trim() || 'Sucursal Central - Farmacia StockCare',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return { ok: true };
  } catch (err) {
    console.error('Error actualizando perfil en Firestore:', err);
    return { ok: false, error: 'No fue posible guardar los cambios de su perfil.' };
  }
}

export async function loginWithEmail(
  email: string,
  pass: string
): Promise<{ ok: boolean; user?: UserSession; error?: string }> {
  if (!isFirebaseConfigured) {
    return {
      ok: false,
      error: 'Firebase no está configurado en el archivo .env.',
    };
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = pass.trim();

  if (!cleanEmail || !cleanPass) {
    return { ok: false, error: 'Ingrese correo electrónico y contraseña.' };
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
    const profile = await getUserProfile(cred.user.uid);

    // Validación QA-07: Usuario sin documento users/{uid}
    if (!profile) {
      await signOut(auth);
      return {
        ok: false,
        error: 'Su cuenta no se encuentra registrada en la base de datos de StockCare. Contacte al administrador.',
      };
    }

    // Validación QA-08: Usuario inactivo
    if (profile.status === 'Inactivo') {
      await signOut(auth);
      return {
        ok: false,
        error: 'Su usuario se encuentra inactivo. Contacte al administrador.',
      };
    }

    // Actualizar última fecha de acceso y updatedAt
    try {
      await setDoc(
        doc(db, 'users', cred.user.uid),
        {
          lastLogin: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('No se pudo actualizar lastLogin en Firestore:', err);
    }

    const session: UserSession = {
      id: profile.uid,
      username: profile.email ? profile.email.split('@')[0] : profile.uid.slice(0, 8),
      fullName: profile.fullName,
      email: profile.email,
      role: profile.role,
      roleLabel: profile.roleLabel || roleToLabel(profile.role),
      branch: profile.branch || 'Sucursal Central - Farmacia StockCare',
      status: profile.status,
      lastLogin: new Date().toISOString(),
    };

    return { ok: true, user: session };
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    console.error('Error en loginWithEmail:', error.code, error.message);
    let msg = 'Error al iniciar sesión con correo y contraseña.';
    if (
      error.code === 'auth/invalid-credential' ||
      error.code === 'auth/user-not-found' ||
      error.code === 'auth/wrong-password'
    ) {
      msg = 'Credenciales inválidas. Compruebe el correo y la contraseña ingresados.';
    } else if (error.code === 'auth/invalid-email') {
      msg = 'El formato del correo electrónico es inválido.';
    } else if (error.code === 'auth/too-many-requests') {
      msg = 'Demasiados intentos fallidos. Intente de nuevo más tarde.';
    } else if (error.code === 'auth/user-disabled') {
      msg = 'Esta cuenta de usuario ha sido inhabilitada por seguridad.';
    } else if (error.code === 'auth/network-request-failed') {
      msg = 'Error de conexión. Compruebe su conexión a internet.';
    }
    return { ok: false, error: msg };
  }
}

export async function registerWithEmail(
  email: string,
  pass: string,
  fullName: string
): Promise<{ ok: boolean; user?: UserSession; error?: string }> {
  if (!isFirebaseConfigured) {
    return {
      ok: false,
      error: 'Firebase no está configurado en el archivo .env.',
    };
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = pass.trim();
  const cleanName = fullName.trim();

  if (!cleanEmail || !cleanPass || !cleanName) {
    return { ok: false, error: 'Complete todos los campos obligatorios.' };
  }

  if (cleanPass.length < 6) {
    return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
    const nowIso = new Date().toISOString();

    const profileData: UserProfileData = {
      uid: cred.user.uid,
      email: cred.user.email || cleanEmail,
      fullName: cleanName,
      role: 'BODEGA',
      roleLabel: roleToLabel('BODEGA'),
      branch: 'Sucursal Central - Farmacia StockCare',
      status: 'Activo',
    };

    const userRef = doc(db, 'users', cred.user.uid);
    await setDoc(userRef, {
      ...profileData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    });

    const session: UserSession = {
      id: cred.user.uid,
      username: cleanEmail.split('@')[0],
      fullName: cleanName,
      email: cleanEmail,
      role: 'BODEGA',
      roleLabel: roleToLabel('BODEGA'),
      branch: 'Sucursal Central - Farmacia StockCare',
      status: 'Activo',
      lastLogin: nowIso,
    };

    return { ok: true, user: session };
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    console.error('Error en registerWithEmail:', error.code, error.message);
    let msg = 'Error al registrar la cuenta.';
    if (error.code === 'auth/email-already-in-use') {
      msg = 'El correo electrónico ya se encuentra registrado.';
    } else if (error.code === 'auth/weak-password') {
      msg = 'La contraseña debe tener al menos 6 caracteres.';
    } else if (error.code === 'auth/invalid-email') {
      msg = 'El correo electrónico no tiene un formato válido.';
    } else if (error.code === 'auth/network-request-failed') {
      msg = 'Error de conexión de red con Firebase. Compruebe su conexión.';
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
    const existing = await getUserProfile(result.user.uid);
    const nowIso = new Date().toISOString();

    if (existing) {
      if (existing.status === 'Inactivo') {
        await signOut(auth);
        return {
          ok: false,
          error: 'Su usuario se encuentra inactivo. Contacte al administrador.',
        };
      }

      try {
        await setDoc(
          doc(db, 'users', result.user.uid),
          {
            lastLogin: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (err) {
        console.warn('No se pudo actualizar lastLogin de Google user:', err);
      }

      return {
        ok: true,
        user: {
          id: existing.uid,
          username: existing.email ? existing.email.split('@')[0] : existing.uid.slice(0, 8),
          fullName: existing.fullName,
          email: existing.email,
          role: existing.role,
          roleLabel: existing.roleLabel || roleToLabel(existing.role),
          branch: existing.branch || 'Sucursal Central - Farmacia StockCare',
          status: existing.status,
          lastLogin: nowIso,
        },
      };
    }

    // Nuevo usuario con Google: aprovisionar perfil seguro en Firestore con rol BODEGA
    const fullName =
      result.user.displayName ||
      result.user.email?.split('@')[0] ||
      'Usuario Google';
    const email = result.user.email || '';

    const profileData: UserProfileData = {
      uid: result.user.uid,
      email,
      fullName,
      role: 'BODEGA',
      roleLabel: roleToLabel('BODEGA'),
      branch: 'Sucursal Central - Farmacia StockCare',
      status: 'Activo',
    };

    const userRef = doc(db, 'users', result.user.uid);
    await setDoc(userRef, {
      ...profileData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    });

    return {
      ok: true,
      user: {
        id: result.user.uid,
        username: email ? email.split('@')[0] : result.user.uid.slice(0, 8),
        fullName,
        email,
        role: 'BODEGA',
        roleLabel: roleToLabel('BODEGA'),
        branch: 'Sucursal Central - Farmacia StockCare',
        status: 'Activo',
        lastLogin: nowIso,
      },
    };
  } catch (err: unknown) {
    console.error('Error detallado en Google Sign-In:', err);
    const error = err as { code?: string; message?: string };
    const code = error.code || 'desconocido';
    let msg = 'No se pudo completar el inicio de sesión con Google.';

    if (code === 'auth/popup-closed-by-user') {
      msg = 'Se cerró la ventana emergente de Google antes de completar el inicio de sesión.';
    } else if (code === 'auth/unauthorized-domain') {
      msg = `Dominio no autorizado para OAuth en Firebase (${window.location.hostname}). Acceda mediante http://localhost:5173 o configure el dominio en Firebase Console.`;
    } else if (code === 'auth/popup-blocked') {
      msg = 'La ventana emergente de Google fue bloqueada por el navegador. Habilite las ventanas emergentes.';
    } else if (code === 'auth/cancelled-popup-request') {
      msg = 'Ya hay una ventana emergente de autenticación en curso.';
    } else if (code === 'auth/network-request-failed') {
      msg = 'Fallo de conexión de red al conectar con los servidores de Google.';
    } else if (code === 'auth/operation-not-allowed') {
      msg = 'El proveedor de Google no está habilitado en Firebase Authentication.';
    }

    return { ok: false, error: msg };
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
    } catch (err) {
      console.warn('Error en signOut:', err);
    }
  }
}

export function subscribeToAuthChanges(
  onUserChanged: (session: UserSession | null) => void
): () => void {
  if (!isFirebaseConfigured) {
    onUserChanged(null);
    return () => {};
  }

  // Comprobar si viene de un flujo de redirección OAuth
  getRedirectResult(auth)
    .then(async (result) => {
      if (result?.user) {
        const existing = await getUserProfile(result.user.uid);
        if (existing) {
          onUserChanged({
            id: existing.uid,
            username: existing.email ? existing.email.split('@')[0] : existing.uid.slice(0, 8),
            fullName: existing.fullName,
            email: existing.email,
            role: existing.role,
            roleLabel: existing.roleLabel || roleToLabel(existing.role),
            branch: existing.branch || 'Sucursal Central - Farmacia StockCare',
            status: existing.status,
            lastLogin: new Date().toISOString(),
          });
        }
      }
    })
    .catch((err) => {
      console.warn('Redirect auth check error:', err);
    });

  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const existing = await getUserProfile(firebaseUser.uid);
      if (!existing) {
        // Usuario en Firebase Auth pero sin perfil en Firestore (QA-07)
        onUserChanged({
          id: firebaseUser.uid,
          username: firebaseUser.email ? firebaseUser.email.split('@')[0] : firebaseUser.uid.slice(0, 8),
          fullName: firebaseUser.displayName || 'Usuario no registrado',
          email: firebaseUser.email || '',
          role: 'BODEGA',
          roleLabel: 'Encargado de Bodega',
          branch: 'Sin sucursal',
          status: 'Inactivo',
          lastLogin: new Date().toISOString(),
          isUnprovisioned: true,
        });
        return;
      }

      onUserChanged({
        id: existing.uid,
        username: existing.email ? existing.email.split('@')[0] : existing.uid.slice(0, 8),
        fullName: existing.fullName,
        email: existing.email,
        role: existing.role,
        roleLabel: existing.roleLabel || roleToLabel(existing.role),
        branch: existing.branch || 'Sucursal Central - Farmacia StockCare',
        status: existing.status || 'Activo',
        lastLogin: new Date().toISOString(),
        isUnprovisioned: false,
      });
    } else {
      onUserChanged(null);
    }
  });
}
