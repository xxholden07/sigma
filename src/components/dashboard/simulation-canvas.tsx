"use client";

import { useRef, useEffect } from "react";
import type { Particle, FusionFlash } from "@/lib/simulation-types";
import {
  PARTICLE_RADIUS,
  DEUTERIUM_COLOR,
  TRITIUM_COLOR,
  HELIUM3_COLOR,
  SIMULATION_WIDTH,
  SIMULATION_HEIGHT,
  PHI,
  R_MAJOR,
  R_MINOR,
} from "@/lib/simulation-constants";

interface SimulationCanvasProps {
  getParticles: () => Particle[];
  getFlashes: () => FusionFlash[];
  settings: {
    temperature: number;
    confinement: number;
  };
  qFactor: number;
  magneticSafetyFactorQ: number;
  fractalDimensionD: number;
}

export function SimulationCanvas({ 
  getParticles, 
  getFlashes, 
  settings, 
  qFactor, 
  magneticSafetyFactorQ,
  fractalDimensionD
}: SimulationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    let animationFrameId: number;
    let frameCount = 0;

    const render = () => {
      frameCount++;
      const particles = getParticles();
      const flashes = getFlashes();

      const { width, height } = canvas.parentElement?.getBoundingClientRect() || { width: 0, height: 0 };
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      
      const scaleX = width / SIMULATION_WIDTH;
      const scaleY = height / SIMULATION_HEIGHT;
      const minScale = Math.min(scaleX, scaleY);
      const centerX = width / 2;
      const centerY = height / 2;

      context.fillStyle = "#010409"; 
      context.fillRect(0, 0, width, height);

      // --- 1. RENDERIZAÇÃO DA TEIA MAGNÉTICA (GEOMETRIA KAM + FRACTAL NOISE) ---
      const numPoints = 150; 
      const numStrands = 8;  
      const rotationSpeed = frameCount * 0.01;
      
      context.lineWidth = 1 * minScale;
      context.lineCap = "round";

      for (let s = 0; s < numStrands; s++) {
        const strandOffset = (s / numStrands) * Math.PI * 2;
        context.beginPath();
        
        const qDiff = Math.abs(magneticSafetyFactorQ - PHI);
        const baseOpacity = Math.max(0.1, (1 - qDiff) * settings.confinement * 0.8);
        
        // Efeito visual de "franjamento" fractal na teia
        const fractalNoise = (fractalDimensionD - 1.0) * 15;
        context.strokeStyle = `rgba(255, 215, 0, ${baseOpacity})`;
        
        for (let i = 0; i < numPoints; i++) {
          const v = (i / numPoints) * Math.PI * 10; 
          const u = magneticSafetyFactorQ * v + strandOffset + rotationSpeed;
          
          // Adicionando instabilidade visual baseada na dimensão fractal
          const noise = fractalNoise > 0 ? (Math.random() - 0.5) * fractalNoise : 0;
          const r_eff = (R_MINOR + noise * 0.01) * (0.8 + Math.sin(frameCount * 0.02) * 0.05);
          
          const x3d = (R_MAJOR + r_eff * Math.cos(v)) * Math.cos(u);
          const y3d = (R_MAJOR + r_eff * Math.cos(v)) * Math.sin(u);
          const z3d = r_eff * Math.sin(v);

          const canvasX = centerX + (x3d * 50 * minScale);
          const canvasY = centerY + (y3d * 30 * minScale) - (z3d * 20 * minScale);

          if (i === 0) context.moveTo(canvasX, canvasY);
          else context.lineTo(canvasX, canvasY);
        }
        context.stroke();
      }

      // --- 2. PAREDE DO REATOR ---
      context.strokeStyle = "rgba(59, 130, 246, 0.15)";
      context.lineWidth = 2 * minScale;
      context.beginPath();
      context.ellipse(centerX, centerY, R_MAJOR * 65 * minScale, R_MAJOR * 45 * minScale, 0, 0, Math.PI * 2);
      context.stroke();

      // --- 3. PARTÍCULAS (PLASMA) ---
      particles.forEach((p) => {
        let color = DEUTERIUM_COLOR;
        if (p.type === 'T') color = TRITIUM_COLOR;
        if (p.type === 'He3') color = HELIUM3_COLOR;
        
        const px = p.x * scaleX;
        const py = p.y * scaleY;

        const trailLen = (settings.temperature / 100) * 5;
        const gradient = context.createLinearGradient(px, py, px - p.vx * trailLen, py - p.vy * trailLen);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, "transparent");
        
        context.strokeStyle = gradient;
        context.lineWidth = PARTICLE_RADIUS * minScale;
        context.beginPath();
        context.moveTo(px, py);
        context.lineTo(px - p.vx * trailLen, py - p.vy * trailLen);
        context.stroke();

        context.fillStyle = "white";
        context.beginPath();
        context.arc(px, py, (PARTICLE_RADIUS * 0.6) * minScale, 0, 2 * Math.PI);
        context.fill();
        
        context.fillStyle = color;
        context.beginPath();
        context.arc(px, py, PARTICLE_RADIUS * minScale, 0, 2 * Math.PI);
        context.fill();
      });

      // --- 4. CLARÕES DE FUSÃO ---
      flashes.forEach((f) => {
        const fx = f.x * scaleX;
        const fy = f.y * scaleY;

        const flashGradient = context.createRadialGradient(fx, fy, 0, fx, fy, f.radius * 5 * minScale);
        flashGradient.addColorStop(0, `rgba(255, 255, 255, ${f.opacity * 0.6})`);
        flashGradient.addColorStop(1, "transparent");
        context.fillStyle = flashGradient;
        context.fillRect(0, 0, width, height);

        context.fillStyle = `rgba(255, 255, 255, ${f.opacity})`;
        context.beginPath();
        context.arc(fx, fy, f.radius * minScale, 0, 2 * Math.PI);
        context.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [getParticles, getFlashes, settings, qFactor, magneticSafetyFactorQ, fractalDimensionD]);

  return (
    <canvas 
      ref={canvasRef} 
      className="h-full w-full cursor-crosshair"
      style={{ display: 'block' }}
    />
  );
}
