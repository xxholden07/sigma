
"use client";

import { SlidersHorizontal, Thermometer, Magnet, RotateCcw, Flame, Atom, Play, Orbit, CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { ReactionMode, PhysicsMode } from "@/lib/simulation-types";
import { Badge } from "@/components/ui/badge";

interface ControlPanelProps {
  settings: {
    temperature: number;
    confinement: number;
    energyThreshold: number;
    initialParticleCount: number;
    reactionMode: ReactionMode;
    physicsMode: PhysicsMode;
  };
  onTemperatureChange: (value: number) => void;
  onConfinementChange: (value: number) => void;
  onEnergyThresholdChange: (value: number) => void;
  onInitialParticleCountChange: (value: number) => void;
  onReactionModeChange: (mode: ReactionMode) => void;
  onPhysicsModeChange: (mode: PhysicsMode) => void;
  onReset: () => void;
  onStartIgnition: () => void;
  isSimulating: boolean;
}

export function ControlPanel({
  settings,
  onTemperatureChange,
  onConfinementChange,
  onEnergyThresholdChange,
  onInitialParticleCountChange,
  onReactionModeChange,
  onPhysicsModeChange,
  onReset,
  onStartIgnition,
  isSimulating,
}: ControlPanelProps) {
  return (
    <div className="space-y-6">
      {/* Physics Mode Selection */}
      <div className="grid gap-3">
        <Label className="flex items-center gap-2 font-semibold text-xs uppercase text-muted-foreground">
          <Atom className="h-3 w-3" />
          Modo de Física
          <Badge variant="outline" className="ml-auto text-[8px] font-normal">
            {settings.physicsMode === 'tokamak' ? 'Científico' : 'Visual'}
          </Badge>
        </Label>
        <RadioGroup
          value={settings.physicsMode}
          onValueChange={(value) => onPhysicsModeChange(value as PhysicsMode)}
          className="grid grid-cols-2 gap-2"
          disabled={isSimulating}
        >
          <div>
            <RadioGroupItem value="tokamak" id="tokamak" className="peer sr-only" />
            <Label
              htmlFor="tokamak"
              className="flex h-12 cursor-pointer flex-col items-center justify-center rounded-md border border-muted bg-popover text-[10px] hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 gap-1"
            >
              <CircleDot className="h-4 w-4" />
              <span>Tokamak</span>
            </Label>
          </div>
          <div>
            <RadioGroupItem value="orbital" id="orbital" className="peer sr-only" />
            <Label
              htmlFor="orbital"
              className="flex h-12 cursor-pointer flex-col items-center justify-center rounded-md border border-muted bg-popover text-[10px] hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 gap-1"
            >
              <Orbit className="h-4 w-4" />
              <span>Orbital</span>
            </Label>
          </div>
        </RadioGroup>
        <p className="text-[9px] text-muted-foreground text-center">
          {settings.physicsMode === 'tokamak' 
            ? '⚛️ Física de plasma realista (dados para ML)' 
            : '🌌 Órbitas Keplerianas (visualização)'}
        </p>
      </div>

      {/* Reaction Mode */}
      <div className="grid gap-3">
        <Label className="flex items-center gap-2 font-semibold text-xs uppercase text-muted-foreground">
          <Flame className="h-3 w-3" />
          Ciclo de Combustível
        </Label>
        <RadioGroup
          value={settings.reactionMode}
          onValueChange={(value) => onReactionModeChange(value as ReactionMode)}
          className="grid grid-cols-2 gap-2"
          disabled={isSimulating}
        >
          <div>
            <RadioGroupItem value="DT" id="dt" className="peer sr-only" />
            <Label
              htmlFor="dt"
              className="flex h-10 cursor-pointer flex-col items-center justify-center rounded-md border border-muted bg-popover text-xs hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
            >
              D-T
            </Label>
          </div>
          <div>
            <RadioGroupItem value="DD_DHe3" id="dd_dhe3" className="peer sr-only" />
            <Label
              htmlFor="dd_dhe3"
              className="flex h-10 cursor-pointer flex-col items-center justify-center rounded-md border border-muted bg-popover text-xs hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
            >
              D-D / D-He3
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="temperature" className="flex items-center gap-2 text-xs">
              <Thermometer className="h-3 w-3 text-orange-500" />
              Temperatura do Plasma
            </Label>
            <span className="text-xs font-mono font-bold">{(settings.temperature ?? 0).toFixed(0)} <span className="text-[8px] text-muted-foreground">≈{((settings.temperature ?? 0) * 0.1).toFixed(1)} keV</span></span>
          </div>
          <Slider
            id="temperature"
            min={10}
            max={300}
            step={5}
            value={[settings.temperature ?? 0]}
            onValueChange={(value) => onTemperatureChange(value[0])}
          />
          <p className="text-[8px] text-muted-foreground">
            Pico D-T: ~200 | Pico D-D: ~500
          </p>
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="confinement" className="flex items-center gap-2 text-xs">
              <Magnet className="h-3 w-3 text-blue-500" />
              Campo Magnético (B)
            </Label>
            <span className="text-xs font-mono font-bold">{(settings.confinement ?? 0).toFixed(2)} <span className="text-[8px] text-muted-foreground">T</span></span>
          </div>
          <Slider
            id="confinement"
            min={0.1}
            max={1.5}
            step={0.05}
            value={[settings.confinement ?? 0]}
            onValueChange={(value) => onConfinementChange(value[0])}
          />
          <p className="text-[8px] text-muted-foreground">
            D-T: mín 0.5T | D-D: mín 1.0T
          </p>
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="initial-particle-count" className="flex items-center gap-2 text-xs">
              <Atom className="h-3 w-3 text-purple-500" />
              Densidade do Plasma (n)
            </Label>
            <span className="text-xs font-mono font-bold">{settings.initialParticleCount ?? 0} <span className="text-[8px] text-muted-foreground">part.</span></span>
          </div>
          <Slider
            id="initial-particle-count"
            min={20}
            max={150}
            step={5}
            value={[settings.initialParticleCount ?? 0]}
            onValueChange={(value) => onInitialParticleCountChange(value[0])}
            disabled={isSimulating}
          />
          <p className="text-[8px] text-muted-foreground">
            Critério de Lawson: n × T × τ &gt; limiar
          </p>
        </div>
      </div>

      <div className="grid gap-3 pt-4 border-t border-white/5">
        {!isSimulating ? (
          <Button 
            onClick={onStartIgnition} 
            className="w-full h-12 font-bold gap-2 bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-500/90 shadow-lg shadow-primary/20 transition-all hover:shadow-primary/40 hover:scale-[1.02]"
          >
            <Play className="h-5 w-5 fill-current" />
            INICIAR IGNIÇÃO
          </Button>
        ) : (
          <Button 
            variant="outline" 
            onClick={onReset} 
            className="w-full h-12 font-bold gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-300 transition-all"
          >
            <RotateCcw className="h-5 w-5" />
            ABORTAR / RESET
          </Button>
        )}
      </div>
    </div>
  );
}
