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

  useEffect(() => {
    const init = async () => {
      const services = await initializeFirebase();
      setFirebaseServices(services);
    };
    init();
  }, []);

  if (!firebaseServices) {
    // Optionally render a loading spinner or placeholder
    return <div>Loading Firebase...</div>; 
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
