'use client';
import {
  Auth, // Import Auth type for type hinting
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider, // Import GoogleAuthProvider
  signInWithPopup, // Use popup instead of redirect for better UX
  signInWithRedirect,
  getRedirectResult,
  // Assume getAuth and app are initialized elsewhere
} from 'firebase/auth';

/** Initiate anonymous sign-in (non-blocking). */
export function initiateAnonymousSignIn(authInstance: Auth): void {
  // CRITICAL: Call signInAnonymously directly. Do NOT use 'await signInAnonymously(...)'.
  signInAnonymously(authInstance);
  // Code continues immediately. Auth state change is handled by onAuthStateChanged listener.
}

/** Initiate email/password sign-up (non-blocking). */
export function initiateEmailSignUp(authInstance: Auth, email: string, password: string): void {
  // CRITICAL: Call createUserWithEmailAndPassword directly. Do NOT use 'await createUserWithEmailAndPassword(...)'.
  createUserWithEmailAndPassword(authInstance, email, password);
  // Code continues immediately. Auth state change is handled by onAuthStateChanged listener.
}

/** Initiate email/password sign-in (non-blocking). */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string): void {
  // CRITICAL: Call signInWithEmailAndPassword directly. Do NOT use 'await signInWithEmailAndPassword(...)'.
  signInWithEmailAndPassword(authInstance, email, password);
  // Code continues immediately. Auth state change is handled by onAuthStateChanged listener.
}

/** Initiate Google sign-in using popup (non-blocking). */
export function initiateGoogleSignIn(authInstance: Auth): void {
  const provider = new GoogleAuthProvider();
  // Use popup for better UX - redirect can have issues with some browsers
  console.log('[Auth] Iniciando login com Google via popup...');
  signInWithPopup(authInstance, provider)
    .then((result) => {
      console.log('[Auth] ✅ Login Google bem sucedido:', result.user.email);
    })
    .catch((error) => {
      console.error('[Auth] ❌ Erro no login Google:', error.code, error.message);
    });
  // Code continues immediately. Auth state change is handled by onAuthStateChanged listener.
}

/** Handle redirect result after returning from Google sign-in */
export async function handleGoogleRedirectResult(authInstance: Auth): Promise<void> {
  try {
    const result = await getRedirectResult(authInstance);
    if (result) {
      console.log('[Auth] ✅ Redirect result processado:', result.user.email);
    }
  } catch (error: any) {
    console.error('[Auth] ❌ Erro ao processar redirect result:', error.code, error.message);
  }
}
