export type ParticleType = 'D' | 'T';

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
