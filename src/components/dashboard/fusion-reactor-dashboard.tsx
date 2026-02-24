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
} from "@/lib/simulation-constants";
import { SimulationCanvas } from "./simulation-canvas";
import { ControlPanel } from "./control-panel";
import { TelemetryPanel } from "./telemetry-panel";
import { AIAssistant } from "./ai-assistant";
import { FusionIcon } from "../icons/fusion-icon";

const SIM_WIDTH = 800;
const SIM_HEIGHT = 600;

function createInitialParticles(): Particle[] {
  return Array.from({ length: INITIAL_PARTICLE_COUNT }, (_, i) => ({
    id: i,
    x: 200 + Math.random() * 400,
    y: 150 + Math.random() * 450,
    vx: (Math.random() - 0.5) * 6,
    vy: (Math.random() - 0.5) * 6,
    type: Math.random() > 0.5 ? 'D' : 'T',
  }));
}

export function FusionReactorDashboard() {
  const [settings, setSettings] = useState({ temperature: INITIAL_TEMPERATURE, confinement: INITIAL_CONFINEMENT });
  const [telemetry, setTelemetry] = useState({
    totalEnergyGenerated: 0,
    particleCount: INITIAL_PARTICLE_COUNT,
    simulationDuration: 0,
    fusionRate: 0,
    relativeTemperature: INITIAL_TEMPERATURE,
  });

  const particlesRef = useRef<Particle[]>(createInitialParticles());
  const flashesRef = useRef<FusionFlash[]>([]);
  const nextParticleId = useRef(INITIAL_PARTICLE_COUNT);
  const nextFlashId = useRef(0);
  
  const simulationTimeStartRef = useRef(performance.now());
  const fusionsInLastSecond = useRef(0);
  const lastFusionRateUpdateTime = useRef(performance.now());

  const [renderState, setRenderState] = useState({ particles: particlesRef.current, flashes: flashesRef.current });

  const resetSimulation = useCallback(() => {
    particlesRef.current = createInitialParticles();
    flashesRef.current = [];
    nextParticleId.current = INITIAL_PARTICLE_COUNT;
    setSettings({ temperature: INITIAL_TEMPERATURE, confinement: INITIAL_CONFINEMENT });
    setTelemetry({
      totalEnergyGenerated: 0,
      particleCount: INITIAL_PARTICLE_COUNT,
      simulationDuration: 0,
      fusionRate: 0,
      relativeTemperature: INITIAL_TEMPERATURE,
    });
    simulationTimeStartRef.current = performance.now();
    lastFusionRateUpdateTime.current = performance.now();
    fusionsInLastSecond.current = 0;
  }, []);

  const handleTemperatureChange = useCallback((newTemp: number) => {
    const oldTemp = settings.temperature;
    setSettings(s => ({...s, temperature: newTemp}));

    if (newTemp > oldTemp) {
        const diff = newTemp - oldTemp;
        particlesRef.current.forEach(p => {
            p.vx += (Math.random() - 0.5) * 0.5 * diff;
            p.vy += (Math.random() - 0.5) * 0.5 * diff;
        });
    } else if (newTemp < oldTemp) {
        const diff = oldTemp - newTemp;
        const factor = Math.pow(0.98, diff);
        particlesRef.current.forEach(p => {
            p.vx *= factor;
            p.vy *= factor;
        });
    }
  }, [settings.temperature]);
  
  const handleConfinementChange = useCallback((value: number) => {
    setSettings(s => ({...s, confinement: value}));
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    
    const gameLoop = (time: number) => {
      const currentParticles = particlesRef.current;
      const currentFlashes = flashesRef.current;
      const confinement = settings.confinement;

      // Update particle positions
      for (const p of currentParticles) {
        const dx = (SIM_WIDTH / 2) - p.x;
        const dy = (SIM_HEIGHT / 2) - p.y;
        const distance = Math.hypot(dx, dy);
        
        if (distance > 1) {
            p.vx += (dx / distance) * confinement;
            p.vy += (dy / distance) * confinement;
        }

        p.x += p.vx;
        p.y += p.vy;

        if (p.x <= PARTICLE_RADIUS || p.x >= SIM_WIDTH - PARTICLE_RADIUS) p.vx *= -1;
        if (p.y <= PARTICLE_RADIUS || p.y >= SIM_HEIGHT - PARTICLE_RADIUS) p.vy *= -1;
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
                if (collisionEnergy > ENERGY_THRESHOLD) {
                    fused = true;
                    fusedIndices.add(i);
                    fusedIndices.add(j);
                    newEnergy += DT_FUSION_ENERGY_MEV;
                    fusionsInLastSecond.current++;

                    currentFlashes.push({ id: nextFlashId.current++, x: p1.x, y: p1.y, radius: 0, opacity: 1 });

                    const newP1: Particle = { id: nextParticleId.current++, x: 10, y: 10, type: 'D', vx: 1, vy: 1 };
                    const newP2: Particle = { id: nextParticleId.current++, x: SIM_WIDTH - 10, y: SIM_HEIGHT - 10, type: 'T', vx: -1, vy: -1 };
                    newParticles.push(newP1, newP2);
                    break;
                }
            }
        }
        if (!fused) {
            newParticles.push(currentParticles[i]);
        }
      }
      
      particlesRef.current = newParticles;

      // Update flashes
      flashesRef.current = currentFlashes.filter(f => {
        f.radius += 2;
        f.opacity -= 0.025;
        return f.opacity > 0;
      });
      
      // Update Telemetry
      const currentTime = performance.now();
      const simulationDuration = (currentTime - simulationTimeStartRef.current) / 1000;
      let fusionRate = telemetry.fusionRate;

      if (currentTime - lastFusionRateUpdateTime.current >= 1000) {
        fusionRate = fusionsInLastSecond.current;
        fusionsInLastSecond.current = 0;
        lastFusionRateUpdateTime.current = currentTime;
      }
      
      setTelemetry(t => ({
          ...t,
          totalEnergyGenerated: t.totalEnergyGenerated + newEnergy,
          particleCount: particlesRef.current.length,
          simulationDuration: simulationDuration,
          fusionRate: fusionRate,
          relativeTemperature: settings.temperature
      }));

      setRenderState({ particles: [...particlesRef.current], flashes: [...flashesRef.current] });
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [settings.confinement, telemetry.fusionRate]);

  const telemetryForAI = {
      relativeTemperature: settings.temperature,
      totalEnergyGenerated: telemetry.totalEnergyGenerated,
      particleCount: telemetry.particleCount,
      simulationDuration: telemetry.simulationDuration,
  };

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
                onReset={resetSimulation}
              />
              <TelemetryPanel telemetry={telemetry} />
              <AIAssistant telemetry={telemetryForAI} />
            </SidebarContent>
          </Sidebar>
          <SidebarInset>
            <div className="relative h-full w-full p-4">
              <div className="relative mx-auto aspect-video max-h-full w-full max-w-[800px] overflow-hidden rounded-lg border shadow-lg">
                <SimulationCanvas 
                    particles={renderState.particles} 
                    flashes={renderState.flashes} 
                />
              </div>
            </div>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
