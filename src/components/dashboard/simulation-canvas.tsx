
"use client";

import { useRef, useLayoutEffect } from "react";
import type { Particle, FusionFlash } from "@/lib/simulation-types";
import {
  PARTICLE_RADIUS,
  DEUTERIUM_COLOR,
  TRITIUM_COLOR,
  HELIUM3_COLOR,
  CONFINEMENT_ZONE_COLOR,
  SIMULATION_WIDTH,
  SIMULATION_HEIGHT,
} from "@/lib/simulation-constants";

interface SimulationCanvasProps {
  getParticles: () => Particle[];
  getFlashes: () => FusionFlash[];
}

export function SimulationCanvas({ getParticles, getFlashes }: SimulationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameIdRef = useRef<number>();

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let frameId: number;
    const render = () => {
      frameId = requestAnimationFrame(render);
      
      const particles = getParticles();
      const flashes = getFlashes();

      if (!particles || !flashes) {
        return;
      }

      const { width, height } = canvas.getBoundingClientRect();
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      
      const scaleX = width / SIMULATION_WIDTH;
      const scaleY = height / SIMULATION_HEIGHT;

      // Clear canvas
      context.fillStyle = "hsl(var(--background))";
      context.fillRect(0, 0, width, height);

      // Draw confinement zone
      context.strokeStyle = CONFINEMENT_ZONE_COLOR;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(width / 2, height / 2, 200 * Math.min(scaleX, scaleY), 0, 2 * Math.PI);
      context.stroke();

      // Draw particles
      particles.forEach((p) => {
        context.fillStyle = p.type === 'D' 
            ? DEUTERIUM_COLOR 
            : p.type === 'T' 
            ? TRITIUM_COLOR
            : HELIUM3_COLOR;
        context.beginPath();
        context.arc(p.x * scaleX, p.y * scaleY, PARTICLE_RADIUS, 0, 2 * Math.PI);
        context.fill();
      });

      // Draw flashes
      flashes.forEach((f) => {
        context.fillStyle = `rgba(255, 255, 255, ${f.opacity})`;
        context.beginPath();
        context.arc(f.x * scaleX, f.y * scaleY, f.radius, 0, 2 * Math.PI);
        context.fill();
      });
    };

    render();

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [getParticles, getFlashes]);

  return (
    <div className="absolute inset-0 h-full w-full">
      <canvas ref={canvasRef} style={{ backgroundColor: "hsl(var(--background))" }} />
    </div>
  );
}
