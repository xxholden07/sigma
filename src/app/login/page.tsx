
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser, initiateGoogleSignIn, initiateAnonymousSignIn } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Loader2, LogIn, User as UserIcon, Sparkles, Zap } from "lucide-react";
import { FusionIcon } from "@/components/icons/fusion-icon";

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isLoadingGuest, setIsLoadingGuest] = useState(false);

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push("/");
    }
  }, [user, isUserLoading, router]);

  const handleGoogleSignIn = async () => {
    setIsLoadingGoogle(true);
    try {
      initiateGoogleSignIn(auth);
    } catch (error) {
      setIsLoadingGoogle(false);
    }
  };

  const handleGuestSignIn = async () => {
    setIsLoadingGuest(true);
    try {
      initiateAnonymousSignIn(auth);
    } catch (error) {
      setIsLoadingGuest(false);
    }
  };

  if (isUserLoading || user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <FusionIcon className="h-16 w-16 text-primary" />
            <div className="absolute inset-0 bg-primary/30 rounded-full blur-2xl animate-pulse" />
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 text-center relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 mb-10">
        {/* Logo */}
        <div className="relative">
          <div className="absolute inset-0 bg-primary/40 rounded-full blur-3xl scale-150 animate-pulse" />
          <div className="relative h-28 w-28 rounded-full bg-gradient-to-br from-primary/20 to-cyan-500/10 border-2 border-primary/30 flex items-center justify-center">
            <FusionIcon className="h-16 w-16 text-primary" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-3">
          <h1 className="text-5xl sm:text-6xl font-black tracking-tight bg-gradient-to-r from-white via-primary to-cyan-400 bg-clip-text text-transparent font-headline">
            FusionFlow
          </h1>
          <div className="flex items-center justify-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <p className="text-sm text-muted-foreground uppercase tracking-[0.3em] font-mono">
              Reactor Simulator
            </p>
            <Zap className="h-4 w-4 text-primary" />
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
          Controle um reator de fusão nuclear com IA. Otimize parâmetros, alcance o breakeven e compita no ranking global.
        </p>
      </div>

      {/* Login buttons */}
      <div className="relative z-10 flex flex-col gap-4 w-full max-w-sm">
        <Button
          onClick={handleGoogleSignIn}
          disabled={isLoadingGoogle || isLoadingGuest}
          className="h-14 text-lg font-bold gap-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:scale-[1.02]"
        >
          {isLoadingGoogle ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <LogIn className="h-5 w-5" />
          )}
          Entrar com Google
        </Button>
        <Button
          onClick={handleGuestSignIn}
          disabled={isLoadingGoogle || isLoadingGuest}
          variant="outline"
          className="h-14 text-lg font-bold gap-3 border-primary/50 text-primary hover:bg-primary/10 hover:border-primary transition-all hover:scale-[1.02]"
        >
          {isLoadingGuest ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <UserIcon className="h-5 w-5" />
          )}
          Continuar como Convidado
        </Button>
      </div>

      {/* Features */}
      <div className="relative z-10 mt-12 flex flex-wrap justify-center gap-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>IA Autopilot</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-400" />
          <span>Simulação em Tempo Real</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-4 w-4 text-center text-lg leading-none">🏆</span>
          <span>Ranking Global</span>
        </div>
      </div>

      <p className="relative z-10 mt-8 text-[10px] text-muted-foreground/60 max-w-sm">
        Ao continuar, você concorda com nossos Termos de Serviço e Política de Privacidade.
      </p>
    </div>
  );
}
