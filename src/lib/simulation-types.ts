
export type ParticleType = 'D' | 'T' | 'He3';

export type ReactionMode = 'DT' | 'DD_DHe3';

// Physics mode for simulation
export type PhysicsMode = 'tokamak' | 'orbital';

export interface SimulationSettings {
  reactionMode: ReactionMode;
  temperature: number;
  confinement: number;
  energyThreshold: number;
  initialParticleCount: number;
  physicsMode: PhysicsMode; // 'tokamak' = realistic plasma physics, 'orbital' = Keplerian visualization
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: ParticleType;
  // Orbital parameters (only used in 'orbital' mode)
  orbitRadius?: number;      // Semi-major axis
  orbitAngle?: number;       // Current angle in orbit (radians)
  orbitSpeed?: number;       // Angular velocity
  orbitEccentricity?: number; // 0 = circle, 0.5 = ellipse
  orbitPhase?: number;       // Phase offset
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
