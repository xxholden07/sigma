
"use client";

import { SlidersHorizontal, Thermometer, Magnet, RotateCcw, Flame, Atom } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="space-y-1.5">
          <CardTitle className="text-lg font-headline">Controls</CardTitle>
          <CardDescription>Adjust reactor parameters.</CardDescription>
        </div>
        <SlidersHorizontal className="h-6 w-6 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3">
          <Label className="flex items-center gap-2 font-semibold">
            <Flame className="h-4 w-4" />
            Fuel Cycle
          </Label>
          <RadioGroup
            value={settings.reactionMode}
            onValueChange={(value) => onReactionModeChange(value as ReactionMode)}
            className="grid grid-cols-2 gap-4"
          >
            <div>
              <RadioGroupItem value="DT" id="dt" className="peer sr-only" />
              <Label
                htmlFor="dt"
                className="flex h-full cursor-pointer flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
              >
                D-T
              </Label>
            </div>
            <div>
              <RadioGroupItem value="DD_DHe3" id="dd_dhe3" className="peer sr-only" />
              <Label
                htmlFor="dd_dhe3"
                className="flex h-full cursor-pointer flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
              >
                D-D / D-He3
              </Label>
            </div>
          </RadioGroup>
          <p className="text-xs text-muted-foreground px-1">
            {settings.reactionMode === 'DT'
              ? 'Uses Deuterium and Tritium. The most common approach.'
              : 'Uses only Deuterium, which fuses to create Helium-3, then fuses D with He-3.'}
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="temperature" className="flex items-center gap-2">
            <Thermometer className="h-4 w-4" />
            Relative Temperature
          </Label>
          <div className="flex items-center gap-4">
            <Slider
              id="temperature"
              min={0}
              max={200}
              step={1}
              value={[settings.temperature]}
              onValueChange={(value) => onTemperatureChange(value[0])}
            />
            <span className="text-sm font-semibold w-12 text-right">{settings.temperature}</span>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="confinement" className="flex items-center gap-2">
            <Magnet className="h-4 w-4" />
            Confinement Strength
          </Label>
          <div className="flex items-center gap-4">
            <Slider
              id="confinement"
              min={0}
              max={1}
              step={0.05}
              value={[settings.confinement]}
              onValueChange={(value) => onConfinementChange(value[0])}
            />
            <span className="text-sm font-semibold w-12 text-right">{settings.confinement.toFixed(2)}</span>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="energy-threshold" className="flex items-center gap-2">
            <Flame className="h-4 w-4" />
            Energy Threshold
          </Label>
          <div className="flex items-center gap-4">
            <Slider
              id="energy-threshold"
              min={5}
              max={25}
              step={0.5}
              value={[settings.energyThreshold]}
              onValueChange={(value) => onEnergyThresholdChange(value[0])}
            />
            <span className="text-sm font-semibold w-12 text-right">
              {typeof settings.energyThreshold === 'number' ? settings.energyThreshold.toFixed(1) : 'N/A'}
            </span>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="initial-particle-count" className="flex items-center gap-2">
            <Atom className="h-4 w-4" />
            Initial Particle Count
          </Label>
          <div className="flex items-center gap-4">
            <Slider
              id="initial-particle-count"
              min={10}
              max={200}
              step={10}
              value={[settings.initialParticleCount]}
              onValueChange={(value) => onInitialParticleCountChange(value[0])}
            />
            <span className="text-sm font-semibold w-12 text-right">{settings.initialParticleCount}</span>
          </div>
        </div>

        <Button variant="outline" onClick={onReset} className="w-full">
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset Simulation
        </Button>
      </CardContent>
    </Card>
  );
}
