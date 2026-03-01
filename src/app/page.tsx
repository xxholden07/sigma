
"use client";

import { useEffect } from 'react';
import { FusionReactorDashboard } from "@/components/dashboard/fusion-reactor-dashboard";
import { useUser } from "@/firebase";
import { useRouter } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    console.log('[Auth] Estado:', { isUserLoading, user: user?.email || null });
    if (!isUserLoading && !user) {
      console.log('[Auth] Redirecionando para /login...');
      router.push('/login');
    }
  }, [isUserLoading, user, router]);

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <LoaderCircle className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Carregando protocolos JAX/DeepMind...</p>
      </div>
    );
  }

  if (!user) {
      console.log('[Auth] Usuário não autenticado, aguardando redirecionamento...');
      return null;
  }

  console.log('[Auth] ✅ Usuário autenticado:', user.email);
  return (
    <main>
      <FusionReactorDashboard />
    </main>
  );
}
