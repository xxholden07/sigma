
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
import { useFirebase, useUser, initiateAnonymousSignIn, addDocumentNonBlocking } from "@/firebase";
import { collection } from "firebase/firestore";
import { SimulationHistoryPanel } from "./simulation-history";
import { Badge } from "@/components/ui/badge";

function createInitialParticles(count: number, mode: ReactionMode): Particle[] {
  if (mode === 'DD_DHe3') {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: 200 + Math.random() * 400,
      y: 150 + Math.random() * 300,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      type: 'D',
    }));
  }

  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 200 + Math.random() * 400,
    y: 150 + Math.random() * 300,
    vx: (Math.random() - 0.5) * 6,
    vy: (Math.random() - 0.5) * 6,
    type: Math.random() > 0.5 ? 'D' : 'T',
  }));
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
    particleCount: settings.initialParticleCount,
    simulationDuration: 0,
    fusionRate: 0,
    relativeTemperature: settings.temperature,
    fusionEfficiency: 0,
    averageKineticEnergy: 0,
  });
  
  const [peakFusionRate, setPeakFusionRate] = useState(0);
  const [telemetryHistory, setTelemetryHistory] = useState<any[]>([]);

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
        initialTemperature: INITIAL_TEMPERATURE,
        initialConfinement: INITIAL_CONFINEMENT,
        finalEnergyThreshold: settings.energyThreshold,
        reactionMode: settings.reactionMode,
    };

    const runsCollectionRef = collection(firestore, 'users', user.uid, 'simulationRuns');
    addDocumentNonBlocking(runsCollectionRef, runData);
  }, [user, firestore, peakFusionRate, settings]);

  const resetSimulation = useCallback((newMode?: ReactionMode) => {
    handleSaveSimulation();

    const reactionMode = newMode || settings.reactionMode;

    const newSettings = {
      ...settings,
      temperature: INITIAL_TEMPERATURE,
      confinement: INITIAL_CONFINEMENT,
      energyThreshold: ENERGY_THRESHOLD,
      initialParticleCount: settings.initialParticleCount,
      reactionMode,
    };
    setSettings(newSettings);

    simulationStateRef.current = {
        particles: createInitialParticles(newSettings.initialParticleCount, newSettings.reactionMode),
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
      relativeTemperature: newSettings.temperature,
      fusionEfficiency: 0,
      averageKineticEnergy: 0,
    });
    
    simulationTimeStartRef.current = performance.now();
    lastFusionRateUpdateTime.current = performance.now();
  }, [handleSaveSimulation, settings]);

  const handleTemperatureChange = useCallback((newTemp: number) => {
    const oldTemp = settings.temperature;
    setSettings(s => ({...s, temperature: newTemp}));

    if (newTemp > oldTemp) {
        const diff = newTemp - oldTemp;
        simulationStateRef.current.particles.forEach(p => {
            p.vx += (Math.random() - 0.5) * 0.1 * diff;
            p.vy += (Math.random() - 0.5) * 0.1 * diff;
        });
    } else if (newTemp < oldTemp) {
        const diff = oldTemp - newTemp;
        const factor = Math.pow(0.99, diff);
        simulationStateRef.current.particles.forEach(p => {
            p.vx *= factor;
            p.vy *= factor;
        });
    }
  }, [settings.temperature]);
  
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
              
              let particlesToAdd: Particle[] = [];
              let energyReleased = 0;
              let createsFlash = false;
              let reactionType = 'none';

              if (reactionMode === 'DT' && p1.type !== p2.type && (p1.type === 'D' || p1.type === 'T')) {
                reactionType = 'DT';
              } else if (reactionMode === 'DD_DHe3') {
                if (p1.type === 'D' && p2.type === 'D') {
                  reactionType = 'DD';
                } else if ((p1.type === 'D' && p2.type === 'He3') || (p1.type === 'He3' && p2.type === 'D')) {
                  reactionType = 'DHe3';
                }
              }

              if (reactionType === 'DT') {
                energyReleased = DT_FUSION_ENERGY_MEV;
                createsFlash = true;
                particlesToAdd.push(
                  { id: simulationStateRef.current.nextParticleId++, x: 50 + Math.random() * 50, y: 50 + Math.random() * 50, type: 'D', vx: 1, vy: 1 },
                  { id: simulationStateRef.current.nextParticleId++, x: SIMULATION_WIDTH - 50, y: SIMULATION_HEIGHT - 50, type: 'T', vx: -1, vy: -1 }
                );
              } else if (reactionType === 'DD') {
                particlesToAdd.push({
                  id: simulationStateRef.current.nextParticleId++,
                  x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2,
                  vx: (p1.vx + p2.vx) / 2, vy: (p1.vy + p2.vy) / 2,
                  type: 'He3'
                });
              } else if (reactionType === 'DHe3') {
                energyReleased = DHE3_FUSION_ENERGY_MEV;
                createsFlash = true;
                particlesToAdd.push(
                  { id: simulationStateRef.current.nextParticleId++, x: 50, y: 50, type: 'D', vx: 1, vy: 1 },
                  { id: simulationStateRef.current.nextParticleId++, x: SIMULATION_WIDTH - 50, y: SIMULATION_HEIGHT - 50, type: 'D', vx: -1, vy: -1 }
                );
              }
    
              if (reactionType !== 'none') {
                hasFusedWithAnother = true;
                fusedIndices.add(j);
                newEnergy += energyReleased;
                newParticlesList.push(...particlesToAdd);
                if (createsFlash) {
                  simulationStateRef.current.fusionsInLastSecond++;
                  currentFlashes.push({ id: simulationStateRef.current.nextFlashId++, x: p1.x, y: p1.y, radius: 2, opacity: 1 });
                }
                break;
              }
            }
          }
        }
    
        if (!hasFusedWithAnother) {
          newParticlesList.push(currentParticles[i]);
        }
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

            const simulationDuration = (performance.now() - simulationTimeStartRef.current) / 1000;
            
            let totalKineticEnergy = 0;
            simulationStateRef.current.particles.forEach(p => {
              totalKineticEnergy += getKineticEnergy(p);
            });
            const averageKineticEnergy = simulationStateRef.current.particles.length > 0 
              ? totalKineticEnergy / simulationStateRef.current.particles.length 
              : 0;

            setPeakFusionRate(pfr => Math.max(pfr, newFusionRate));

            return {
                totalEnergyGenerated: totalEnergyGeneratedRef.current,
                particleCount: simulationStateRef.current.particles.length,
                fusionRate: newFusionRate,
                simulationDuration: simulationDuration,
                relativeTemperature: settings.temperature,
                fusionEfficiency: Math.min((newFusionRate / 10.0) * 100, 100),
                averageKineticEnergy: parseFloat(averageKineticEnergy.toFixed(2)),
            };
        });
    }, 200);
    return () => clearInterval(intervalId);
  }, [settings.temperature]);

  useEffect(() => {
    const intervalId = setInterval(() => {
        setTelemetry(currentTelemetry => {
            const snapshot = {
                simulationDurationSeconds: parseFloat(currentTelemetry.simulationDuration.toFixed(1)),
                relativeTemperature: settings.temperature,
                confinement: settings.confinement,
                fusionRate: currentTelemetry.fusionRate,
                totalEnergyGenerated: parseFloat(currentTelemetry.totalEnergyGenerated.toFixed(1)),
                numParticles: currentTelemetry.particleCount,
                averageKineticEnergy: currentTelemetry.averageKineticEnergy,
            };

            setTelemetryHistory(prevHistory => {
                const newHistory = [...prevHistory, snapshot];
                return newHistory.length > 20 ? newHistory.slice(-20) : newHistory;
            });
            return currentTelemetry;
        });
    }, 500);

    return () => clearInterval(intervalId);
  }, [settings.temperature, settings.confinement]);

  const getParticles = useCallback(() => simulationStateRef.current.particles, []);
  const getFlashes = useCallback(() => simulationStateRef.current.flashes, []);

  return (
    <SidebarProvider defaultOpen>
      <div className="flex h-screen w-full flex-col bg-background">
        <header className="flex h-14 items-center gap-4 border-b px-4 sm:h-16 sm:px-6">
          <FusionIcon className="h-7 w-7 text-primary" />
          <h1 className="font-headline text-xl font-bold tracking-tight sm:text-2xl">FusionFlow Reactor</h1>
          <div className="ml-auto flex items-center gap-4">
            <Badge variant={telemetry.fusionEfficiency > 50 ? "default" : "outline"} className="hidden sm:flex">
              Status: {telemetry.fusionEfficiency > 0 ? "Plasma Ativo" : "Ocioso"}
            </Badge>
            <SidebarTrigger />
          </div>
        </header>
        <div className="flex flex-1 overflow-hidden">
          <Sidebar>
            <SidebarHeader className="border-b p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Console do Operador</h2>
            </SidebarHeader>
            <SidebarContent className="p-0">
              <SidebarGroup>
                <SidebarGroupLabel>Configurações do Reator</SidebarGroupLabel>
                <SidebarGroupContent className="p-4">
                  <ControlPanel 
                    settings={settings}
                    onTemperatureChange={handleTemperatureChange}
                    onConfinementChange={handleConfinementChange}
                    onEnergyThresholdChange={handleEnergyThresholdChange}
                    onInitialParticleCountChange={handleInitialParticleCountChange}
                    onReactionModeChange={handleReactionModeChange}
                    onReset={resetSimulation}
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
                <SidebarGroupLabel>Assistência de IA</SidebarGroupLabel>
                <SidebarGroupContent className="p-4">
                  <AIAssistant
                    telemetryHistory={telemetryHistory}
                    settings={settings}
                    onTemperatureChange={handleTemperatureChange}
                    onConfinementChange={handleConfinementChange}
                  />
                </SidebarGroupContent>
              </SidebarGroup>

              <SidebarGroup>
                <SidebarGroupLabel>Registros de Missão</SidebarGroupLabel>
                <SidebarGroupContent className="p-4">
                  <SimulationHistoryPanel />
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <SidebarInset className="bg-muted/10">
            <div className="relative flex h-full w-full items-center justify-center p-4">
              <div className="relative aspect-video w-full max-w-[900px] overflow-hidden rounded-xl border-2 border-primary/20 bg-slate-950 shadow-2xl ring-1 ring-white/5">
                <SimulationCanvas 
                    getParticles={getParticles}
                    getFlashes={getFlashes}
                />
                <div className="absolute bottom-4 left-4 flex flex-col gap-1 rounded-md bg-black/60 p-2 text-[10px] text-white/70 backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-[#00c8ff]" /> Deutério (D)
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-[#ff6400]" /> Trítio (T)
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-[#a855f7]" /> Hélio-3 (He3)
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
