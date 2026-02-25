
"use client";

import { SlidersHorizontal, Thermometer, Magnet, RotateCcw, Flame, Atom } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { ReactionMode } from "@/lib/simulation-types";

interface ControlPanelProps {
  settings: {
    temperature: number;
    confinement: number;
    energyThreshold: number;
    initialParticleCount: number;
    reactionMode: ReactionMode;
  };
  onTemperatureChange: (value: number) => void;
  onConfinementChange: (value: number) => void;
  onEnergyThresholdChange: (value: number) => void;
  onInitialParticleCountChange: (value: number) => void;
  onReactionModeChange: (mode: ReactionMode) => void;
  onReset: () => void;
}

export function ControlPanel({
  settings,
  onTemperatureChange,
  onConfinementChange,
  onEnergyThresholdChange,
  onInitialParticleCountChange,
  onReactionModeChange,
  onReset,
}: ControlPanelProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3">
        <Label className="flex items-center gap-2 font-semibold text-xs uppercase text-muted-foreground">
          <Flame className="h-3 w-3" />
          Ciclo de Combustível
        </Label>
        <RadioGroup
          value={settings.reactionMode}
          onValueChange={(value) => onReactionModeChange(value as ReactionMode)}
          className="grid grid-cols-2 gap-2"
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
              Temperatura Relativa
            </Label>
            <span className="text-xs font-mono font-bold">{settings.temperature}</span>
          </div>
          <Slider
            id="temperature"
            min={0}
            max={200}
            step={1}
            value={[settings.temperature]}
            onValueChange={(value) => onTemperatureChange(value[0])}
          />
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="confinement" className="flex items-center gap-2 text-xs">
              <Magnet className="h-3 w-3 text-blue-500" />
              Força de Confinamento
            </Label>
            <span className="text-xs font-mono font-bold">{settings.confinement.toFixed(2)}</span>
          </div>
          <Slider
            id="confinement"
            min={0}
            max={1}
            step={0.01}
            value={[settings.confinement]}
            onValueChange={(value) => onConfinementChange(value[0])}
          />
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="energy-threshold" className="flex items-center gap-2 text-xs">
              <Flame className="h-3 w-3 text-red-500" />
              Limite de Energia
            </Label>
            <span className="text-xs font-mono font-bold">{settings.energyThreshold.toFixed(1)}</span>
          </div>
          <Slider
            id="energy-threshold"
            min={5}
            max={25}
            step={0.5}
            value={[settings.energyThreshold]}
            onValueChange={(value) => onEnergyThresholdChange(value[0])}
          />
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="initial-particle-count" className="flex items-center gap-2 text-xs">
              <Atom className="h-3 w-3 text-purple-500" />
              Densidade de Partículas
            </Label>
            <span className="text-xs font-mono font-bold">{settings.initialParticleCount}</span>
          </div>
          <Slider
            id="initial-particle-count"
            min={10}
            max={200}
            step={10}
            value={[settings.initialParticleCount]}
            onValueChange={(value) => onInitialParticleCountChange(value[0])}
          />
        </div>
      </div>

      <Button variant="outline" size="sm" onClick={onReset} className="w-full h-9 text-xs">
        <RotateCcw className="mr-2 h-3 w-3" />
        Reiniciar Reator
      </Button>
    </div>
  );
}
