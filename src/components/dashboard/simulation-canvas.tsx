
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
  settings: {
    temperature: number;
    confinement: number;
  };
  qFactor: number;
}

export function SimulationCanvas({ getParticles, getFlashes, settings, qFactor }: SimulationCanvasProps) {
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

      // Sync canvas dimensions
      const { width, height } = canvas.parentElement?.getBoundingClientRect() || { width: 0, height: 0 };
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      
      const scaleX = width / SIMULATION_WIDTH;
      const scaleY = height / SIMULATION_HEIGHT;
      const minScale = Math.min(scaleX, scaleY);

      // Limpeza com fundo azul escuro profundo (profundidade de câmara)
      context.fillStyle = "#010409"; 
      context.fillRect(0, 0, width, height);

      // --- Desenhar Grid de Fundo ---
      context.strokeStyle = "rgba(49, 79, 128, 0.05)";
      context.lineWidth = 1;
      const gridSize = 50 * minScale;
      for (let x = 0; x <= width; x += gridSize) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
      }
      for (let y = 0; y <= height; y += gridSize) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }

      // --- Desenhar Campo de Confinamento Magnético ---
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = 220 * minScale;
      
      // Pulsação do campo baseada no confinamento
      const pulse = Math.sin(frameCount * 0.05) * 5 * settings.confinement;
      
      // Desenhar anéis magnéticos
      context.shadowBlur = 15 * settings.confinement * minScale;
      context.shadowColor = "#3b82f6";
      context.strokeStyle = `rgba(59, 130, 246, ${0.1 + settings.confinement * 0.4})`;
      context.lineWidth = (2 + settings.confinement * 3) * minScale;
      
      context.beginPath();
      context.arc(centerX, centerY, radius + pulse, 0, Math.PI * 2);
      context.stroke();

      // Linhas de força magnética (efeito de "gaiola")
      const numLines = 12;
      context.lineWidth = 1 * minScale;
      for (let i = 0; i < numLines; i++) {
        const angle = (i / numLines) * Math.PI * 2 + (frameCount * 0.01);
        const lx = centerX + Math.cos(angle) * (radius + pulse);
        const ly = centerY + Math.sin(angle) * (radius + pulse);
        
        context.beginPath();
        context.moveTo(centerX, centerY);
        context.lineTo(lx, ly);
        context.strokeStyle = `rgba(59, 130, 246, ${0.05 * settings.confinement})`;
        context.stroke();
      }
      context.shadowBlur = 0;

      // --- Efeito de "Instabilidade" se Confinamento < Temperatura/200 ---
      const instability = Math.max(0, (settings.temperature / 200) - settings.confinement);
      if (instability > 0.3) {
        context.strokeStyle = `rgba(255, 50, 50, ${instability * 0.2})`;
        context.lineWidth = 2 * minScale;
        context.beginPath();
        context.arc(centerX + (Math.random() - 0.5) * 10, centerY + (Math.random() - 0.5) * 10, radius, 0, Math.PI * 2);
        context.stroke();
      }

      // --- Desenhar Partículas com Rastros de Calor ---
      particles.forEach((p) => {
        let color = DEUTERIUM_COLOR;
        if (p.type === 'T') color = TRITIUM_COLOR;
        if (p.type === 'He3') color = HELIUM3_COLOR;
        
        const px = p.x * scaleX;
        const py = p.y * scaleY;

        // Rastro cinético (simulando calor)
        const trailLen = (settings.temperature / 100) * 5;
        const gradient = context.createLinearGradient(px, py, px - p.vx * trailLen, py - p.vy * trailLen);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, "transparent");
        
        context.strokeStyle = gradient;
        context.lineWidth = PARTICLE_RADIUS * minScale;
        context.lineCap = "round";
        context.beginPath();
        context.moveTo(px, py);
        context.lineTo(px - p.vx * trailLen, py - p.vy * trailLen);
        context.stroke();

        // Núcleo da partícula
        context.fillStyle = "white"; // Brilho central
        context.beginPath();
        context.arc(px, py, (PARTICLE_RADIUS * 0.6) * minScale, 0, 2 * Math.PI);
        context.fill();
        
        context.fillStyle = color;
        context.beginPath();
        context.arc(px, py, PARTICLE_RADIUS * minScale, 0, 2 * Math.PI);
        context.fill();
      });

      // --- Clarões de Fusão (Flashes) ---
      flashes.forEach((f) => {
        const fx = f.x * scaleX;
        const fy = f.y * scaleY;

        // Efeito de iluminação global momentânea
        const flashGradient = context.createRadialGradient(fx, fy, 0, fx, fy, f.radius * 5 * minScale);
        flashGradient.addColorStop(0, `rgba(255, 255, 255, ${f.opacity * 0.8})`);
        flashGradient.addColorStop(1, "transparent");
        
        context.fillStyle = flashGradient;
        context.fillRect(0, 0, width, height);

        // O flash em si
        context.shadowBlur = 20 * minScale;
        context.shadowColor = "white";
        context.fillStyle = `rgba(255, 255, 255, ${f.opacity})`;
        context.beginPath();
        context.arc(fx, fy, f.radius * minScale, 0, 2 * Math.PI);
        context.fill();
        context.shadowBlur = 0;
      });

      // --- Overlay de Status Visual no Canvas ---
      if (qFactor > 1.0) {
        context.fillStyle = "rgba(34, 197, 94, 0.05)"; // Verde de ignição
        context.fillRect(0, 0, width, height);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [getParticles, getFlashes, settings, qFactor]);

  return (
    <canvas 
      ref={canvasRef} 
      className="h-full w-full cursor-crosshair"
      style={{ display: 'block' }}
    />
  );
}
