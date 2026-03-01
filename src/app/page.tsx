
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
    if (!isUserLoading && !user) {
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
      return null;
  }

  return (
    <main>
        <div className="absolute top-0 left-0 w-full z-50 p-4 flex flex-col items-center text-center pointer-events-none">
            <h1 className="font-headline text-2xl font-bold tracking-tight text-primary">Bem-vindo, Operador de Reator.</h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
                Sua missão: controlar nosso reator de fusão Tokamak para gerar energia limpa. Cada tentativa, sucesso ou falha, alimenta o dataset de treinamento do nosso agente de IA, Prometeu. A humanidade conta com você.
            </p>
        </div>
      <FusionReactorDashboard />
    </main>
  );
}
