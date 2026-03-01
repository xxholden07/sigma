
export type ParticleType = 'D' | 'T' | 'He3';

export type ReactionMode = 'DT' | 'DD_DHe3';

export interface SimulationSettings {
  reactionMode: ReactionMode;
  temperature: number;
  confinement: number;
  energyThreshold: number;
  initialParticleCount: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: ParticleType;
}

export interface FusionFlash {
  id: number;
  x: number;
  y: number;
  radius: number;
  opacity: number;
}

export interface SimulationRun {
  id: string;
  userId: string;
  createdAt: string; // ISO String
  durationSeconds: number;
  totalEnergyGeneratedMeV: number;
  peakFusionRate: number;
  outcome: 'High Yield' | 'Stable' | 'Suboptimal';
  initialParticleCount: number;
  initialTemperature: number;
  initialConfinement: number;
  finalEnergyThreshold: number;
  reactionMode: ReactionMode;
  score?: number;
  // Advanced Metrics for RL Training
  finalLyapunovExponent?: number;
  finalFractalDimensionD?: number;
  finalMagneticSafetyFactorQ?: number;
  finalWallIntegrity?: number;
  finalAiReward?: number;
}

export interface TelemetrySnapshot {
    timestamp: number;
    qFactor: number;
    fusionRate: number;
    particleCount: number;
    relativeTemperature: number;
    magneticSafetyFactorQ: number;
    fractalDimensionD: number;
}
