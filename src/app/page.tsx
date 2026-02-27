"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/firebase";
import { FusionReactorDashboard } from "@/components/dashboard/fusion-reactor-dashboard";
import { Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (!isUserLoading && !user) {
      // Se o usuário não está logado e o carregamento terminou, redireciona para a página de login
      router.push("/login");
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading) {
    // Exibe um spinner enquanto o estado de autenticação está sendo carregado
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // Se não há usuário e não está carregando (já redirecionou ou vai redirecionar), 
    // pode retornar null ou um spinner para evitar renderizar o dashboard sem usuário.
    return null;
  }

  // Se o usuário está logado, renderiza o dashboard
  return (
    <main>
      <FusionReactorDashboard />
    </main>
  );
}
