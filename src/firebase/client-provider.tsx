'use client';

import React, { useMemo, type ReactNode, useState, useEffect } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth } from 'firebase/auth';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [firebaseServices, setFirebaseServices] = useState<{ 
    firebaseApp: FirebaseApp; 
    auth: Auth; 
    firestore: Firestore; 
  } | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        console.log('[Firebase] Inicializando Firebase...');
        const services = await initializeFirebase();
        console.log('[Firebase] ✅ Firebase inicializado com sucesso');
        setFirebaseServices(services);
      } catch (error) {
        console.error('[Firebase] ❌ Erro ao inicializar:', error);
        setInitError(error instanceof Error ? error.message : String(error));
      }
    };
    init();
  }, []);

  if (initError) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-red-500">
        <p>Erro ao carregar Firebase:</p>
        <p className="text-sm">{initError}</p>
      </div>
    );
  }

  if (!firebaseServices) {
    // Optionally render a loading spinner or placeholder
    return <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-muted-foreground">Carregando Firebase...</div>; 
  }

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
