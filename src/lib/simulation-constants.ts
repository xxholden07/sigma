
export const SIMULATION_WIDTH = 800;
export const SIMULATION_HEIGHT = 600;
export const FPS = 60;
export const PARTICLE_RADIUS = 5;
export const ENERGY_THRESHOLD = 10.0;
export const DT_FUSION_ENERGY_MEV = 17.6;
export const DHE3_FUSION_ENERGY_MEV = 18.4;
export const DD_FUSION_ENERGY_MEV = 3.27; // D+D → He3 + n releases 3.27 MeV
export const INITIAL_PARTICLE_COUNT = 60;
export const INITIAL_TEMPERATURE = 100;
export const INITIAL_CONFINEMENT = 0.2;

// ============================================================
// FÍSICA DE FUSÃO NUCLEAR - CONSTANTES REALISTAS
// ============================================================

// Constantes fundamentais (escala da simulação)
export const BOLTZMANN_CONSTANT = 8.617e-5; // eV/K (para converter temp → energia)
export const PLASMA_TEMPERATURE_SCALE = 1e6; // 1 unidade = 1 milhão Kelvin

// Seção cruzada de fusão (simplificada de dados experimentais)
// Pico da seção cruzada D-T ocorre em ~64 keV
export const DT_CROSS_SECTION_PEAK_KEV = 64;    // keV
export const DT_CROSS_SECTION_MAX = 5.0;        // barns (em escala relativa)
export const DD_CROSS_SECTION_PEAK_KEV = 1250;  // keV (pico muito mais alto)
export const DD_CROSS_SECTION_MAX = 0.096;      // barns (muito menor que D-T)
export const DHE3_CROSS_SECTION_PEAK_KEV = 250; // keV
export const DHE3_CROSS_SECTION_MAX = 0.9;      // barns

// Critério de Lawson para ignição (n*T*τ)
// Para D-T: > 3×10^21 keV·s/m³
export const LAWSON_CRITERION_DT = 3e21;
export const LAWSON_CRITERION_DD = 1e23; // D-D precisa de muito mais

// Barreira de Coulomb (energia mínima para aproximar núcleos)
export const COULOMB_BARRIER_DT_KEV = 400;  // keV
export const COULOMB_BARRIER_DD_KEV = 400;  // keV

// Tunelamento quântico (fator Gamow) - permite fusão abaixo da barreira
export const GAMOW_CONSTANT = 31.39; // (keV)^0.5 para D-T

// Fator Q mínimo para ignição sustentada
export const Q_BREAKEVEN = 1.0;     // Energia out = energia in
export const Q_IGNITION = 5.0;      // Auto-sustentado (ITER target)
export const Q_COMMERCIAL = 10.0;   // Viável comercialmente

// Geometria Sagrada e Constantes Físicas
export const PHI = (1 + Math.sqrt(5)) / 2; // Proporção Áurea (~1.618)
export const R_MAJOR = 3.0; // Raio maior do toroide
export const R_MINOR = 1.2; // Raio menor do toroide

// Orbital System Constants (inspired by Solar System ratios)
// Planetary orbital ratios (Mercury=1): Mercury:1, Venus:1.87, Earth:2.58, Mars:3.93
export const ORBITAL_ZONES = [
  { ratio: 0.15, speed: 0.08 },   // Inner zone (Mercury-like)
  { ratio: 0.25, speed: 0.05 },   // Venus-like
  { ratio: 0.35, speed: 0.035 },  // Earth-like
  { ratio: 0.45, speed: 0.025 },  // Mars-like
  { ratio: 0.55, speed: 0.018 },  // Asteroid belt
  { ratio: 0.65, speed: 0.012 },  // Jupiter-like
  { ratio: 0.75, speed: 0.008 },  // Saturn-like
  { ratio: 0.85, speed: 0.005 },  // Outer zone
];

// Kepler's 3rd Law constant (T² ∝ a³)
export const KEPLER_CONSTANT = 0.001;

// Colors
export const DEUTERIUM_COLOR = '#00c8ff';
export const TRITIUM_COLOR = '#ff6400';
export const HELIUM3_COLOR = '#a855f7';
export const FUSION_FLASH_COLOR = '#ffffff';
export const CONFINEMENT_ZONE_COLOR = 'rgba(49, 79, 128, 0.5)';
export const GOLDEN_LINE_COLOR = 'rgba(255, 215, 0, 0.8)';
