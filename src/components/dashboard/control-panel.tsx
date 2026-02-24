"use client";

import { SlidersHorizontal, Thermometer, Magnet, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface ControlPanelProps {
  settings: {
    temperature: number;
    confinement: number;
  };
  onTemperatureChange: (value: number) => void;
  onConfinementChange: (value: number) => void;
  onReset: () => void;
}

export function ControlPanel({
  settings,
  onTemperatureChange,
  onConfinementChange,
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
        <Button variant="outline" onClick={onReset} className="w-full">
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset Simulation
        </Button>
      </CardContent>
    </Card>
  );
}
