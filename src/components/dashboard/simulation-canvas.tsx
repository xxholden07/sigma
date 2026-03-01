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
import type { PhysicsMode } from "@/lib/simulation-types";

interface SimulationCanvasProps {
  getParticles: () => Particle[];
  getFlashes: () => FusionFlash[];
  settings: {
    temperature: number;
    confinement: number;
    physicsMode: PhysicsMode;
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

      // --- 2.5. ORBITAL LANES (only in orbital mode) ---
      if (settings.physicsMode === 'orbital') {
        // Draw faint orbital paths like planetary orbits
        const orbitLayers = 8;
        const maxOrbitRadius = Math.min(SIMULATION_WIDTH, SIMULATION_HEIGHT) * 0.42;
        
        for (let i = 0; i < orbitLayers; i++) {
          const baseRadius = (0.15 + 0.1 * Math.pow(1.5, i)) * maxOrbitRadius;
          const opacity = 0.03 + (i % 2) * 0.02;
          
          context.strokeStyle = `rgba(100, 180, 255, ${opacity})`;
          context.lineWidth = 1 * minScale;
          context.setLineDash([4, 8]);
          context.beginPath();
          context.ellipse(
            centerX, 
            centerY, 
            baseRadius * scaleX, 
            baseRadius * scaleY * 0.85,
            0, 0, Math.PI * 2
        );
        context.stroke();
        context.setLineDash([]); // Reset dash
        }
        
        // Central "sun" glow (fusion core - orbital mode)
        const sunGradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, 30 * minScale);
        sunGradient.addColorStop(0, `rgba(255, 200, 100, ${0.3 + qFactor * 0.1})`);
        sunGradient.addColorStop(0.5, `rgba(255, 150, 50, ${0.15 + qFactor * 0.05})`);
        sunGradient.addColorStop(1, "transparent");
        context.fillStyle = sunGradient;
        context.beginPath();
        context.arc(centerX, centerY, 30 * minScale, 0, Math.PI * 2);
        context.fill();
      } else {
        // Tokamak mode - show magnetic core glow
        const coreGradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, 20 * minScale);
        coreGradient.addColorStop(0, `rgba(100, 150, 255, ${0.2 + qFactor * 0.1})`);
        coreGradient.addColorStop(0.7, `rgba(50, 100, 200, ${0.1})`);
        coreGradient.addColorStop(1, "transparent");
        context.fillStyle = coreGradient;
        context.beginPath();
        context.arc(centerX, centerY, 20 * minScale, 0, Math.PI * 2);
        context.fill();
      }

      // --- 3. PARTÍCULAS (PLASMA) - Planetary Style ---
      particles.forEach((p) => {
        let color = DEUTERIUM_COLOR;
        let glowColor = 'rgba(0, 200, 255, 0.3)';
        if (p.type === 'T') {
          color = TRITIUM_COLOR;
          glowColor = 'rgba(255, 100, 0, 0.3)';
        }
        if (p.type === 'He3') {
          color = HELIUM3_COLOR;
          glowColor = 'rgba(168, 85, 247, 0.4)';
        }
        
        const px = p.x * scaleX;
        const py = p.y * scaleY;
        const particleSize = PARTICLE_RADIUS * minScale;

        // Orbital trail (shows recent path)
        const trailLen = (settings.temperature / 100) * 8;
        const gradient = context.createLinearGradient(px, py, px - p.vx * trailLen, py - p.vy * trailLen);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, "transparent");
        
        context.strokeStyle = gradient;
        context.lineWidth = particleSize * 0.8;
        context.lineCap = "round";
        context.beginPath();
        context.moveTo(px, py);
        context.lineTo(px - p.vx * trailLen, py - p.vy * trailLen);
        context.stroke();

        // Particle glow (planetary atmosphere effect)
        const particleGlow = context.createRadialGradient(px, py, 0, px, py, particleSize * 2.5);
        particleGlow.addColorStop(0, glowColor);
        particleGlow.addColorStop(1, "transparent");
        context.fillStyle = particleGlow;
        context.beginPath();
        context.arc(px, py, particleSize * 2.5, 0, 2 * Math.PI);
        context.fill();

        // Main particle body
        context.fillStyle = color;
        context.beginPath();
        context.arc(px, py, particleSize, 0, 2 * Math.PI);
        context.fill();
        
        // Highlight (3D sphere effect)
        context.fillStyle = "rgba(255, 255, 255, 0.6)";
        context.beginPath();
        context.arc(px - particleSize * 0.3, py - particleSize * 0.3, particleSize * 0.35, 0, 2 * Math.PI);
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
