
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Sidebar, SidebarContent, SidebarHeader, SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import type { Particle, FusionFlash } from "@/lib/simulation-types";
import {
  INITIAL_PARTICLE_COUNT,
  INITIAL_TEMPERATURE,
  INITIAL_CONFINEMENT,
  ENERGY_THRESHOLD,
  DT_FUSION_ENERGY_MEV,
  PARTICLE_RADIUS,
  SIMULATION_WIDTH,
  SIMULATION_HEIGHT,
} from "@/lib/simulation-constants";
import { SimulationCanvas } from "./simulation-canvas";
import { ControlPanel } from "./control-panel";
import { TelemetryPanel } from "./telemetry-panel";
import { AIAssistant } from "./ai-assistant";
import { FusionIcon } from "../icons/fusion-icon";

function createInitialParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 200 + Math.random() * 400,
    y: 150 + Math.random() * 450,
    vx: (Math.random() - 0.5) * 6,
    vy: (Math.random() - 0.5) * 6,
    type: Math.random() > 0.5 ? 'D' : 'T',
  }));
}

// Função auxiliar para calcular a energia cinética de uma partícula
function getKineticEnergy(particle: Particle): number {
  return 0.5 * (particle.vx * particle.vx + particle.vy * particle.vy); // Assumindo massa unitária para simplificar
}

export function FusionReactorDashboard() {
  const [settings, setSettings] = useState({
    temperature: INITIAL_TEMPERATURE,
    confinement: INITIAL_CONFINEMENT,
    energyThreshold: ENERGY_THRESHOLD,
    initialParticleCount: INITIAL_PARTICLE_COUNT,
  });
  const [telemetry, setTelemetry] = useState({
    totalEnergyGenerated: 0,
    particleCount: settings.initialParticleCount,
    simulationDuration: 0,
    fusionRate: 0,
    relativeTemperature: settings.temperature,
    fusionEfficiency: 0,
    averageKineticEnergy: 0, // Adicionado ao estado inicial da telemetria
  });
  const [telemetryHistory, setTelemetryHistory] = useState<any[]>([]);

  const simulationStateRef = useRef({
    particles: createInitialParticles(settings.initialParticleCount),
    flashes: [] as FusionFlash[],
    nextParticleId: settings.initialParticleCount,
    nextFlashId: 0,
    fusionsInLastSecond: 0,
  });
  
  const totalEnergyGeneratedRef = useRef(0);
  const simulationTimeStartRef = useRef(performance.now());
  const lastFusionRateUpdateTime = useRef(performance.now());

  const resetSimulation = useCallback(() => {
    const newSettings = {
      temperature: INITIAL_TEMPERATURE,
      confinement: INITIAL_CONFINEMENT,
      energyThreshold: ENERGY_THRESHOLD,
      initialParticleCount: INITIAL_PARTICLE_COUNT,
    };
    setSettings(newSettings);

    simulationStateRef.current = {
        particles: createInitialParticles(newSettings.initialParticleCount),
        flashes: [],
        nextParticleId: newSettings.initialParticleCount,
        nextFlashId: 0,
        fusionsInLastSecond: 0,
    };
    totalEnergyGeneratedRef.current = 0;
    
    setTelemetryHistory([]);

    const initialTelemetry = {
      totalEnergyGenerated: 0,
      particleCount: newSettings.initialParticleCount,
      simulationDuration: 0,
      fusionRate: 0,
      relativeTemperature: newSettings.temperature,
      fusionEfficiency: 0,
      averageKineticEnergy: 0,
    };
    setTelemetry(initialTelemetry);
    
    simulationTimeStartRef.current = performance.now();
    lastFusionRateUpdateTime.current = performance.now();
  }, []);

  const handleTemperatureChange = useCallback((newTemp: number) => {
    const oldTemp = settings.temperature;
    setSettings(s => ({...s, temperature: newTemp}));

    if (newTemp > oldTemp) {
        const diff = newTemp - oldTemp;
        simulationStateRef.current.particles.forEach(p => {
            p.vx += (Math.random() - 0.5) * 0.5 * diff;
            p.vy += (Math.random() - 0.5) * 0.5 * diff;
        });
    } else if (newTemp < oldTemp) {
        const diff = oldTemp - newTemp;
        const factor = Math.pow(0.98, diff);
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
    // Note: This won't reset the simulation with the new particle count until reset is clicked.
    // This is intentional to avoid jarring simulation resets while dragging a slider.
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    
    const gameLoop = () => {
      const { particles: currentParticles, flashes: currentFlashes } = simulationStateRef.current;
      const { confinement, energyThreshold } = settings;

      for (const p of currentParticles) {
        const dx = (SIMULATION_WIDTH / 2) - p.x;
        const dy = (SIMULATION_HEIGHT / 2) - p.y;
        const distance = Math.hypot(dx, dy);
        
        if (distance > 1) {
            p.vx += (dx / distance) * confinement;
            p.vy += (dy / distance) * confinement;
        }

        p.x += p.vx;
        p.y += p.vy;

        if (p.x <= PARTICLE_RADIUS || p.x >= SIMULATION_WIDTH - PARTICLE_RADIUS) p.vx *= -1;
        if (p.y <= PARTICLE_RADIUS || p.y >= SIMULATION_HEIGHT - PARTICLE_RADIUS) p.vy *= -1;
      }
      
      const newParticles: Particle[] = [];
      const fusedIndices = new Set<number>();
      let newEnergy = 0;

      for(let i = 0; i < currentParticles.length; i++) {
        if (fusedIndices.has(i)) continue;

        let fused = false;
        for (let j = i + 1; j < currentParticles.length; j++) {
            if (fusedIndices.has(j)) continue;

            const p1 = currentParticles[i];
            const p2 = currentParticles[j];

            const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);

            if (dist < PARTICLE_RADIUS * 2 && p1.type !== p2.type) {
                const collisionEnergy = Math.hypot(p1.vx - p2.vx, p1.vy - p2.vy);
                if (collisionEnergy > energyThreshold) {
                    fused = true;
                    fusedIndices.add(i);
                    fusedIndices.add(j);
                    newEnergy += DT_FUSION_ENERGY_MEV;
                    simulationStateRef.current.fusionsInLastSecond++;

                    currentFlashes.push({ id: simulationStateRef.current.nextFlashId++, x: p1.x, y: p1.y, radius: 0, opacity: 1 });

                    const newP1: Particle = { id: simulationStateRef.current.nextParticleId++, x: 10, y: 10, type: 'D', vx: 1, vy: 1 };
                    const newP2: Particle = { id: simulationStateRef.current.nextParticleId++, x: SIMULATION_WIDTH - 10, y: SIMULATION_HEIGHT - 10, type: 'T', vx: -1, vy: -1 };
                    newParticles.push(newP1, newP2);
                    break;
                }
            }
        }
        if (!fused) {
            newParticles.push(currentParticles[i]);
        }
      }
      
      simulationStateRef.current.particles = newParticles;
      simulationStateRef.current.flashes = currentFlashes.filter(f => {
        f.radius += 2;
        f.opacity -= 0.025;
        return f.opacity > 0;
      });
      
      totalEnergyGeneratedRef.current += newEnergy;
      
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [settings.confinement, settings.energyThreshold]);
  
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
            
            // Calcular a energia cinética média
            let totalKineticEnergy = 0;
            simulationStateRef.current.particles.forEach(p => {
              totalKineticEnergy += getKineticEnergy(p);
            });
            const averageKineticEnergy = simulationStateRef.current.particles.length > 0 
              ? totalKineticEnergy / simulationStateRef.current.particles.length 
              : 0;

            return {
                totalEnergyGenerated: totalEnergyGeneratedRef.current,
                particleCount: simulationStateRef.current.particles.length,
                fusionRate: newFusionRate,
                simulationDuration: simulationDuration,
                relativeTemperature: settings.temperature,
                fusionEfficiency: Math.min((newFusionRate / 15.0) * 100, 100),
                averageKineticEnergy: parseFloat(averageKineticEnergy.toFixed(2)), // Adicionado
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
                averageKineticEnergy: currentTelemetry.averageKineticEnergy, // Adicionado
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
          <div className="ml-auto flex items-center gap-2">
            <SidebarTrigger />
          </div>
        </header>
        <div className="flex flex-1 overflow-hidden">
          <Sidebar>
            <SidebarContent className="p-2 md:p-4 space-y-4">
              <ControlPanel 
                settings={settings}
                onTemperatureChange={handleTemperatureChange}
                onConfinementChange={handleConfinementChange}
                onEnergyThresholdChange={handleEnergyThresholdChange}
                onInitialParticleCountChange={handleInitialParticleCountChange}
                onReset={resetSimulation}
              />
              <TelemetryPanel telemetry={telemetry} telemetryHistory={telemetryHistory} />
              <AIAssistant
                telemetryHistory={telemetryHistory}
                settings={settings}
                onTemperatureChange={handleTemperatureChange}
                onConfinementChange={handleConfinementChange}
              />
            </SidebarContent>
          </Sidebar>
          <SidebarInset>
            <div className="relative h-full w-full p-4">
              <div className="relative mx-auto aspect-video max-h-full w-full max-w-[800px] overflow-hidden rounded-lg border shadow-lg bg-background">
                <SimulationCanvas 
                    getParticles={getParticles}
                    getFlashes={getFlashes}
                />
              </div>
            </div>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}

    