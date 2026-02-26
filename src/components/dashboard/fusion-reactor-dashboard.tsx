
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
import { FusionIcon } from "../icons/fusion-icon";
import { useFirebase, useUser, initiateAnonymousSignIn, addDocumentNonBlocking, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { SimulationHistoryPanel } from "./simulation-history";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button"; // Importação crucial adicionada
import { Microscope, Zap, ShieldAlert, Play, AlertTriangle, Database, History } from "lucide-react";
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
  const { firestore, auth } = useFirebase();
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
  });
  
  const [peakFusionRate, setPeakFusionRate] = useState(0);
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetrySnapshot[]>([]);
  const [confinementPenalty, setConfinementPenalty] = useState(0);

  const runsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users', user.uid, 'simulationRuns'), orderBy('createdAt', 'desc'));
  }, [firestore, user]);
  const { data: allRuns } = useCollection<SimulationRun>(runsQuery);

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

  useEffect(() => {
    if (auth && !isUserLoading && !user) {
      initiateAnonymousSignIn(auth);
    }
  }, [isUserLoading, user, auth]);

  const handleSaveSimulation = useCallback(() => {
    if (!user || !firestore || totalEnergyGeneratedRef.current === 0) return;

    const runData: Omit<SimulationRun, 'id'> = {
        userId: user.uid,
        createdAt: new Date().toISOString(),
        durationSeconds: parseFloat(((performance.now() - simulationTimeStartRef.current) / 1000).toFixed(1)),
        totalEnergyGeneratedMeV: parseFloat(totalEnergyGeneratedRef.current.toFixed(1)),
        peakFusionRate: peakFusionRate,
        outcome: (totalEnergyGeneratedRef.current / 100) > 75 ? 'High Yield' : (totalEnergyGeneratedRef.current / 100) > 25 ? 'Stable' : 'Suboptimal',
        initialParticleCount: settings.initialParticleCount,
        initialTemperature: settings.temperature,
        initialConfinement: settings.confinement,
        finalEnergyThreshold: settings.energyThreshold,
        reactionMode: settings.reactionMode,
        finalLyapunovExponent: telemetry.lyapunovExponent,
        finalFractalDimensionD: telemetry.fractalDimensionD,
        finalMagneticSafetyFactorQ: telemetry.magneticSafetyFactorQ,
        finalWallIntegrity: telemetry.wallIntegrity,
        finalAiReward: telemetry.aiReward,
    };

    const sanitize = (val: any) => (typeof val === 'number' && isFinite(val) ? val : 0);
    
    const sanitizedData = {
        ...runData,
        durationSeconds: sanitize(runData.durationSeconds),
        totalEnergyGeneratedMeV: sanitize(runData.totalEnergyGeneratedMeV),
        peakFusionRate: sanitize(runData.peakFusionRate),
        finalLyapunovExponent: sanitize(runData.finalLyapunovExponent),
        finalFractalDimensionD: sanitize(runData.finalFractalDimensionD),
        finalMagneticSafetyFactorQ: sanitize(runData.finalMagneticSafetyFactorQ),
        finalWallIntegrity: sanitize(runData.finalWallIntegrity),
        finalAiReward: sanitize(runData.finalAiReward),
    };

    const runsCollectionRef = collection(firestore, 'users', user.uid, 'simulationRuns');
    addDocumentNonBlocking(runsCollectionRef, sanitizedData);
  }, [user, firestore, peakFusionRate, settings, telemetry]);

  const resetSimulation = useCallback((newMode?: ReactionMode) => {
    handleSaveSimulation();
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

    setTelemetry({
      totalEnergyGenerated: 0,
      particleCount: newSettings.initialParticleCount,
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
    });
    
    simulationTimeStartRef.current = performance.now();
    lastFusionRateUpdateTime.current = performance.now();
  }, [handleSaveSimulation, settings]);

  const handleStartIgnition = useCallback(() => {
    setIsSimulating(true);
    simulationTimeStartRef.current = performance.now();
    lastFusionRateUpdateTime.current = performance.now();
  }, []);

  useEffect(() => {
    if (!isSimulating) return;

    const turbulenceInterval = setInterval(() => {
      if (Math.random() > 0.8) {
        toast({
          title: "ALERTA DE TURBULÊNCIA",
          description: "Pico de instabilidade magnética detectado! Estabilizando...",
          variant: "destructive",
        });
        
        simulationStateRef.current.particles.forEach(p => {
          p.vx += (Math.random() - 0.5) * 10;
          p.vy += (Math.random() - 0.5) * 10;
        });
      }
    }, 10000);

    return () => clearInterval(turbulenceInterval);
  }, [isSimulating, toast]);

  useEffect(() => {
    if (!isSimulating) return;
    
    const degradationInterval = setInterval(() => {
        if (settings.temperature > 170) {
            setConfinementPenalty(p => Math.min(0.5, p + 0.01));
            if (Math.random() > 0.9) {
                toast({
                    title: "DEGRADAÇÃO TÉRMICA",
                    description: "Bobinas magnéticas superaquecidas. Perda de eficiência de confinamento.",
                    variant: "destructive"
                });
            }
        } else if (settings.temperature < 140) {
            setConfinementPenalty(p => Math.max(0, p - 0.01));
        }
    }, 2000);

    return () => clearInterval(degradationInterval);
  }, [isSimulating, settings.temperature, toast]);

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

      let sumVx = 0, sumVy = 0;
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

        if (p.x <= PARTICLE_RADIUS || p.x >= SIMULATION_WIDTH - PARTICLE_RADIUS) p.vx *= -1;
        if (p.y <= PARTICLE_RADIUS || p.y >= SIMULATION_HEIGHT - PARTICLE_RADIUS) p.vy *= -1;
        
        sumVx += Math.abs(p.vx);
        sumVy += Math.abs(p.vy);
      }
      
      simulationStateRef.current.velocityVariance = (sumVx + sumVy) / Math.max(1, currentParticles.length);

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
  }, [settings, isSimulating, confinementPenalty]);
  
  useEffect(() => {
    const intervalId = setInterval(() => {
        if (!isSimulating) return;

        const currentTime = performance.now();
        const particles = simulationStateRef.current.particles;

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
            const rawLyapunov = (simulationStateRef.current.velocityVariance / 5) - (settings.confinement * 2);
            const lyapunov = parseFloat(rawLyapunov.toFixed(3));
            const magSafetyQ = parseFloat((1 + (settings.confinement * 3) / (Math.max(1, settings.temperature / 50))).toFixed(3));

            const fractalTurbulence = Math.max(0, lyapunov * 0.5) + (Math.abs(magSafetyQ - PHI) * 0.3);
            const dFactor = 1.0 + Math.min(0.9, fractalTurbulence);

            let newWallIntegrity = prev.wallIntegrity;
            if (settings.reactionMode === 'DT' && newFusionRate > 5) {
                newWallIntegrity = Math.max(0, prev.wallIntegrity - (newFusionRate * 0.01));
                if (newWallIntegrity === 0) {
                    toast({ title: "FALHA ESTRUTURAL", description: "Blindagem do reator comprometida por nêutrons.", variant: "destructive"});
                    resetSimulation();
                }
            }

            const kamBonus = Math.exp(-Math.abs(magSafetyQ - PHI)) * 5;
            const chaosPenalty = lyapunov > 0 ? lyapunov * 10 : 0;
            const fractalPenalty = (dFactor - 1.0) * 20; 
            const survivalReward = 1.0;
            const energyPenalty = (settings.temperature * settings.confinement * 0.02);
            
            const currentReward = survivalReward + kamBonus - chaosPenalty - fractalPenalty - energyPenalty;

            setPeakFusionRate(pfr => Math.max(pfr, newFusionRate));

            return {
                ...prev,
                totalEnergyGenerated: totalEnergyGeneratedRef.current,
                particleCount: particles.length,
                fusionRate: newFusionRate,
                simulationDuration: duration,
                qFactor: instantaneousQ,
                lyapunovExponent: lyapunov,
                magneticSafetyFactorQ: magSafetyQ,
                wallIntegrity: newWallIntegrity,
                aiReward: currentReward,
                fractalDimensionD: dFactor
            };
        });
    }, 200);
    return () => clearInterval(intervalId);
  }, [settings, isSimulating, resetSimulation, toast]);

  useEffect(() => {
    const intervalId = setInterval(() => {
        if (!isSimulating) return;
        setTelemetry(current => {
            const snapshot: TelemetrySnapshot = {
                simulationDurationSeconds: parseFloat(current.simulationDuration.toFixed(1)),
                relativeTemperature: settings.temperature,
                confinement: settings.confinement,
                fusionRate: current.fusionRate,
                totalEnergyGenerated: parseFloat(current.totalEnergyGenerated.toFixed(1)),
                numParticles: current.particleCount,
                qFactor: current.qFactor,
                lyapunovExponent: current.lyapunovExponent,
                magneticSafetyFactorQ: current.magneticSafetyFactorQ,
                aiReward: current.aiReward,
                wallIntegrity: current.wallIntegrity,
                fractalDimensionD: current.fractalDimensionD
            };
            setTelemetryHistory(prev => [...prev, snapshot].slice(-30));
            return current;
        });
    }, 500);
    return () => clearInterval(intervalId);
  }, [settings, isSimulating]);

  return (
    <SidebarProvider defaultOpen>
      <div className="flex h-screen w-full flex-col bg-background">
        <header className="flex h-14 items-center gap-4 border-b px-4 sm:h-16 sm:px-6 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
          <FusionIcon className="h-7 w-7 text-primary animate-pulse" />
          <div className="flex flex-col">
            <h1 className="font-headline text-lg font-bold tracking-tight sm:text-xl text-primary leading-none">FusionFlow Reactor</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">Unidade de Controle JAX / DeepMind</p>
          </div>
          
          <div className="ml-auto flex items-center gap-3 sm:gap-6">
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/50 border border-white/5">
              <History className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Dataset:</span>
              <span className="text-[11px] font-mono font-bold text-primary">{allRuns?.length || 0}</span>
            </div>

            <Badge variant={telemetry.qFactor >= 1.0 ? "default" : "outline"} className={`h-8 gap-2 border-primary/20 transition-all ${telemetry.qFactor >= 5.0 ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_15px_-3px_rgba(245,158,11,0.4)]' : ''}`}>
              <Zap className={`h-3 w-3 ${telemetry.qFactor >= 5.0 ? "text-amber-400 animate-bounce" : telemetry.qFactor >= 1.0 ? "text-green-400" : "text-primary"}`} />
              <span className="hidden sm:inline">{telemetry.qFactor >= 5.0 ? "IGNIÇÃO PLENA (Q > 5)" : telemetry.qFactor >= 1.0 ? "BREAKEVEN (Q > 1)" : "EXPERIMENTAL"}</span>
              <span className="sm:hidden">{telemetry.qFactor >= 1.0 ? "Q > 1" : "EXP"}</span>
            </Badge>
            <SidebarTrigger />
          </div>
        </header>
        <div className="flex flex-1 overflow-hidden">
          <Sidebar>
            <SidebarHeader className="border-b p-4 bg-slate-900/20">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-primary/80">Laboratório TORAX</h2>
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
                <SidebarGroupLabel className="flex items-center gap-2">
                   <Database className="h-3 w-3" />
                   Dataset de Treinamento
                </SidebarGroupLabel>
                <SidebarGroupContent className="p-4">
                  <SimulationHistoryPanel />
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <SidebarInset className="bg-slate-950">
            <div className="relative flex h-full w-full items-center justify-center p-4">
              <div className="relative aspect-video w-full max-w-full lg:max-w-[1000px] overflow-hidden rounded-2xl border border-primary/30 bg-black shadow-[0_0_80px_-20px_rgba(59,130,246,0.6)] ring-1 ring-white/10">
                {!isSimulating && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md gap-4">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <ShieldAlert className="h-16 w-16 text-primary/40 mb-2 animate-pulse" />
                      <h2 className="text-3xl font-headline font-bold text-white uppercase tracking-tighter">Aguardando Pulso</h2>
                      <p className="text-sm text-muted-foreground max-w-md italic">Aguardando gatilho de ignição (Manual ou AUTO).</p>
                    </div>
                    <Button size="lg" onClick={handleStartIgnition} className="h-16 px-10 text-xl font-bold gap-4 shadow-[0_0_40px_-10px_rgba(59,130,246,0.8)] group hover:scale-105 transition-transform">
                      <Play className="h-7 w-7 fill-current group-hover:scale-110 transition-transform" />
                      INICIAR IGNIÇÃO
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
