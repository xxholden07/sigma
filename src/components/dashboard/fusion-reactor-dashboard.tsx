
"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Sidebar, SidebarContent, SidebarHeader, SidebarInset, SidebarProvider, SidebarTrigger, SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from "@/components/ui/sidebar";
import type { Particle, FusionFlash, SimulationRun, ReactionMode, TelemetrySnapshot } from "@/lib/simulation-types";
import {
  INITIAL_PARTICLE_COUNT,
  INITIAL_TEMPERATURE,
  INITIAL_CONFINEMENT,
  DT_FUSION_ENERGY_MEV,
  DHE3_FUSION_ENERGY_MEV,
  DD_FUSION_ENERGY_MEV,
  PARTICLE_RADIUS,
  SIMULATION_WIDTH,
  SIMULATION_HEIGHT,
  PHI,
} from "@/lib/simulation-constants";
import { SimulationCanvas } from "./simulation-canvas";
import { ControlPanel } from "./control-panel";
import { TelemetryPanel } from "./telemetry-panel";
import { AIAssistant } from "./ai-assistant";
import { LeaderboardPanel } from "./leaderboard-panel";
import { FusionIcon } from "../icons/fusion-icon";
import { useFirebase, useUser, addDocumentNonBlocking, useCollection, useMemoFirebase } from "@/firebase";
import { collection, collectionGroup, query, orderBy, limit } from "firebase/firestore";
import { SimulationHistoryPanel } from "./simulation-history";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Microscope, Zap, ShieldAlert, Play, AlertTriangle, Database, History, RotateCcw, Orbit, Atom, Thermometer, BrainCircuit } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import type { PhysicsMode } from "@/lib/simulation-types";

// Constants for orbital mode
const ORBIT_LAYERS = 8;
const CENTER_X = SIMULATION_WIDTH / 2;
const CENTER_Y = SIMULATION_HEIGHT / 2;
const MAX_ORBIT_RADIUS = Math.min(SIMULATION_WIDTH, SIMULATION_HEIGHT) * 0.42;

// ============================================================
// FÍSICA DE FUSÃO NUCLEAR - FUNÇÕES DE CÁLCULO
// ============================================================

/**
 * Calcula a energia cinética relativa de duas partículas colidindo
 * E_cm = 0.5 * μ * v_rel²  (energia no centro de massa)
 * onde μ = m1*m2/(m1+m2) é a massa reduzida
 * 
 * Na simulação, a temperatura é o fator dominante.
 * Escala: T=100 → ~10 keV médio, mas colisões podem atingir energias maiores
 */
function calculateCollisionEnergy(
  p1: Particle, 
  p2: Particle, 
  temperature: number
): number {
  // Velocidade relativa
  const vRelX = p1.vx - p2.vx;
  const vRelY = p1.vy - p2.vy;
  const vRelSquared = vRelX * vRelX + vRelY * vRelY;
  
  // Energia térmica base (escala: T=100 → base de 10 keV)
  const thermalBase = temperature * 0.1;
  
  // Energia cinética da colisão (contribuição significativa!)
  // Em plasmas reais, a distribuição Maxwell-Boltzmann tem caudas de alta energia
  // Partículas rápidas (tail) são responsáveis pela maioria das fusões
  const kineticContribution = vRelSquared * 2.0; // Fator amplificado
  
  // A energia total pode ser MUITO maior que a média térmica
  // devido às caudas da distribuição (partículas "quentes")
  const totalEnergy = thermalBase + kineticContribution;
  
  // Simular caudas de Maxwell-Boltzmann: algumas colisões têm energia extra
  // Em física real, ~10% das partículas têm energia 2-3x maior que média
  const tailBoost = Math.random() < 0.15 ? (1.5 + Math.random() * 1.5) : 1.0;
  
  return totalEnergy * tailBoost;
}

/**
 * Calcula a seção cruzada de fusão σ(E) usando fórmula simplificada de Gamow
 * 
 * A seção cruzada de fusão termonuclear é dada por:
 * σ(E) = S(E)/E * exp(-sqrt(E_G/E))
 * 
 * Para a simulação, usamos uma versão escalada que mantém o comportamento
 * físico mas permite fusões em tempo razoável.
 */
function calculateFusionCrossSection(
  energyKeV: number,
  reactionType: 'DT' | 'DD' | 'DHe3'
): number {
  if (energyKeV <= 0) return 0;
  
  // Parâmetros por tipo de reação (escalados para simulação)
  let peakEnergy: number;
  let maxCrossSection: number;
  let gamowEnergy: number;
  
  switch (reactionType) {
    case 'DT':
      // D-T: pico real em 64 keV, escalamos para ~20 keV na simulação
      peakEnergy = 20;            // keV (escalado de 64)
      maxCrossSection = 5.0;      // barns
      gamowEnergy = 100;          // keV (escalado de 986 para jogabilidade)
      break;
    case 'DD':
      // D-D: muito mais difícil - pico em ~50 keV na simulação
      peakEnergy = 50;            // keV (escalado de 1250)
      maxCrossSection = 0.5;      // barns (menos que D-T)
      gamowEnergy = 150;          // keV
      break;
    case 'DHe3':
      // D-He3: intermediário - pico em ~30 keV
      peakEnergy = 30;            // keV (escalado de 250)
      maxCrossSection = 2.0;      // barns
      gamowEnergy = 120;          // keV
      break;
    default:
      return 0;
  }
  
  // Fator de Gamow: exp(-sqrt(E_G/E))
  // Representa probabilidade de tunelamento quântico
  // Com energia escalada, isso dá valores razoáveis
  const gamowFactor = Math.exp(-Math.sqrt(gamowEnergy / energyKeV));
  
  // Fator de pico: gaussiana centrada na energia ótima
  const logRatio = Math.log(energyKeV / peakEnergy);
  const peakFactor = Math.exp(-logRatio * logRatio);
  
  // Seção cruzada final
  const crossSection = maxCrossSection * gamowFactor * peakFactor;
  
  return crossSection;
}

/**
 * Calcula a probabilidade de fusão dada a seção cruzada e densidade
 * 
 * Taxa de reação: R = n1 * n2 * <σv>
 * Probabilidade por colisão: P = σ * v * dt
 * 
 * Na simulação, escalamos para obter fusões visíveis em tempo real.
 */
function calculateFusionProbability(
  crossSection: number,
  confinement: number,
  particleCount: number
): number {
  if (crossSection <= 0) return 0;
  
  // Fator de densidade: mais partículas = mais colisões potenciais
  // Normalizado para 100 partículas
  const densityFactor = Math.pow(particleCount / 60, 0.5);
  
  // Fator de confinamento: melhor campo magnético = mais tempo confinado
  // Escala de 0.1 a 1.5 Tesla → boost de 1x a 4x
  const confinementBoost = 1.0 + confinement * 2.5;
  
  // Probabilidade base da seção cruzada (crossSection em barns, 0-5)
  // Multiplicamos por 0.15 para dar ~75% chance no caso ideal
  const baseProbability = crossSection * 0.15;
  
  // Probabilidade final
  const probability = Math.min(0.85, baseProbability * confinementBoost * densityFactor);
  
  return probability;
}

/**
 * Creates particles with physics appropriate for the selected mode
 * - 'tokamak': Realistic plasma physics with magnetic confinement
 * - 'orbital': Keplerian orbital visualization (artistic/educational)
 */
function createInitialParticles(count: number, reactionMode: ReactionMode, physicsMode: PhysicsMode): Particle[] {
  const particles: Particle[] = [];
  
  for (let i = 0; i < count; i++) {
    const type = reactionMode === 'DD_DHe3' ? 'D' : (Math.random() > 0.5 ? 'D' : 'T');
    
    if (physicsMode === 'orbital') {
      // ORBITAL MODE: Keplerian planetary orbits
      const orbitLayer = i % ORBIT_LAYERS;
      const baseRadius = (0.15 + 0.1 * Math.pow(1.5, orbitLayer)) * MAX_ORBIT_RADIUS;
      const orbitRadius = baseRadius + (Math.random() - 0.5) * 15;
      const baseSpeed = 0.02 / Math.pow(orbitRadius / 100, 0.5);
      const orbitSpeed = baseSpeed * (0.8 + Math.random() * 0.4);
      const orbitAngle = Math.random() * Math.PI * 2;
      const orbitEccentricity = 0.1 + Math.random() * 0.25;
      const orbitPhase = Math.random() * Math.PI * 2;
      
      const r = orbitRadius * (1 - orbitEccentricity * Math.cos(orbitAngle));
      const x = CENTER_X + r * Math.cos(orbitAngle);
      const y = CENTER_Y + r * Math.sin(orbitAngle);
      const tangentAngle = orbitAngle + Math.PI / 2;
      const speed = orbitSpeed * orbitRadius;
      
      particles.push({
        id: i, x, y,
        vx: Math.cos(tangentAngle) * speed * 0.1,
        vy: Math.sin(tangentAngle) * speed * 0.1,
        type, orbitRadius, orbitAngle, orbitSpeed, orbitEccentricity, orbitPhase,
      });
    } else {
      // TOKAMAK MODE: Realistic plasma physics
      // Particles distributed in toroidal region with thermal velocities
      const angle = Math.random() * Math.PI * 2;
      const radius = 80 + Math.random() * 150; // Plasma region
      const x = CENTER_X + radius * Math.cos(angle);
      const y = CENTER_Y + radius * Math.sin(angle) * 0.7; // Toroidal compression
      
      // Maxwell-Boltzmann velocity distribution (simplified)
      const thermalSpeed = 3 + Math.random() * 3;
      const vAngle = Math.random() * Math.PI * 2;
      
      particles.push({
        id: i, x, y,
        vx: Math.cos(vAngle) * thermalSpeed,
        vy: Math.sin(vAngle) * thermalSpeed,
        type,
      });
    }
  }
  return particles;
}

export function FusionReactorDashboard() {
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [isSimulating, setIsSimulating] = useState(false);
  const [settings, setSettings] = useState({
    temperature: INITIAL_TEMPERATURE,
    confinement: INITIAL_CONFINEMENT,
    energyThreshold: ENERGY_THRESHOLD,
    initialParticleCount: INITIAL_PARTICLE_COUNT,
    reactionMode: 'DT' as ReactionMode,
    physicsMode: 'tokamak' as PhysicsMode, // Default to realistic physics
  });
  
  const [telemetry, setTelemetry] = useState({
    totalEnergyGenerated: 0,
    particleCount: INITIAL_PARTICLE_COUNT,
    fusionRate: 0,
    relativeTemperature: INITIAL_TEMPERATURE,
    fusionEfficiency: 0,
    averageKineticEnergy: 0,
    qFactor: 0,
    lyapunovExponent: 0,
    magneticSafetyFactorQ: 1.0,
    wallIntegrity: 100,
    aiReward: 0,
    fractalDimensionD: 1.0,
    simulationDuration: 0,
    score: 0,
  });
  
  const [peakFusionRate, setPeakFusionRate] = useState(0);
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetrySnapshot[]>([]);
  const [confinementPenalty, setConfinementPenalty] = useState(0);
  const [autopilotActive, setAutopilotActive] = useState(false);

  const lastHistorySnapshotTime = useRef(performance.now());

  // Personal runs query
  const runsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'simulationRuns');
  }, [firestore, user]);
  const { data: rawRuns } = useCollection<SimulationRun>(runsQuery);
  const allRuns = useMemo(() => {
    if (!rawRuns) return [];
    return [...rawRuns].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [rawRuns]);

  // Global leaderboard query - Requires collectionGroup permissions
  const leaderboardQuery = useMemoFirebase(() => {
      if (!firestore) return null;
      return query(
          collectionGroup(firestore, 'simulationRuns'), 
          orderBy('score', 'desc'), 
          limit(10)
      );
  }, [firestore]);
  const { data: topRuns, isLoading: isLeaderboardLoading } = useCollection<SimulationRun>(leaderboardQuery);

  const simulationStateRef = useRef({
    particles: createInitialParticles(settings.initialParticleCount, settings.reactionMode, settings.physicsMode),
    flashes: [] as FusionFlash[],
    nextParticleId: settings.initialParticleCount,
    nextFlashId: 0,
    fusionsInLastSecond: 0,
    velocityVariance: 0,
  });
  
  const totalEnergyGeneratedRef = useRef(0);
  const simulationTimeStartRef = useRef(performance.now());
  const lastFusionRateUpdateTime = useRef(performance.now());

  // Removido: login anônimo automático - agora o login é feito na página /login

  const handleSaveSimulation = useCallback(() => {
    if (!user || !firestore || totalEnergyGeneratedRef.current === 0) return;

    const sanitize = (val: any) => (typeof val === 'number' && isFinite(val) ? val : 0);

    const runData: SimulationRun = {
        id: `run_${new Date().toISOString()}`,
        userId: user.uid,
        createdAt: new Date().toISOString(),
        durationSeconds: sanitize(((performance.now() - simulationTimeStartRef.current) / 1000)),
        totalEnergyGeneratedMeV: sanitize(totalEnergyGeneratedRef.current),
        peakFusionRate: sanitize(peakFusionRate),
        outcome: (totalEnergyGeneratedRef.current > 75) ? 'High Yield' : (totalEnergyGeneratedRef.current > 25) ? 'Stable' : 'Suboptimal',
        initialParticleCount: settings.initialParticleCount,
        initialTemperature: settings.temperature,
        initialConfinement: settings.confinement,
        finalEnergyThreshold: settings.energyThreshold,
        reactionMode: settings.reactionMode,
        finalLyapunovExponent: sanitize(telemetry.lyapunovExponent),
        finalFractalDimensionD: sanitize(telemetry.fractalDimensionD),
        finalMagneticSafetyFactorQ: sanitize(telemetry.magneticSafetyFactorQ),
        finalWallIntegrity: sanitize(telemetry.wallIntegrity),
        finalAiReward: sanitize(telemetry.aiReward),
        score: sanitize(telemetry.score),
    };

    const runsCollectionRef = collection(firestore, 'users', user.uid, 'simulationRuns');
    addDocumentNonBlocking(runsCollectionRef, runData);
  }, [user, firestore, peakFusionRate, settings, telemetry]);

  const resetSimulation = useCallback((newMode?: ReactionMode) => {
    if (isSimulating) {
        handleSaveSimulation();
    }
    setIsSimulating(false);

    const reactionMode = typeof newMode === 'string' ? newMode : settings.reactionMode;

    const newSettings = {
      ...settings,
      temperature: INITIAL_TEMPERATURE,
      confinement: INITIAL_CONFINEMENT,
      reactionMode,
    };
    setSettings(newSettings);

    simulationStateRef.current = {
        particles: createInitialParticles(newSettings.initialParticleCount, reactionMode, newSettings.physicsMode),
        flashes: [],
        nextParticleId: newSettings.initialParticleCount,
        nextFlashId: 0,
        fusionsInLastSecond: 0,
        velocityVariance: 0,
    };
    totalEnergyGeneratedRef.current = 0;
    
    setTelemetryHistory([]);
    setPeakFusionRate(0);
    setConfinementPenalty(0);

    setTelemetry(prev => ({...prev,
      totalEnergyGenerated: 0,
      particleCount: newSettings.initialParticleCount,
      fusionRate: 0,
      relativeTemperature: INITIAL_TEMPERATURE,
      qFactor: 0,
      magneticSafetyFactorQ: 1.0,
      wallIntegrity: 100,
      fractalDimensionD: 1.0,
      simulationDuration: 0,
      score: 0,
    }));
    
    simulationTimeStartRef.current = performance.now();
    lastFusionRateUpdateTime.current = performance.now();
  }, [handleSaveSimulation, settings, isSimulating]);

  const handleStopSimulation = useCallback(() => {
    setIsSimulating(false);
    handleSaveSimulation();
  }, [handleSaveSimulation]);

  const handleStartIgnition = useCallback((forceReset = false) => {
    if (isSimulating && !forceReset) return;
    if (forceReset) {
        resetSimulation();
    }
    setIsSimulating(true);
    simulationTimeStartRef.current = performance.now();
    lastFusionRateUpdateTime.current = performance.now();
    lastHistorySnapshotTime.current = performance.now();
  }, [isSimulating, resetSimulation]);

  const handleTemperatureChange = useCallback((newTemp: number) => {
    setSettings(s => ({...s, temperature: newTemp}));
  }, []);
  
  const handleConfinementChange = useCallback((value: number) => {
    setSettings(s => ({...s, confinement: value}));
  }, []);

  const handleEnergyThresholdChange = useCallback((value: number) => {
    setSettings(s => ({...s, energyThreshold: value}));
  }, []);

  const handleInitialParticleCountChange = useCallback((value: number) => {
    setSettings(s => ({...s, initialParticleCount: value}));
  }, []);

  const handleReactionModeChange = useCallback((mode: ReactionMode) => {
    resetSimulation(mode);
  }, [resetSimulation]);

  const handlePhysicsModeChange = useCallback((mode: PhysicsMode) => {
    setSettings(s => ({...s, physicsMode: mode}));
    // Reset simulation to apply new physics
    setTimeout(() => resetSimulation(), 0);
  }, [resetSimulation]);

  useEffect(() => {
    let animationFrameId: number;
    
    const gameLoop = () => {
      if (!isSimulating) {
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
      }

      const { particles: currentParticles, flashes: currentFlashes } = simulationStateRef.current;
      const { confinement, energyThreshold, reactionMode, temperature, physicsMode } = settings;

      const effectiveConfinement = Math.max(0.1, confinement - confinementPenalty);
      let wallDamage = 0;

      // === PHYSICS UPDATE (mode-dependent) ===
      for (const p of currentParticles) {
        if (physicsMode === 'orbital' && p.orbitRadius !== undefined) {
          // ========== ORBITAL MODE: Keplerian Physics ==========
          const thermalPerturbation = (temperature / 100) * 0.002;
          const orbitStability = effectiveConfinement;
          
          const currentRadius = p.orbitRadius * (1 - (p.orbitEccentricity || 0) * Math.cos(p.orbitAngle || 0));
          const keplerSpeedFactor = Math.pow(p.orbitRadius / currentRadius, 1.5);
          
          p.orbitAngle = (p.orbitAngle || 0) + (p.orbitSpeed || 0.01) * keplerSpeedFactor * (0.5 + orbitStability);
          p.orbitAngle += (Math.random() - 0.5) * thermalPerturbation;
          
          const targetEccentricity = 0.1 + (temperature / 200) * 0.3;
          p.orbitEccentricity = (p.orbitEccentricity || 0) + (targetEccentricity - (p.orbitEccentricity || 0)) * 0.001;
          
          const r = p.orbitRadius * (1 - (p.orbitEccentricity || 0) * Math.cos(p.orbitAngle || 0));
          const newX = CENTER_X + r * Math.cos((p.orbitAngle || 0) + (p.orbitPhase || 0));
          const newY = CENTER_Y + r * Math.sin((p.orbitAngle || 0) + (p.orbitPhase || 0));
          
          p.vx = (newX - p.x);
          p.vy = (newY - p.y);
          p.x = newX;
          p.y = newY;

          if (p.x <= PARTICLE_RADIUS || p.x >= SIMULATION_WIDTH - PARTICLE_RADIUS) {
              p.orbitPhase = Math.PI - (p.orbitPhase || 0);
              p.orbitRadius *= 0.95;
              wallDamage += 0.05;
          }
          if (p.y <= PARTICLE_RADIUS || p.y >= SIMULATION_HEIGHT - PARTICLE_RADIUS) {
              p.orbitPhase = -(p.orbitPhase || 0);
              p.orbitRadius *= 0.95;
              wallDamage += 0.05;
          }
        } else {
          // ========== TOKAMAK MODE: Realistic Plasma Physics ==========
          // Magnetic confinement force (towards center)
          const dx = CENTER_X - p.x;
          const dy = CENTER_Y - p.y;
          const distance = Math.hypot(dx, dy);
          
          // Lorentz force simulation (magnetic confinement)
          // F = q(v × B) - particles spiral towards center
          if (distance > 1) {
            const magneticForce = effectiveConfinement * 0.8;
            p.vx += (dx / distance) * magneticForce;
            p.vy += (dy / distance) * magneticForce;
            
            // Add rotational component (gyration around field lines)
            const gyroForce = effectiveConfinement * 0.3;
            p.vx += (dy / distance) * gyroForce;
            p.vy -= (dx / distance) * gyroForce;
          }
          
          // Thermal motion (Maxwell-Boltzmann) - increased force
          const thermalForce = (temperature / 100) * 0.4;
          p.vx += (Math.random() - 0.5) * thermalForce;
          p.vy += (Math.random() - 0.5) * thermalForce;
          
          // Velocity damping (collision/viscosity)
          const damping = 0.992;
          p.vx *= damping;
          p.vy *= damping;
          
          // Update position
          p.x += p.vx;
          p.y += p.vy;

          // Wall collision (neutron damage to first wall)
          if (p.x <= PARTICLE_RADIUS || p.x >= SIMULATION_WIDTH - PARTICLE_RADIUS) {
              p.vx *= -0.8; // Energy loss on reflection
              wallDamage += 0.05;
          }
          if (p.y <= PARTICLE_RADIUS || p.y >= SIMULATION_HEIGHT - PARTICLE_RADIUS) {
              p.vy *= -0.8;
              wallDamage += 0.05;
          }
        }
        
        // Clamp position to bounds (both modes)
        p.x = Math.max(PARTICLE_RADIUS, Math.min(SIMULATION_WIDTH - PARTICLE_RADIUS, p.x));
        p.y = Math.max(PARTICLE_RADIUS, Math.min(SIMULATION_HEIGHT - PARTICLE_RADIUS, p.y));
      }
      
      const newParticlesList: Particle[] = [];
      const fusedIndices = new Set<number>();
      let frameEnergy = 0;
      let fusionsThisFrame = 0;
    
      // ============================================================
      // DETECÇÃO DE COLISÃO E FUSÃO NUCLEAR
      // ============================================================
      for (let i = 0; i < currentParticles.length; i++) {
        if (fusedIndices.has(i)) continue;
        let hasFusedWithAnother = false;
        
        for (let j = i + 1; j < currentParticles.length; j++) {
          if (fusedIndices.has(j)) continue;

          const p1 = currentParticles[i];
          const p2 = currentParticles[j];
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
    
          // Colisão detectada quando partículas se aproximam
          if (dist < PARTICLE_RADIUS * 2.5) {
            
            // === 1. CALCULAR ENERGIA DE COLISÃO (keV) ===
            const collisionEnergyKeV = calculateCollisionEnergy(p1, p2, temperature);
            
            // === 2. DETERMINAR TIPO DE REAÇÃO POSSÍVEL ===
            let reactionType: 'none' | 'DT' | 'DD' | 'DHe3' = 'none';

            if (reactionMode === 'DT') {
              // D-T: Deutério + Trítio → He4 + nêutron + 17.6 MeV
              if ((p1.type === 'D' && p2.type === 'T') || (p1.type === 'T' && p2.type === 'D')) {
                reactionType = 'DT';
              }
            } else if (reactionMode === 'DD_DHe3') {
              if (p1.type === 'D' && p2.type === 'D') {
                // D-D: Deutério + Deutério → He3 + nêutron + 3.27 MeV
                reactionType = 'DD';
              } else if ((p1.type === 'D' && p2.type === 'He3') || (p1.type === 'He3' && p2.type === 'D')) {
                // D-He3: Deutério + Hélio-3 → He4 + próton + 18.4 MeV
                reactionType = 'DHe3';
              }
            }

            if (reactionType !== 'none') {
              // === 3. CALCULAR SEÇÃO CRUZADA DE FUSÃO σ(E) ===
              const crossSection = calculateFusionCrossSection(collisionEnergyKeV, reactionType);
              
              // === 4. CALCULAR PROBABILIDADE DE FUSÃO ===
              const fusionProbability = calculateFusionProbability(
                crossSection, 
                effectiveConfinement,
                currentParticles.length
              );
              
              // === 5. ROLAR DADO PARA FUSÃO (Monte Carlo) ===
              const roll = Math.random();
              
              if (roll < fusionProbability) {
                // FUSÃO OCORREU!
                hasFusedWithAnother = true;
                fusedIndices.add(j);
                fusionsThisFrame++;
                
                // Energia liberada depende da reação
                let energyReleased = 0;
                
                if (reactionType === 'DT') {
                  // D + T → He4 (3.5 MeV) + n (14.1 MeV) = 17.6 MeV total
                  energyReleased = DT_FUSION_ENERGY_MEV;
                  // Flash de fusão (mais intenso para D-T)
                  currentFlashes.push({ 
                    id: simulationStateRef.current.nextFlashId++, 
                    x: (p1.x + p2.x) / 2, 
                    y: (p1.y + p2.y) / 2, 
                    radius: 3, 
                    opacity: 1 
                  });
                  
                } else if (reactionType === 'DD') {
                  // D + D → He3 (0.82 MeV) + n (2.45 MeV) = 3.27 MeV
                  // OU D + D → T (1.01 MeV) + p (3.02 MeV) = 4.03 MeV
                  // Usamos a média e criamos He3
                  energyReleased = DD_FUSION_ENERGY_MEV;
                  
                  // Criar partícula He3 (produto da reação)
                  const newX = (p1.x + p2.x) / 2;
                  const newY = (p1.y + p2.y) / 2;
                  const newOrbitRadius = p1.orbitRadius && p2.orbitRadius 
                    ? ((p1.orbitRadius + p2.orbitRadius) / 2) * 0.9 
                    : undefined;
                    
                  newParticlesList.push({ 
                    id: simulationStateRef.current.nextParticleId++, 
                    x: newX, 
                    y: newY, 
                    // He3 carrega parte do momento
                    vx: (p1.vx + p2.vx) * 0.4,
                    vy: (p1.vy + p2.vy) * 0.4,
                    type: 'He3',
                    orbitRadius: newOrbitRadius,
                    orbitAngle: p1.orbitAngle,
                    orbitSpeed: newOrbitRadius ? 0.02 / Math.pow(newOrbitRadius / 100, 0.5) : undefined,
                    orbitEccentricity: p1.orbitEccentricity && p2.orbitEccentricity 
                      ? (p1.orbitEccentricity + p2.orbitEccentricity) / 2 
                      : undefined,
                    orbitPhase: p1.orbitPhase && p2.orbitPhase 
                      ? (p1.orbitPhase + p2.orbitPhase) / 2 
                      : undefined,
                  });
                  
                  // Flash menor para D-D
                  currentFlashes.push({ 
                    id: simulationStateRef.current.nextFlashId++, 
                    x: newX, 
                    y: newY, 
                    radius: 2, 
                    opacity: 0.8 
                  });
                  
                } else if (reactionType === 'DHe3') {
                  // D + He3 → He4 (3.6 MeV) + p (14.7 MeV) = 18.3 MeV
                  // Reação aneutrônica (sem nêutrons) - ideal para energia limpa
                  energyReleased = DHE3_FUSION_ENERGY_MEV;
                  
                  // Flash dourado para D-He3 (reação premium)
                  currentFlashes.push({ 
                    id: simulationStateRef.current.nextFlashId++, 
                    x: (p1.x + p2.x) / 2, 
                    y: (p1.y + p2.y) / 2, 
                    radius: 4, 
                    opacity: 1 
                  });
                }
                
                frameEnergy += energyReleased;
                simulationStateRef.current.fusionsInLastSecond++;
                break;
              }
            }
            
            // Se não fundiu, aplicar colisão elástica (bounce)
            if (!hasFusedWithAnother && dist < PARTICLE_RADIUS * 2) {
              // Colisão elástica simples
              const nx = (p2.x - p1.x) / dist;
              const ny = (p2.y - p1.y) / dist;
              const dvx = p1.vx - p2.vx;
              const dvy = p1.vy - p2.vy;
              const dvn = dvx * nx + dvy * ny;
              
              if (dvn > 0) {
                p1.vx -= dvn * nx * 0.5;
                p1.vy -= dvn * ny * 0.5;
                p2.vx += dvn * nx * 0.5;
                p2.vy += dvn * ny * 0.5;
              }
            }
          }
        }
        if (!hasFusedWithAnother) newParticlesList.push(currentParticles[i]);
      }

      if (wallDamage > 0) {
          setTelemetry(prev => {
              const newWallIntegrity = Math.max(0, prev.wallIntegrity - wallDamage);
              if (newWallIntegrity === 0) {
                  toast({ title: "Falha Crítica do Reator!", description: "A integridade da parede chegou a 0%. Salvando dados da simulação.", variant: "destructive" });
                  resetSimulation();
              }
              return { ...prev, wallIntegrity: newWallIntegrity };
          });
      }

      simulationStateRef.current.particles = newParticlesList;
      simulationStateRef.current.flashes = currentFlashes.filter(f => {
        f.radius += 1.5;
        f.opacity -= 0.05;
        return f.opacity > 0;
      });
      
      totalEnergyGeneratedRef.current += frameEnergy;
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [settings, isSimulating, confinementPenalty, resetSimulation, toast]);
  
  useEffect(() => {
    const intervalId = setInterval(() => {
        if (!isSimulating) return;

        const currentTime = performance.now();
        setTelemetry(prev => {
            let newFusionRate = prev.fusionRate;
            let instantaneousQ = prev.qFactor;

            if (currentTime - lastFusionRateUpdateTime.current >= 1000) {
                newFusionRate = simulationStateRef.current.fusionsInLastSecond;
                const energyInPerSecond = (settings.temperature * settings.confinement * settings.initialParticleCount * 0.05) + 1;
                const energyOutPerSecond = newFusionRate * (settings.reactionMode === 'DT' ? DT_FUSION_ENERGY_MEV : DHE3_FUSION_ENERGY_MEV);
                instantaneousQ = parseFloat((energyOutPerSecond / energyInPerSecond).toFixed(2));
                simulationStateRef.current.fusionsInLastSecond = 0;
                lastFusionRateUpdateTime.current = currentTime;
            }

            const duration = (performance.now() - simulationTimeStartRef.current) / 1000;
            const magSafetyQ = parseFloat((1 + (settings.confinement * 3) / (Math.max(1, settings.temperature / 50))).toFixed(3));
            const fractalTurbulence = Math.abs(magSafetyQ - PHI) * 0.3;
            const dFactor = 1.0 + Math.min(0.9, fractalTurbulence);
            
            const newScore = (totalEnergyGeneratedRef.current * 10) + (instantaneousQ * 50) + (duration * 2);

            return {
                ...prev,
                totalEnergyGenerated: totalEnergyGeneratedRef.current,
                particleCount: simulationStateRef.current.particles.length,
                fusionRate: newFusionRate,
                simulationDuration: duration,
                qFactor: instantaneousQ,
                magneticSafetyFactorQ: magSafetyQ,
                fractalDimensionD: dFactor,
                score: newScore,
            };
        });
    }, 200);
    return () => clearInterval(intervalId);
  }, [settings, isSimulating]);

  useEffect(() => {
    if (!isSimulating) return;

    const now = performance.now();
    if (now - lastHistorySnapshotTime.current > 500) {
        const snapshot: TelemetrySnapshot = {
            timestamp: now,
            qFactor: telemetry.qFactor,
            fusionRate: telemetry.fusionRate,
            particleCount: telemetry.particleCount,
            relativeTemperature: settings.temperature,
            magneticSafetyFactorQ: telemetry.magneticSafetyFactorQ,
            fractalDimensionD: telemetry.fractalDimensionD,
        };

        setTelemetryHistory(prev => {
            const newHistory = [...prev, snapshot].slice(-50);
            return newHistory;
        });
        
        lastHistorySnapshotTime.current = now;
    }
  }, [isSimulating, telemetry, settings.temperature]);

  return (
    <div className="h-screen w-full bg-black overflow-hidden relative">
      {/* ============================================ */}
      {/* COCKPIT VIEW - STARSHIP BRIDGE */}
      {/* ============================================ */}
      
      {/* Space Background with Stars */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-black to-slate-950">
        <div className="absolute inset-0 opacity-50" style={{
          backgroundImage: `radial-gradient(1px 1px at 20px 30px, white, transparent),
                           radial-gradient(1px 1px at 40px 70px, rgba(255,255,255,0.8), transparent),
                           radial-gradient(1px 1px at 50px 160px, rgba(255,255,255,0.6), transparent),
                           radial-gradient(1px 1px at 90px 40px, white, transparent),
                           radial-gradient(1px 1px at 130px 80px, rgba(255,255,255,0.7), transparent),
                           radial-gradient(1.5px 1.5px at 160px 120px, cyan, transparent)`,
          backgroundSize: '200px 200px'
        }} />
      </div>

      {/* Main Viewport - Reactor View */}
      <div className="absolute inset-x-0 top-0 bottom-48 flex items-center justify-center p-4">
        <div className="relative w-full h-full max-w-[1400px]">
          {/* Cockpit Frame - Top */}
          <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-slate-800 to-transparent z-10">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          </div>
          
          {/* Cockpit Frame - Left Strut */}
          <div className="absolute top-0 left-0 bottom-0 w-16 z-10">
            <svg className="h-full w-full" viewBox="0 0 60 400" preserveAspectRatio="none">
              <path d="M0,0 L60,30 L60,370 L0,400 Z" fill="url(#cockpitGradientLeft)" />
              <path d="M55,35 L55,365" stroke="rgba(0,200,255,0.3)" strokeWidth="1" />
            </svg>
          </div>
          
          {/* Cockpit Frame - Right Strut */}
          <div className="absolute top-0 right-0 bottom-0 w-16 z-10">
            <svg className="h-full w-full" viewBox="0 0 60 400" preserveAspectRatio="none">
              <path d="M60,0 L0,30 L0,370 L60,400 Z" fill="url(#cockpitGradientRight)" />
              <path d="M5,35 L5,365" stroke="rgba(0,200,255,0.3)" strokeWidth="1" />
            </svg>
          </div>
          
          {/* SVG Gradients */}
          <svg className="absolute w-0 h-0">
            <defs>
              <linearGradient id="cockpitGradientLeft" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
              <linearGradient id="cockpitGradientRight" x1="100%" y1="0%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
          </svg>

          {/* Main Viewport Screen */}
          <div className="absolute inset-8 rounded-lg overflow-hidden border border-cyan-500/30 shadow-[0_0_60px_-15px_rgba(0,200,255,0.5),inset_0_0_100px_-50px_rgba(0,200,255,0.2)]">
            {/* Scanlines Effect */}
            <div className="absolute inset-0 pointer-events-none z-20 opacity-10" style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)'
            }} />
            
            {/* HUD Overlay - Top */}
            <div className="absolute top-0 left-0 right-0 h-16 z-10 flex items-center justify-between px-6 bg-gradient-to-b from-black/60 to-transparent">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${isSimulating ? 'bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]' : 'bg-slate-600'}`} />
                  <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">{isSimulating ? 'REATOR ONLINE' : 'STANDBY'}</span>
                </div>
                <div className="h-4 w-px bg-cyan-500/30" />
                <span className="text-xs font-mono text-slate-400">TORAX-VII</span>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-[10px] font-mono text-slate-500 uppercase">Missão</div>
                  <div className="text-sm font-mono text-cyan-400">{Math.floor(telemetry.simulationDuration)}s</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] font-mono text-slate-500 uppercase">Pontos</div>
                  <div className="text-sm font-mono text-amber-400 font-bold">{Math.round(telemetry.score).toLocaleString()}</div>
                </div>
              </div>
            </div>
            
            {/* HUD Overlay - Target Reticle */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="relative w-32 h-32">
                <div className="absolute inset-0 border border-cyan-500/20 rounded-full" />
                <div className="absolute inset-4 border border-cyan-500/30 rounded-full" />
                <div className="absolute top-1/2 left-0 right-0 h-px bg-cyan-500/20" />
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-cyan-500/20" />
                {/* Corner brackets */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-500/50" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-500/50" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-500/50" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-500/50" />
              </div>
            </div>
            
            {/* Reactor View (Canvas) */}
            {!isSimulating && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
                  <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/40 flex items-center justify-center">
                    <Play className="h-8 w-8 text-cyan-400 ml-1" />
                  </div>
                </div>
                <h2 className="text-2xl font-mono font-bold text-cyan-400 uppercase tracking-widest">Sistemas Prontos</h2>
                <p className="text-sm text-slate-400 font-mono">Aguardando comando de ignição</p>
                <Button 
                  onClick={() => handleStartIgnition()}
                  className="mt-4 h-12 px-8 font-mono font-bold uppercase tracking-wider bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/30 hover:border-cyan-400 shadow-[0_0_30px_-10px_rgba(0,200,255,0.5)]"
                >
                  <Play className="h-5 w-5 mr-2 fill-current" />
                  Iniciar Ignição
                </Button>
              </div>
            )}
            
            <SimulationCanvas 
              getParticles={() => simulationStateRef.current.particles}
              getFlashes={() => simulationStateRef.current.flashes}
              settings={settings}
              qFactor={telemetry.qFactor}
              magneticSafetyFactorQ={telemetry.magneticSafetyFactorQ}
              fractalDimensionD={telemetry.fractalDimensionD}
            />
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* COCKPIT INSTRUMENT PANEL - Bottom */}
      {/* ============================================ */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-slate-900 via-slate-900/95 to-slate-900/80 border-t border-cyan-500/30">
        {/* Panel Edge Glow */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent" />
        
        <div className="h-full flex items-stretch gap-1 p-2">
          
          {/* LEFT PANEL - Primary Gauges */}
          <div className="flex-1 bg-slate-950/80 rounded-lg border border-cyan-500/20 p-3 flex flex-col">
            <div className="text-[9px] font-mono text-cyan-500/70 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Thermometer className="h-3 w-3" />
              Controle Primário
            </div>
            
            <div className="flex-1 grid grid-cols-2 gap-3">
              {/* Temperature Gauge */}
              <div className="bg-black/40 rounded-lg p-2 border border-slate-700/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[8px] font-mono text-orange-400 uppercase">Plasma Temp</span>
                  <span className="text-sm font-mono font-bold text-orange-400">{settings.temperature}</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-600 via-orange-400 to-yellow-400 transition-all"
                    style={{ width: `${(settings.temperature / 300) * 100}%` }}
                  />
                </div>
                <Slider
                  min={10}
                  max={300}
                  step={5}
                  value={[settings.temperature]}
                  onValueChange={(v) => handleTemperatureChange(v[0])}
                  className="mt-2"
                />
              </div>
              
              {/* Confinement Gauge */}
              <div className="bg-black/40 rounded-lg p-2 border border-slate-700/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[8px] font-mono text-blue-400 uppercase">Campo B</span>
                  <span className="text-sm font-mono font-bold text-blue-400">{settings.confinement.toFixed(2)}T</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-600 via-blue-400 to-cyan-400 transition-all"
                    style={{ width: `${(settings.confinement / 1.5) * 100}%` }}
                  />
                </div>
                <Slider
                  min={0.1}
                  max={1.5}
                  step={0.05}
                  value={[settings.confinement]}
                  onValueChange={(v) => handleConfinementChange(v[0])}
                  className="mt-2"
                />
              </div>
            </div>
          </div>

          {/* CENTER PANEL - Main Displays */}
          <div className="flex-[1.5] bg-slate-950/80 rounded-lg border border-cyan-500/20 p-3 flex flex-col">
            <div className="text-[9px] font-mono text-cyan-500/70 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Zap className="h-3 w-3" />
              Diagnóstico do Reator
            </div>
            
            <div className="flex-1 grid grid-cols-4 gap-2">
              {/* Q-Factor Display */}
              <div className={`bg-black/60 rounded-lg p-2 border flex flex-col items-center justify-center ${
                telemetry.qFactor >= 5 ? 'border-amber-500/50 shadow-[0_0_20px_-5px_rgba(245,158,11,0.5)]' :
                telemetry.qFactor >= 1 ? 'border-green-500/50' : 'border-slate-700/50'
              }`}>
                <span className="text-[8px] font-mono text-slate-500 uppercase">Fator Q</span>
                <span className={`text-2xl font-mono font-black ${
                  telemetry.qFactor >= 5 ? 'text-amber-400' :
                  telemetry.qFactor >= 1 ? 'text-green-400' : 'text-slate-400'
                }`}>{telemetry.qFactor.toFixed(2)}</span>
                {telemetry.qFactor >= 5 && <span className="text-[8px] font-mono text-amber-400 animate-pulse">IGNIÇÃO!</span>}
              </div>
              
              {/* Fusion Rate */}
              <div className="bg-black/60 rounded-lg p-2 border border-slate-700/50 flex flex-col items-center justify-center">
                <span className="text-[8px] font-mono text-slate-500 uppercase">Fusões/s</span>
                <span className="text-2xl font-mono font-bold text-cyan-400">{telemetry.fusionRate}</span>
              </div>
              
              {/* Shield Integrity */}
              <div className={`bg-black/60 rounded-lg p-2 border flex flex-col items-center justify-center ${
                telemetry.wallIntegrity < 50 ? 'border-red-500/50' : 'border-slate-700/50'
              }`}>
                <span className="text-[8px] font-mono text-slate-500 uppercase">Blindagem</span>
                <span className={`text-2xl font-mono font-bold ${
                  telemetry.wallIntegrity < 50 ? 'text-red-400' : 'text-green-400'
                }`}>{telemetry.wallIntegrity.toFixed(0)}%</span>
              </div>
              
              {/* Particles */}
              <div className="bg-black/60 rounded-lg p-2 border border-slate-700/50 flex flex-col items-center justify-center">
                <span className="text-[8px] font-mono text-slate-500 uppercase">Partículas</span>
                <span className="text-2xl font-mono font-bold text-purple-400">{telemetry.particleCount}</span>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL - Controls & AI */}
          <div className="flex-1 bg-slate-950/80 rounded-lg border border-cyan-500/20 p-3 flex flex-col">
            <div className="text-[9px] font-mono text-cyan-500/70 uppercase tracking-widest mb-2 flex items-center gap-2">
              <BrainCircuit className="h-3 w-3" />
              Prometeu AI
            </div>
            
            <div className="flex-1 flex flex-col gap-2">
              {/* Reaction Mode Toggle */}
              <div className="flex gap-1">
                <button
                  onClick={() => !isSimulating && handleReactionModeChange('DT')}
                  disabled={isSimulating}
                  className={`flex-1 h-8 rounded text-[10px] font-mono font-bold uppercase transition-all ${
                    settings.reactionMode === 'DT' 
                      ? 'bg-cyan-500/30 border border-cyan-500/60 text-cyan-400' 
                      : 'bg-slate-800/50 border border-slate-700/50 text-slate-500 hover:text-slate-400'
                  }`}
                >
                  D-T
                </button>
                <button
                  onClick={() => !isSimulating && handleReactionModeChange('DD_DHe3')}
                  disabled={isSimulating}
                  className={`flex-1 h-8 rounded text-[10px] font-mono font-bold uppercase transition-all ${
                    settings.reactionMode === 'DD_DHe3' 
                      ? 'bg-cyan-500/30 border border-cyan-500/60 text-cyan-400' 
                      : 'bg-slate-800/50 border border-slate-700/50 text-slate-500 hover:text-slate-400'
                  }`}
                >
                  D-D/He³
                </button>
              </div>
              
              {/* Autopilot Toggle */}
              <div className="flex-1 flex items-center justify-between bg-black/40 rounded-lg px-3 border border-slate-700/50">
                <div className="flex items-center gap-2">
                  <BrainCircuit className={`h-4 w-4 ${autopilotActive ? 'text-green-400' : 'text-slate-500'}`} />
                  <span className="text-[10px] font-mono uppercase">Auto-Piloto</span>
                </div>
                <div 
                  onClick={() => setAutopilotActive(!autopilotActive)}
                  className={`w-10 h-5 rounded-full cursor-pointer transition-all ${
                    autopilotActive ? 'bg-green-500/30 border border-green-500' : 'bg-slate-700 border border-slate-600'
                  }`}
                >
                  <div className={`h-4 w-4 rounded-full bg-white transition-all mt-0.5 ${autopilotActive ? 'ml-5' : 'ml-0.5'}`} />
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-1">
                {isSimulating ? (
                  <Button 
                    onClick={() => resetSimulation()}
                    variant="outline"
                    className="flex-1 h-8 text-[10px] font-mono uppercase border-red-500/50 text-red-400 hover:bg-red-500/20"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Abortar
                  </Button>
                ) : (
                  <Button 
                    onClick={() => handleStartIgnition()}
                    className="flex-1 h-8 text-[10px] font-mono uppercase bg-green-500/20 border border-green-500/50 text-green-400 hover:bg-green-500/30"
                  >
                    <Play className="h-3 w-3 mr-1 fill-current" />
                    Ignição
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* FAR RIGHT - Mini Gauges */}
          <div className="w-32 bg-slate-950/80 rounded-lg border border-cyan-500/20 p-2 flex flex-col gap-1">
            <div className="text-[8px] font-mono text-cyan-500/70 uppercase tracking-widest text-center">Status</div>
            
            {/* Mini gauge displays */}
            <div className="flex-1 flex flex-col justify-around">
              <div className="text-center">
                <div className="text-[7px] font-mono text-slate-500">LYAPUNOV λ</div>
                <div className="text-sm font-mono font-bold text-cyan-400">{telemetry.lyapunovExponent.toFixed(3)}</div>
              </div>
              <div className="text-center">
                <div className="text-[7px] font-mono text-slate-500">FRACTAL D</div>
                <div className="text-sm font-mono font-bold text-purple-400">{telemetry.fractalDimensionD.toFixed(2)}</div>
              </div>
              <div className="text-center">
                <div className="text-[7px] font-mono text-slate-500">MAG SAFETY q</div>
                <div className="text-sm font-mono font-bold text-amber-400">{telemetry.magneticSafetyFactorQ.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden AI Assistant - runs in background */}
      <div className="hidden">
        <AIAssistant
          telemetryHistory={telemetryHistory}
          settings={settings}
          currentReward={telemetry.aiReward}
          onTemperatureChange={handleTemperatureChange}
          onConfinementChange={handleConfinementChange}
          onReactionModeChange={handleReactionModeChange}
          onReset={() => resetSimulation()}
          onStartIgnition={handleStartIgnition}
          isSimulating={isSimulating}
          topRuns={topRuns}
          autopilotEnabled={autopilotActive}
          onAutopilotChange={setAutopilotActive}
        />
      </div>
    </div>
  );
}
