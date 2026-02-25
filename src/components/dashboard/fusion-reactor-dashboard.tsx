"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Sidebar, SidebarContent, SidebarHeader, SidebarInset, SidebarProvider, SidebarTrigger, SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from "@/components/ui/sidebar";
import type { Particle, FusionFlash, SimulationRun, ReactionMode } from "@/lib/simulation-types";
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
import { Target, Microscope, ShieldCheck } from "lucide-react";

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

function getKineticEnergy(particle: Particle): number {
  return 0.5 * (particle.vx * particle.vx + particle.vy * particle.vy);
}

export function FusionReactorDashboard() {
  const { firestore, auth } = useFirebase();
  const { user, isUserLoading } = useUser();

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
    simulationDuration: 0,
    fusionRate: 0,
    relativeTemperature: INITIAL_TEMPERATURE,
    fusionEfficiency: 0,
    averageKineticEnergy: 0,
    qFactor: 0, // Fator Q: Energia Out / Energia In
  });
  
  const [peakFusionRate, setPeakFusionRate] = useState(0);
  const [telemetryHistory, setTelemetryHistory] = useState<any[]>([]);

  const runsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users', user.uid, 'simulationRuns'), orderBy('createdAt', 'desc'));
  }, [firestore, user]);
  const { data: runs } = useCollection<SimulationRun>(runsQuery);

  const simulationStateRef = useRef({
    particles: createInitialParticles(settings.initialParticleCount, settings.reactionMode),
    flashes: [] as FusionFlash[],
    nextParticleId: settings.initialParticleCount,
    nextFlashId: 0,
    fusionsInLastSecond: 0,
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
    };

    const runsCollectionRef = collection(firestore, 'users', user.uid, 'simulationRuns');
    addDocumentNonBlocking(runsCollectionRef, runData);
  }, [user, firestore, peakFusionRate, settings]);

  const resetSimulation = useCallback((newMode?: ReactionMode) => {
    handleSaveSimulation();

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
    };
    totalEnergyGeneratedRef.current = 0;
    
    setTelemetryHistory([]);
    setPeakFusionRate(0);

    setTelemetry({
      totalEnergyGenerated: 0,
      particleCount: newSettings.initialParticleCount,
      simulationDuration: 0,
      fusionRate: 0,
      relativeTemperature: INITIAL_TEMPERATURE,
      fusionEfficiency: 0,
      averageKineticEnergy: 0,
      qFactor: 0,
    });
    
    simulationTimeStartRef.current = performance.now();
    lastFusionRateUpdateTime.current = performance.now();
  }, [handleSaveSimulation, settings]);

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
      const { particles: currentParticles, flashes: currentFlashes } = simulationStateRef.current;
      const { confinement, energyThreshold, reactionMode } = settings;

      for (const p of currentParticles) {
        const dx = (SIMULATION_WIDTH / 2) - p.x;
        const dy = (SIMULATION_HEIGHT / 2) - p.y;
        const distance = Math.hypot(dx, dy);
        
        if (distance > 1) {
            p.vx += (dx / distance) * (confinement * 0.5);
            p.vy += (dy / distance) * (confinement * 0.5);
        }

        p.x += p.vx;
        p.y += p.vy;

        if (p.x <= PARTICLE_RADIUS || p.x >= SIMULATION_WIDTH - PARTICLE_RADIUS) p.vx *= -1;
        if (p.y <= PARTICLE_RADIUS || p.y >= SIMULATION_HEIGHT - PARTICLE_RADIUS) p.vy *= -1;
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
              
              let energyReleased = 0;
              let reactionType: 'none' | 'DT' | 'DD' | 'DHe3' = 'none';

              if (reactionMode === 'DT' && p1.type !== p2.type) {
                reactionType = 'DT';
                energyReleased = DT_FUSION_ENERGY_MEV;
              } else if (reactionMode === 'DD_DHe3') {
                if (p1.type === 'D' && p2.type === 'D') reactionType = 'DD';
                else if (p1.type === 'He3' || p2.type === 'He3') {
                  if (p1.type !== p2.type) {
                    reactionType = 'DHe3';
                    energyReleased = DHE3_FUSION_ENERGY_MEV;
                  }
                }
              }

              if (reactionType !== 'none') {
                hasFusedWithAnother = true;
                fusedIndices.add(j);
                newEnergy += energyReleased;
                
                if (reactionType === 'DD') {
                  newParticlesList.push({ id: simulationStateRef.current.nextParticleId++, x: p1.x, y: p1.y, vx: p1.vx * 0.5, vy: p1.vy * 0.5, type: 'He3' });
                } else if (energyReleased > 0) {
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
  }, [settings]);
  
  useEffect(() => {
    const intervalId = setInterval(() => {
        const currentTime = performance.now();
        setTelemetry(prev => {
            let newFusionRate = prev.fusionRate;
            if (currentTime - lastFusionRateUpdateTime.current >= 1000) {
                newFusionRate = simulationStateRef.current.fusionsInLastSecond;
                simulationStateRef.current.fusionsInLastSecond = 0;
                lastFusionRateUpdateTime.current = currentTime;
            }

            const duration = (performance.now() - simulationTimeStartRef.current) / 1000;
            const energyIn = settings.temperature * settings.confinement * settings.initialParticleCount * 0.1;
            const qFactor = energyIn > 0 ? totalEnergyGeneratedRef.current / energyIn : 0;

            setPeakFusionRate(pfr => Math.max(pfr, newFusionRate));

            return {
                totalEnergyGenerated: totalEnergyGeneratedRef.current,
                particleCount: simulationStateRef.current.particles.length,
                fusionRate: newFusionRate,
                simulationDuration: duration,
                relativeTemperature: settings.temperature,
                fusionEfficiency: Math.min((qFactor / 1.5) * 100, 100),
                averageKineticEnergy: 0,
                qFactor: parseFloat(qFactor.toFixed(2)),
            };
        });
    }, 200);
    return () => clearInterval(intervalId);
  }, [settings]);

  useEffect(() => {
    const intervalId = setInterval(() => {
        setTelemetry(current => {
            const snapshot = {
                simulationDurationSeconds: parseFloat(current.simulationDuration.toFixed(1)),
                relativeTemperature: settings.temperature,
                confinement: settings.confinement,
                fusionRate: current.fusionRate,
                totalEnergyGenerated: parseFloat(current.totalEnergyGenerated.toFixed(1)),
                numParticles: current.particleCount,
                qFactor: current.qFactor,
            };

            setTelemetryHistory(prev => [...prev, snapshot].slice(-20));
            return current;
        });
    }, 500);
    return () => clearInterval(intervalId);
  }, [settings.temperature, settings.confinement]);

  return (
    <SidebarProvider defaultOpen>
      <div className="flex h-screen w-full flex-col bg-background">
        <header className="flex h-14 items-center gap-4 border-b px-4 sm:h-16 sm:px-6 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
          <FusionIcon className="h-7 w-7 text-primary animate-pulse" />
          <div className="flex flex-col">
            <h1 className="font-headline text-lg font-bold tracking-tight sm:text-xl text-primary leading-none">FusionFlow Reactor</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">Consoles de Teste Escalar</p>
          </div>
          
          <div className="ml-auto flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end gap-0.5 px-3 py-1 rounded-md border bg-slate-900/50">
              <span className="text-[8px] uppercase text-muted-foreground font-bold">Base de Dados de Pulso</span>
              <div className="flex items-center gap-1">
                <Microscope className="h-3 w-3 text-primary" />
                <span className="text-xs font-mono font-bold text-primary">{runs?.length || 0}</span>
              </div>
            </div>

            <Badge variant={telemetry.qFactor >= 1 ? "default" : "outline"} className="hidden sm:flex h-8 gap-2 border-primary/20">
              <Target className={`h-3 w-3 ${telemetry.qFactor >= 1 ? "text-green-400" : "text-primary"}`} />
              STATUS: {telemetry.qFactor >= 1 ? "IGNIÇÃO (Q > 1)" : "FASE EXPERIMENTAL"}
            </Badge>
            <SidebarTrigger />
          </div>
        </header>
        <div className="flex flex-1 overflow-hidden">
          <Sidebar>
            <SidebarHeader className="border-b p-4 bg-slate-900/20">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-primary/80">Laboratório de Fusão</h2>
            </SidebarHeader>
            <SidebarContent className="p-0">
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
                  />
                </SidebarGroupContent>
              </SidebarGroup>
              
              <SidebarGroup>
                <SidebarGroupLabel>Assistente Científico (IA)</SidebarGroupLabel>
                <SidebarGroupContent className="p-4">
                  <AIAssistant
                    telemetryHistory={telemetryHistory}
                    settings={settings}
                    onTemperatureChange={handleTemperatureChange}
                    onConfinementChange={handleConfinementChange}
                    onReactionModeChange={handleReactionModeChange}
                    onReset={() => resetSimulation()}
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
                <SidebarGroupLabel>Arquivo de Experimentos</SidebarGroupLabel>
                <SidebarGroupContent className="p-4">
                  <SimulationHistoryPanel />
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <SidebarInset className="bg-slate-950">
            <div className="relative flex h-full w-full items-center justify-center p-4">
              <div className="relative aspect-video w-full max-w-[1000px] overflow-hidden rounded-2xl border border-primary/30 bg-black shadow-[0_0_50px_-12px_rgba(59,130,246,0.5)] ring-1 ring-white/5">
                <SimulationCanvas 
                    getParticles={() => simulationStateRef.current.particles}
                    getFlashes={() => simulationStateRef.current.flashes}
                />
                <div className="absolute top-6 right-6 flex flex-col items-end gap-2 pointer-events-none">
                  <div className="bg-black/60 backdrop-blur-md border border-primary/20 p-2 rounded-lg">
                    <span className="text-[10px] text-primary font-mono block mb-1">GANHO DE ENERGIA (Q)</span>
                    <div className="text-xl font-mono font-bold text-white">{telemetry.qFactor}</div>
                  </div>
                </div>
              </div>
            </div>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
