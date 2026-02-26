"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser, initiateGoogleSignIn, initiateAnonymousSignIn } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Loader2, Google, User as UserIcon } from "lucide-react";
import { FusionIcon } from "@/components/icons/fusion-icon";

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isLoadingGuest, setIsLoadingGuest] = useState(false);

  useEffect(() => {
    if (!isUserLoading && user) {
      // Se o usuário já está logado (ou anônimo), redireciona para o dashboard
      router.push("/");
    }
  }, [user, isUserLoading, router]);

  const handleGoogleSignIn = async () => {
    setIsLoadingGoogle(true);
    try {
      initiateGoogleSignIn(auth);
    } catch (error) {
      console.error("Erro ao iniciar login com Google:", error);
      setIsLoadingGoogle(false);
    }
  };

  const handleGuestSignIn = async () => {
    setIsLoadingGuest(true);
    try {
      initiateAnonymousSignIn(auth);
    } catch (error) {
      console.error("Erro ao iniciar login anônimo:", error);
      setIsLoadingGuest(false);
    }
  };

  if (isUserLoading || user) {
    // Exibe um spinner enquanto o estado do usuário está sendo carregado
    // ou se o usuário já está logado e estamos redirecionando
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <div className="flex flex-col items-center gap-4 mb-8">
        <FusionIcon className="h-20 w-20 text-primary animate-pulse" />
        <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl font-headline">
          FusionFlow Reactor
        </h1>
        <p className="text-md text-muted-foreground uppercase tracking-widest font-mono">
          Bem-vindo à Simulação JAX
        </p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        <Button
          onClick={handleGoogleSignIn}
          disabled={isLoadingGoogle || isLoadingGuest}
          className="h-12 text-lg font-bold gap-3 bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg"
        >
          {isLoadingGoogle ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Google className="h-5 w-5" />
          )}
          Entrar com Google
        </Button>
        <Button
          onClick={handleGuestSignIn}
          disabled={isLoadingGoogle || isLoadingGuest}
          variant="outline"
          className="h-12 text-lg font-bold gap-3 border-primary text-primary hover:bg-primary/10 transition-colors"
        >
          {isLoadingGuest ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <UserIcon className="h-5 w-5" />
          )}
          Continuar como Convidado
        </Button>
      </div>

      <p className="mt-8 text-xs text-muted-foreground max-w-sm">
        Ao continuar, você concorda com nossos Termos de Serviço e Política de Privacidade.
      </p>
    </div>
  );
}
