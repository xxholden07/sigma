
"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Sidebar, SidebarContent, SidebarHeader, SidebarInset, SidebarProvider, SidebarTrigger, SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from "@/components/ui/sidebar";
import type { Particle, FusionFlash, SimulationRun, ReactionMode, TelemetrySnapshot } from "@/lib/simulation-types";
import {
  INITIAL_PARTICLE_COUNT,
  INITIAL_TEMPERATURE,
  INITIAL_CONFINEMENT,
  ENERGY_THRESHOLD,
  DT_FUSION_ENERGY_MEV,
  DHE3_FUSION_ENERGY_MEV,
  PARTICLE_RADIUS,
  SIMULATION_WIDTH,
  SIMULATION_HEIGHT,
  PHI,
} from "@/lib/simulation-constants";
import { SimulationCanvas } from "./simulation-canvas";
import { ControlPanel } from "./control-panel";
import { TelemetryPanel } from "./telemetry-panel";
import { AIAssistant } from "./ai-assistant";
import { LeaderboardPanel } from "./leaderboard-panel";
import { FusionIcon } from "../icons/fusion-icon";
import { useFirebase, useUser, addDocumentNonBlocking, useCollection, useMemoFirebase } from "@/firebase";
import { collection, collectionGroup, query, orderBy, limit } from "firebase/firestore";
import { SimulationHistoryPanel } from "./simulation-history";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Microscope, Zap, ShieldAlert, Play, AlertTriangle, Database, History, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function createInitialParticles(count: number, mode: ReactionMode): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      id: i,
      x: 200 + Math.random() * 400,
      y: 150 + Math.random() * 300,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      type: mode === 'DD_DHe3' ? 'D' : (Math.random() > 0.5 ? 'D' : 'T'),
    });
  }
  return particles;
}

export function FusionReactorDashboard() {
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [isSimulating, setIsSimulating] = useState(false);
  const [settings, setSettings] = useState({
    temperature: INITIAL_TEMPERATURE,
    confinement: INITIAL_CONFINEMENT,
    energyThreshold: ENERGY_THRESHOLD,
    initialParticleCount: INITIAL_PARTICLE_COUNT,
    reactionMode: 'DT' as ReactionMode,
  });
  
  const [telemetry, setTelemetry] = useState({
    totalEnergyGenerated: 0,
    particleCount: INITIAL_PARTICLE_COUNT,
    fusionRate: 0,
    relativeTemperature: INITIAL_TEMPERATURE,
    fusionEfficiency: 0,
    averageKineticEnergy: 0,
    qFactor: 0,
    lyapunovExponent: 0,
    magneticSafetyFactorQ: 1.0,
    wallIntegrity: 100,
    aiReward: 0,
    fractalDimensionD: 1.0,
    simulationDuration: 0,
    score: 0,
  });
  
  const [peakFusionRate, setPeakFusionRate] = useState(0);
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetrySnapshot[]>([]);
  const [confinementPenalty, setConfinementPenalty] = useState(0);

  const lastHistorySnapshotTime = useRef(performance.now());

  // Personal runs query
  const runsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'simulationRuns');
  }, [firestore, user]);
  const { data: rawRuns } = useCollection<SimulationRun>(runsQuery);
  const allRuns = useMemo(() => {
    if (!rawRuns) return [];
    return [...rawRuns].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [rawRuns]);

  // Global leaderboard query - Requires collectionGroup permissions
  const leaderboardQuery = useMemoFirebase(() => {
      if (!firestore) return null;
      return query(
          collectionGroup(firestore, 'simulationRuns'), 
          orderBy('score', 'desc'), 
          limit(10)
      );
  }, [firestore]);
  const { data: topRuns, isLoading: isLeaderboardLoading } = useCollection<SimulationRun>(leaderboardQuery);

  const simulationStateRef = useRef({
    particles: createInitialParticles(settings.initialParticleCount, settings.reactionMode),
    flashes: [] as FusionFlash[],
    nextParticleId: settings.initialParticleCount,
    nextFlashId: 0,
    fusionsInLastSecond: 0,
    velocityVariance: 0,
  });
  
  const totalEnergyGeneratedRef = useRef(0);
  const simulationTimeStartRef = useRef(performance.now());
  const lastFusionRateUpdateTime = useRef(performance.now());

  // Removido: login anônimo automático - agora o login é feito na página /login

  const handleSaveSimulation = useCallback(() => {
    if (!user || !firestore || totalEnergyGeneratedRef.current === 0) return;

    const sanitize = (val: any) => (typeof val === 'number' && isFinite(val) ? val : 0);

    const runData: SimulationRun = {
        id: `run_${new Date().toISOString()}`,
        userId: user.uid,
        createdAt: new Date().toISOString(),
        durationSeconds: sanitize(((performance.now() - simulationTimeStartRef.current) / 1000)),
        totalEnergyGeneratedMeV: sanitize(totalEnergyGeneratedRef.current),
        peakFusionRate: sanitize(peakFusionRate),
        outcome: (totalEnergyGeneratedRef.current > 75) ? 'High Yield' : (totalEnergyGeneratedRef.current > 25) ? 'Stable' : 'Suboptimal',
        initialParticleCount: settings.initialParticleCount,
        initialTemperature: settings.temperature,
        initialConfinement: settings.confinement,
        finalEnergyThreshold: settings.energyThreshold,
        reactionMode: settings.reactionMode,
        finalLyapunovExponent: sanitize(telemetry.lyapunovExponent),
        finalFractalDimensionD: sanitize(telemetry.fractalDimensionD),
        finalMagneticSafetyFactorQ: sanitize(telemetry.magneticSafetyFactorQ),
        finalWallIntegrity: sanitize(telemetry.wallIntegrity),
        finalAiReward: sanitize(telemetry.aiReward),
        score: sanitize(telemetry.score),
    };

    const runsCollectionRef = collection(firestore, 'users', user.uid, 'simulationRuns');
    addDocumentNonBlocking(runsCollectionRef, runData);
  }, [user, firestore, peakFusionRate, settings, telemetry]);

  const resetSimulation = useCallback((newMode?: ReactionMode) => {
    if (isSimulating) {
        handleSaveSimulation();
    }
    setIsSimulating(false);

    const reactionMode = typeof newMode === 'string' ? newMode : settings.reactionMode;

    const newSettings = {
      ...settings,
      temperature: INITIAL_TEMPERATURE,
      confinement: INITIAL_CONFINEMENT,
      reactionMode,
    };
    setSettings(newSettings);

    simulationStateRef.current = {
        particles: createInitialParticles(newSettings.initialParticleCount, reactionMode),
        flashes: [],
        nextParticleId: newSettings.initialParticleCount,
        nextFlashId: 0,
        fusionsInLastSecond: 0,
        velocityVariance: 0,
    };
    totalEnergyGeneratedRef.current = 0;
    
    setTelemetryHistory([]);
    setPeakFusionRate(0);
    setConfinementPenalty(0);

    setTelemetry(prev => ({...prev,
      totalEnergyGenerated: 0,
      particleCount: newSettings.initialParticleCount,
      fusionRate: 0,
      relativeTemperature: INITIAL_TEMPERATURE,
      qFactor: 0,
      magneticSafetyFactorQ: 1.0,
      wallIntegrity: 100,
      fractalDimensionD: 1.0,
      simulationDuration: 0,
      score: 0,
    }));
    
    simulationTimeStartRef.current = performance.now();
    lastFusionRateUpdateTime.current = performance.now();
  }, [handleSaveSimulation, settings, isSimulating]);

  const handleStopSimulation = useCallback(() => {
    setIsSimulating(false);
    handleSaveSimulation();
  }, [handleSaveSimulation]);

  const handleStartIgnition = useCallback((forceReset = false) => {
    if (isSimulating && !forceReset) return;
    if (forceReset) {
        resetSimulation();
    }
    setIsSimulating(true);
    simulationTimeStartRef.current = performance.now();
    lastFusionRateUpdateTime.current = performance.now();
    lastHistorySnapshotTime.current = performance.now();
  }, [isSimulating, resetSimulation]);

  const handleTemperatureChange = useCallback((newTemp: number) => {
    setSettings(s => ({...s, temperature: newTemp}));
  }, []);
  
  const handleConfinementChange = useCallback((value: number) => {
    setSettings(s => ({...s, confinement: value}));
  }, []);

  const handleEnergyThresholdChange = useCallback((value: number) => {
    setSettings(s => ({...s, energyThreshold: value}));
  }, []);

  const handleInitialParticleCountChange = useCallback((value: number) => {
    setSettings(s => ({...s, initialParticleCount: value}));
  }, []);

  const handleReactionModeChange = useCallback((mode: ReactionMode) => {
    resetSimulation(mode);
  }, [resetSimulation]);

  useEffect(() => {
    let animationFrameId: number;
    
    const gameLoop = () => {
      if (!isSimulating) {
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
      }

      const { particles: currentParticles, flashes: currentFlashes } = simulationStateRef.current;
      const { confinement, energyThreshold, reactionMode, temperature } = settings;

      const effectiveConfinement = Math.max(0, confinement - confinementPenalty);
      let wallDamage = 0;

      for (const p of currentParticles) {
        const dx = (SIMULATION_WIDTH / 2) - p.x;
        const dy = (SIMULATION_HEIGHT / 2) - p.y;
        const distance = Math.hypot(dx, dy);
        
        const tempForce = (temperature / 100) * 0.1;

        if (distance > 1) {
            p.vx += (dx / distance) * (effectiveConfinement * 0.5) + (Math.random() - 0.5) * tempForce;
            p.vy += (dy / distance) * (effectiveConfinement * 0.5) + (Math.random() - 0.5) * tempForce;
        }

        p.x += p.vx;
        p.y += p.vy;

        if (p.x <= PARTICLE_RADIUS || p.x >= SIMULATION_WIDTH - PARTICLE_RADIUS) {
            p.vx *= -1;
            wallDamage += 0.05;
        }
        if (p.y <= PARTICLE_RADIUS || p.y >= SIMULATION_HEIGHT - PARTICLE_RADIUS) {
            p.vy *= -1;
            wallDamage += 0.05;
        }
      }
      
      const newParticlesList: Particle[] = [];
      const fusedIndices = new Set<number>();
      let newEnergy = 0;
    
      for (let i = 0; i < currentParticles.length; i++) {
        if (fusedIndices.has(i)) continue;
        let hasFusedWithAnother = false;
        
        for (let j = i + 1; j < currentParticles.length; j++) {
          if (fusedIndices.has(j)) continue;

          const p1 = currentParticles[i];
          const p2 = currentParticles[j];
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
    
          if (dist < PARTICLE_RADIUS * 2) {
            const collisionEnergy = Math.hypot(p1.vx - p2.vx, p1.vy - p2.vy);
            if (collisionEnergy > energyThreshold) {
              
              let reactionType: 'none' | 'DT' | 'DD' | 'DHe3' = 'none';

              if (reactionMode === 'DT' && p1.type !== p2.type) {
                reactionType = 'DT';
                newEnergy = DT_FUSION_ENERGY_MEV;
              } else if (reactionMode === 'DD_DHe3') {
                if (p1.type === 'D' && p2.type === 'D') reactionType = 'DD';
                else if (p1.type === 'He3' || p2.type === 'He3') {
                  if (p1.type !== p2.type) {
                    reactionType = 'DHe3';
                    newEnergy = DHE3_FUSION_ENERGY_MEV;
                  }
                }
              }

              if (reactionType !== 'none') {
                hasFusedWithAnother = true;
                fusedIndices.add(j);
                
                if (reactionType === 'DD') {
                  newParticlesList.push({ id: simulationStateRef.current.nextParticleId++, x: p1.x, y: p1.y, vx: p1.vx * 0.5, vy: p1.vy * 0.5, type: 'He3' });
                } else if (newEnergy > 0) {
                  simulationStateRef.current.fusionsInLastSecond++;
                  currentFlashes.push({ id: simulationStateRef.current.nextFlashId++, x: p1.x, y: p1.y, radius: 2, opacity: 1 });
                }
                break;
              }
            }
          }
        }
        if (!hasFusedWithAnother) newParticlesList.push(currentParticles[i]);
      }

      if (wallDamage > 0) {
          setTelemetry(prev => {
              const newWallIntegrity = Math.max(0, prev.wallIntegrity - wallDamage);
              if (newWallIntegrity === 0) {
                  toast({ title: "Falha Crítica do Reator!", description: "A integridade da parede chegou a 0%. Salvando dados da simulação.", variant: "destructive" });
                  resetSimulation();
              }
              return { ...prev, wallIntegrity: newWallIntegrity };
          });
      }

      simulationStateRef.current.particles = newParticlesList;
      simulationStateRef.current.flashes = currentFlashes.filter(f => {
        f.radius += 1.5;
        f.opacity -= 0.05;
        return f.opacity > 0;
      });
      
      totalEnergyGeneratedRef.current += newEnergy;
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [settings, isSimulating, confinementPenalty, resetSimulation, toast]);
  
  useEffect(() => {
    const intervalId = setInterval(() => {
        if (!isSimulating) return;

        const currentTime = performance.now();
        setTelemetry(prev => {
            let newFusionRate = prev.fusionRate;
            let instantaneousQ = prev.qFactor;

            if (currentTime - lastFusionRateUpdateTime.current >= 1000) {
                newFusionRate = simulationStateRef.current.fusionsInLastSecond;
                const energyInPerSecond = (settings.temperature * settings.confinement * settings.initialParticleCount * 0.05) + 1;
                const energyOutPerSecond = newFusionRate * (settings.reactionMode === 'DT' ? DT_FUSION_ENERGY_MEV : DHE3_FUSION_ENERGY_MEV);
                instantaneousQ = parseFloat((energyOutPerSecond / energyInPerSecond).toFixed(2));
                simulationStateRef.current.fusionsInLastSecond = 0;
                lastFusionRateUpdateTime.current = currentTime;
            }

            const duration = (performance.now() - simulationTimeStartRef.current) / 1000;
            const magSafetyQ = parseFloat((1 + (settings.confinement * 3) / (Math.max(1, settings.temperature / 50))).toFixed(3));
            const fractalTurbulence = Math.abs(magSafetyQ - PHI) * 0.3;
            const dFactor = 1.0 + Math.min(0.9, fractalTurbulence);
            
            const newScore = (totalEnergyGeneratedRef.current * 10) + (instantaneousQ * 50) + (duration * 2);

            return {
                ...prev,
                totalEnergyGenerated: totalEnergyGeneratedRef.current,
                particleCount: simulationStateRef.current.particles.length,
                fusionRate: newFusionRate,
                simulationDuration: duration,
                qFactor: instantaneousQ,
                magneticSafetyFactorQ: magSafetyQ,
                fractalDimensionD: dFactor,
                score: newScore,
            };
        });
    }, 200);
    return () => clearInterval(intervalId);
  }, [settings, isSimulating]);

  useEffect(() => {
    if (!isSimulating) return;

    const now = performance.now();
    if (now - lastHistorySnapshotTime.current > 500) {
        const snapshot: TelemetrySnapshot = {
            timestamp: now,
            qFactor: telemetry.qFactor,
            fusionRate: telemetry.fusionRate,
            particleCount: telemetry.particleCount,
            relativeTemperature: settings.temperature,
            magneticSafetyFactorQ: telemetry.magneticSafetyFactorQ,
            fractalDimensionD: telemetry.fractalDimensionD,
        };

        setTelemetryHistory(prev => {
            const newHistory = [...prev, snapshot].slice(-50);
            return newHistory;
        });
        
        lastHistorySnapshotTime.current = now;
    }
  }, [isSimulating, telemetry, settings.temperature]);

  return (
    <SidebarProvider defaultOpen>
      <div className="flex h-screen w-full flex-col bg-background">
        <header className="flex h-16 items-center gap-4 border-b border-primary/10 px-4 sm:h-18 sm:px-6 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 backdrop-blur-md sticky top-0 z-50 shadow-lg shadow-primary/5">
          <div className="relative">
            <FusionIcon className="h-8 w-8 text-primary" />
            {isSimulating && <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-green-500 rounded-full animate-pulse border-2 border-slate-950" />}
          </div>
          <div className="flex flex-col">
            <h1 className="font-headline text-lg font-bold tracking-tight sm:text-xl bg-gradient-to-r from-primary via-cyan-400 to-primary bg-clip-text text-transparent leading-none">FusionFlow Reactor</h1>
            <p className="text-[9px] text-muted-foreground uppercase tracking-[0.25em] font-mono">Sistema de Controle TORAX v2.0</p>
          </div>
          
          <div className="ml-auto flex items-center gap-2 sm:gap-4">
              {/* Score Display */}
              <div className="hidden lg:flex flex-col items-end px-4 py-1.5 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30">
                  <span className="text-[8px] font-bold text-primary/70 uppercase tracking-wider">Pontuação</span>
                  <span className="text-lg font-mono font-black text-primary tabular-nums">{Math.round(telemetry.score).toLocaleString()}</span>
              </div>

              {/* Q-Factor Display */}
              <div className={`hidden md:flex flex-col items-center px-3 py-1.5 rounded-lg border transition-all duration-500 ${
                telemetry.qFactor >= 5.0 
                  ? 'bg-gradient-to-br from-amber-500/30 to-orange-500/10 border-amber-500/50 shadow-[0_0_20px_-5px_rgba(245,158,11,0.6)]' 
                  : telemetry.qFactor >= 1.0 
                    ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/5 border-green-500/40' 
                    : 'bg-slate-800/50 border-white/10'
              }`}>
                  <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">Fator Q</span>
                  <div className="flex items-center gap-1">
                    <Zap className={`h-3.5 w-3.5 ${telemetry.qFactor >= 5.0 ? "text-amber-400 animate-pulse" : telemetry.qFactor >= 1.0 ? "text-green-400" : "text-primary/50"}`} />
                    <span className={`text-lg font-mono font-black tabular-nums ${telemetry.qFactor >= 5.0 ? 'text-amber-400' : telemetry.qFactor >= 1.0 ? 'text-green-400' : 'text-white'}`}>{telemetry.qFactor.toFixed(2)}</span>
                  </div>
              </div>

              {/* Dataset Counter */}
              <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/40 border border-white/5">
                <Database className="h-3.5 w-3.5 text-cyan-400" />
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold text-muted-foreground uppercase">Dataset</span>
                  <span className="text-sm font-mono font-bold text-cyan-400">{allRuns?.length || 0}</span>
                </div>
              </div>

              {/* Status Badge */}
              <Badge 
                variant="outline" 
                className={`h-9 px-3 gap-2 transition-all duration-300 ${
                  isSimulating 
                    ? 'bg-green-500/10 border-green-500/50 text-green-400' 
                    : 'bg-slate-800/50 border-white/10 text-muted-foreground'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${isSimulating ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`} />
                <span className="text-xs font-bold uppercase tracking-wider">{isSimulating ? 'ATIVO' : 'IDLE'}</span>
              </Badge>
              <SidebarTrigger />
          </div>
        </header>
        <div className="flex flex-1 overflow-hidden">
          <Sidebar>
            <SidebarHeader className="border-b border-primary/10 p-4 bg-gradient-to-b from-slate-900/40 to-transparent">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/30 to-cyan-500/10 flex items-center justify-center border border-primary/20">
                  <Microscope className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white">Laboratório</h2>
                  <p className="text-[9px] text-primary/70 uppercase tracking-[0.2em]">TORAX Control</p>
                </div>
              </div>
            </SidebarHeader>
            <SidebarContent className="p-0 overflow-auto">
              <SidebarGroup>
                <SidebarGroupLabel>Controle de Variáveis</SidebarGroupLabel>
                <SidebarGroupContent className="p-4">
                  <ControlPanel 
                    settings={settings}
                    onTemperatureChange={handleTemperatureChange}
                    onConfinementChange={handleConfinementChange}
                    onEnergyThresholdChange={handleEnergyThresholdChange}
                    onInitialParticleCountChange={handleInitialParticleCountChange}
                    onReactionModeChange={handleReactionModeChange}
                    onReset={() => resetSimulation()}
                    isSimulating={isSimulating}
                    onStartIgnition={handleStartIgnition}
                  />
                </SidebarGroupContent>
              </SidebarGroup>
              
              <SidebarGroup>
                <SidebarGroupLabel>Agente Prometeu (RL)</SidebarGroupLabel>
                <SidebarGroupContent className="p-4">
                  <AIAssistant
                    telemetryHistory={telemetryHistory}
                    settings={settings}
                    currentReward={telemetry.aiReward}
                    onTemperatureChange={handleTemperatureChange}
                    onConfinementChange={handleConfinementChange}
                    onReactionModeChange={handleReactionModeChange}
                    onReset={() => resetSimulation()}
                    onStartIgnition={handleStartIgnition}
                    isSimulating={isSimulating}
                    topRuns={topRuns}
                  />
                </SidebarGroupContent>
              </SidebarGroup>

              <SidebarGroup>
                <SidebarGroupLabel>Telemetria em Tempo Real</SidebarGroupLabel>
                <SidebarGroupContent className="p-4">
                  <TelemetryPanel telemetry={telemetry} telemetryHistory={telemetryHistory} />
                </SidebarGroupContent>
              </SidebarGroup>
              
              <SidebarGroup>
                <SidebarGroupLabel>Ranking Global</SidebarGroupLabel>
                <SidebarGroupContent className="p-4">
                   <LeaderboardPanel topRuns={topRuns ?? undefined} isLoading={isLeaderboardLoading} />
                </SidebarGroupContent>
              </SidebarGroup>

              <SidebarGroup>
                <SidebarGroupLabel className="flex items-center gap-2">
                   <History className="h-3 w-3" />
                   Meu Histórico
                </SidebarGroupLabel>
                <SidebarGroupContent className="p-4">
                  <SimulationHistoryPanel runs={allRuns} isLoading={isUserLoading} />
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <SidebarInset className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            <div className="relative flex h-full w-full items-center justify-center p-4 md:p-8">
              <div className="relative aspect-video w-full max-w-full lg:max-w-[1100px] overflow-hidden rounded-3xl border-2 border-primary/40 bg-black shadow-[0_0_100px_-25px_rgba(59,130,246,0.7),inset_0_0_60px_-30px_rgba(59,130,246,0.3)] ring-1 ring-white/20">
                {/* Corner Accents */}
                <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-primary/60 rounded-tl-3xl" />
                <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-primary/60 rounded-tr-3xl" />
                <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-primary/60 rounded-bl-3xl" />
                <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-primary/60 rounded-br-3xl" />
                {!isSimulating && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-b from-slate-950/90 via-slate-900/95 to-slate-950/90 backdrop-blur-lg gap-6">
                    <div className="flex flex-col items-center gap-4 text-center">
                        {telemetry.wallIntegrity < 100 ? (
                            <>
                                <div className="relative">
                                  <AlertTriangle className="h-20 w-20 text-red-500" />
                                  <div className="absolute inset-0 h-20 w-20 bg-red-500/20 rounded-full blur-2xl animate-pulse" />
                                </div>
                                <h2 className="text-4xl font-headline font-black text-red-400 uppercase tracking-tight">Falha Crítica</h2>
                                <p className="text-sm text-muted-foreground max-w-md">Integridade da parede comprometida. Analisando dados da simulação...</p>
                            </>
                        ) : (
                            <>
                               <div className="relative">
                                 <div className="absolute inset-0 bg-primary/30 rounded-full blur-3xl animate-pulse" />
                                 <div className="relative h-24 w-24 rounded-full bg-gradient-to-br from-primary/20 to-cyan-500/10 border-2 border-primary/30 flex items-center justify-center">
                                   <Play className="h-10 w-10 text-primary ml-1" />
                                 </div>
                               </div>
                               <h2 className="text-4xl font-headline font-black bg-gradient-to-r from-white to-primary bg-clip-text text-transparent uppercase tracking-tight">Pronto</h2>
                               <p className="text-sm text-muted-foreground max-w-md">Sistema aguardando comando de ignição manual ou ativação do piloto automático.</p>
                            </>
                        )}
                    </div>
                    <Button 
                      size="lg" 
                      onClick={telemetry.wallIntegrity < 100 ? () => resetSimulation() : () => handleStartIgnition()} 
                      className={`h-14 px-12 text-lg font-bold gap-3 transition-all duration-300 hover:scale-105 ${
                        telemetry.wallIntegrity < 100 
                          ? 'bg-red-500 hover:bg-red-600 shadow-[0_0_40px_-10px_rgba(239,68,68,0.8)]' 
                          : 'bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-500/90 shadow-[0_0_50px_-10px_rgba(59,130,246,0.9)]'
                      }`}
                    >
                      {telemetry.wallIntegrity < 100 ? <RotateCcw className="h-6 w-6" /> : <Play className="h-6 w-6 fill-current" />}
                      {telemetry.wallIntegrity < 100 ? "REINICIAR SISTEMA" : "INICIAR IGNIÇÃO"}
                    </Button>
                  </div>
                )}
                
                {confinementPenalty > 0 && (
                    <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-red-500/20 border border-red-500/50 p-2 rounded animate-pulse">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span className="text-[10px] font-bold text-red-500 uppercase">Perda de Eficiência Magnética</span>
                    </div>
                )}

                <SimulationCanvas 
                    getParticles={() => simulationStateRef.current.particles}
                    getFlashes={() => simulationStateRef.current.flashes}
                    settings={settings}
                    qFactor={telemetry.qFactor}
                    magneticSafetyFactorQ={telemetry.magneticSafetyFactorQ}
                    fractalDimensionD={telemetry.fractalDimensionD}
                />
              </div>
            </div>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
