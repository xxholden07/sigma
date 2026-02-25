
"use client";

import { useRef, useEffect } from "react";
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    let animationFrameId: number;

    const render = () => {
      const particles = getParticles();
      const flashes = getFlashes();

      // Sync canvas dimensions
      const { width, height } = canvas.parentElement?.getBoundingClientRect() || { width: 0, height: 0 };
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      
      const scaleX = width / SIMULATION_WIDTH;
      const scaleY = height / SIMULATION_HEIGHT;
      const minScale = Math.min(scaleX, scaleY);

      // Clear with dark blue-black
      context.fillStyle = "#020617"; 
      context.fillRect(0, 0, width, height);

      // Draw confinement zone (magnetic field)
      context.strokeStyle = CONFINEMENT_ZONE_COLOR;
      context.lineWidth = 2 * minScale;
      context.beginPath();
      context.arc(width / 2, height / 2, 200 * minScale, 0, 2 * Math.PI);
      context.stroke();
      
      // Draw grid lines for depth
      context.strokeStyle = "rgba(49, 79, 128, 0.1)";
      context.lineWidth = 1;
      for (let i = 0; i <= 10; i++) {
        const x = (i / 10) * width;
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
        
        const y = (i / 10) * height;
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }

      // Draw particles
      particles.forEach((p) => {
        let color = DEUTERIUM_COLOR;
        if (p.type === 'T') color = TRITIUM_COLOR;
        if (p.type === 'He3') color = HELIUM3_COLOR;
        
        context.fillStyle = color;
        context.beginPath();
        context.arc(p.x * scaleX, p.y * scaleY, PARTICLE_RADIUS * minScale, 0, 2 * Math.PI);
        context.fill();
        
        // Add a small glow to particles
        context.shadowBlur = 5 * minScale;
        context.shadowColor = color;
      });
      context.shadowBlur = 0;

      // Draw fusion flashes
      flashes.forEach((f) => {
        context.fillStyle = `rgba(255, 255, 255, ${f.opacity})`;
        context.beginPath();
        context.arc(f.x * scaleX, f.y * scaleY, f.radius * minScale, 0, 2 * Math.PI);
        context.fill();
        
        // Flash glow
        context.shadowBlur = 15 * minScale;
        context.shadowColor = "white";
        context.beginPath();
        context.arc(f.x * scaleX, f.y * scaleY, f.radius * 0.5 * minScale, 0, 2 * Math.PI);
        context.fill();
      });
      context.shadowBlur = 0;

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [getParticles, getFlashes]);

  return (
    <canvas 
      ref={canvasRef} 
      className="h-full w-full cursor-crosshair"
      style={{ display: 'block' }}
    />
  );
}
