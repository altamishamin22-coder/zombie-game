export type Screen = 'menu' | 'game' | 'shop' | 'settings' | 'achievements' | 'gameover' | 'endless' | 'modifiers' | 'stats' | 'cosmetics' | 'skilltree' | 'practice';
export type BladeId = 'ion' | 'ember' | 'void' | 'cryo' | 'quake' | 'aurora';

export type EntityKind = 'crawler' | 'brute' | 'runner' | 'bomb' | 'fruit' | 'survivor' | 'powerup' | 'boss';
export type PowerKind = 'freeze' | 'multi' | 'shield';

export interface Entity {
  id: number;
  kind: EntityKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  spin: number;
  age: number;
  hit: boolean;
  hp?: number;
  maxHp?: number;
  powerKind?: PowerKind;
}

export interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number; ring?: boolean; }
export interface FloatLabel { x: number; y: number; text: string; color: string; life: number; big?: boolean; }
export interface TrailPoint { x: number; y: number; age: number; }

export interface RunStats {
  score: number;
  combo: number;
  fruitsSliced: number;
  survivorsRescued: number;
  bossesDefeated: number;
  bombsHit: number;
  timeSurvived: number;
  hazardFreeRun: boolean;
}

export interface DailyChallengeState {
  date: string;
  challengeId: string;
  progress: number;
  completed: boolean;
  claimed: boolean;
}

// ============================================================================
// MODIFIERS & ARCADE MODE
// ============================================================================

export type ModifierId = 'chaos' | 'blindfold' | 'doublespeed' | 'ironman' | 'hardcorecombo' | 'slowmo';

export interface Modifier {
  id: ModifierId;
  name: string;
  description: string;
  difficulty: 'easy' | 'normal' | 'hard' | 'extreme';
  scoreMultiplier: number; // 0.5 = half points, 2 = double points
}

export const modifiers: Modifier[] = [
  { id: 'chaos', name: 'CHAOS MODE', description: 'Screen inverts & rotates randomly. Swipe controls flip.', difficulty: 'extreme', scoreMultiplier: 2.5 },
  { id: 'blindfold', name: 'BLINDFOLD', description: 'Entities fade out when far from your swipe.', difficulty: 'hard', scoreMultiplier: 2 },
  { id: 'doublespeed', name: 'DOUBLE SPEED', description: 'All entities move 2x faster.', difficulty: 'hard', scoreMultiplier: 1.8 },
  { id: 'ironman', name: 'IRON MAN', description: '1 life. No continues. One mistake ends it all.', difficulty: 'extreme', scoreMultiplier: 3 },
  { id: 'hardcorecombo', name: 'HARDCORE COMBO', description: 'Combo resets on any non-kill (even power-ups).', difficulty: 'hard', scoreMultiplier: 2 },
  { id: 'slowmo', name: 'SLOW-MO', description: 'Game runs at 0.7x speed. More time to react.', difficulty: 'easy', scoreMultiplier: 0.6 },
];

export function getModifier(id: ModifierId): Modifier {
  return modifiers.find((m) => m.id === id) ?? modifiers[0];
}

// ============================================================================
// SKILL TREE & PROGRESSION
// ============================================================================

export type SkillId = 'combodecay' | 'startlives' | 'powerupboost' | 'coinmultiplier' | 'scoreboost' | 'fruitluck';

export interface Skill {
  id: SkillId;
  name: string;
  description: string;
  cost: number; // XP or coins
  level: number; // 1-3
  effect: string;
}

export const skillTree: Skill[] = [
  { id: 'combodecay', name: 'Combo Decay', description: 'Combo decays 20% slower', cost: 100, level: 1, effect: 'combo_decay_slow' },
  { id: 'startlives', name: 'Fortified', description: '+1 starting life', cost: 200, level: 1, effect: 'start_lives_plus_1' },
  { id: 'powerupboost', name: 'Power Surge', description: 'Power-up duration +25%', cost: 150, level: 1, effect: 'powerup_duration_25' },
  { id: 'coinmultiplier', name: 'Wealth', description: 'Coins earned +20%', cost: 250, level: 1, effect: 'coins_plus_20' },
  { id: 'scoreboost', name: 'Score Ascent', description: 'Score +15%', cost: 200, level: 1, effect: 'score_plus_15' },
  { id: 'fruitluck', name: 'Fruit Luck', description: 'Fruit spawn rate +30%', cost: 180, level: 1, effect: 'fruit_spawn_30' },
];

// ============================================================================
// COSMETICS & CUSTOMIZATION
// ============================================================================

export type TrailStyleId = 'neon' | 'hologram' | 'fire' | 'ice' | 'plasma';
export type HudThemeId = 'default' | 'sunset' | 'ocean' | 'forest' | 'void';
export type ColorBlindModeId = 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia';

export interface TrailStyle {
  id: TrailStyleId;
  name: string;
  colors: string[]; // gradient stops
  unlocked: boolean;
  price: number;
}

export interface HudTheme {
  id: HudThemeId;
  name: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  unlocked: boolean;
  price: number;
}

export const trailStyles: TrailStyle[] = [
  { id: 'neon', name: 'Neon', colors: ['#d3ff35', '#6cffcc'], unlocked: true, price: 0 },
  { id: 'hologram', name: 'Hologram', colors: ['#71e7ef', '#b8fffa', '#8ec9ff'], unlocked: false, price: 250 },
  { id: 'fire', name: 'Fire', colors: ['#ff8247', '#ffbd46', '#ff5d5d'], unlocked: false, price: 350 },
  { id: 'ice', name: 'Ice', colors: ['#8ec9ff', '#d8f0ff', '#71e7ef'], unlocked: false, price: 300 },
  { id: 'plasma', name: 'Plasma', colors: ['#ff5d5d', '#ffd166', '#d3ff35'], unlocked: false, price: 400 },
];

export const hudThemes: HudTheme[] = [
  { id: 'default', name: 'Default', primaryColor: '#d3ff35', accentColor: '#71e7ef', backgroundColor: '#09100f', unlocked: true, price: 0 },
  { id: 'sunset', name: 'Sunset', primaryColor: '#ff8247', accentColor: '#ffd166', backgroundColor: '#1a0f08', unlocked: false, price: 300 },
  { id: 'ocean', name: 'Ocean', primaryColor: '#71e7ef', accentColor: '#8ec9ff', backgroundColor: '#0a1420', unlocked: false, price: 300 },
  { id: 'forest', name: 'Forest', primaryColor: '#8bff7a', accentColor: '#6cffcc', backgroundColor: '#0a140f', unlocked: false, price: 300 },
  { id: 'void', name: 'Void', primaryColor: '#c98bff', accentColor: '#ffd166', backgroundColor: '#0f0515', unlocked: false, price: 400 },
];

// ============================================================================
// STATISTICS & SESSION HISTORY
// ============================================================================

export interface SessionRecord {
  timestamp: number;
  mode: 'normal' | 'endless' | 'arcade' | 'practice';
  modifiers: ModifierId[];
  finalScore: number;
  finalCombo: number;
  finalWave: number;
  duration: number; // seconds
  fruitsSliced: number;
  survivorsRescued: number;
  bossesDefeated: number;
  coinsEarned: number;
  blade: BladeId;
}

export interface LifetimeStats {
  totalRuns: number;
  totalScore: number;
  totalTime: number; // seconds
  totalZombiesSliced: number;
  totalFruitsSliced: number;
  totalSurvisorsRescued: number;
  totalBossesDefeated: number;
  totalCoinsEarned: number;
  averageCombo: number;
  bestRun: SessionRecord | null;
}

// ============================================================================
// SAVED DATA (EXTENDED)
// ============================================================================

export interface SavedData {
  highScore: number;
  coins: number;
  unlocked: BladeId[];
  selected: BladeId;
  muted: boolean;
  musicOn: boolean;
  bestCombo: number;
  sliced: number;
  fruitsSliced: number;
  survivorsRescued: number;
  bossesDefeated: number;
  gamesPlayed: number;
  bestTime: number;
  achievements: string[];
  daily: DailyChallengeState;
  // NEW: Modifiers & Arcade
  arcadeModifiers: ModifierId[];
  // NEW: Skills & Progression
  unlockedSkills: SkillId[];
  skillLevels: Record<SkillId, number>;
  xp: number;
  // NEW: Cosmetics
  unlockedTrails: TrailStyleId[];
  selectedTrail: TrailStyleId;
  unlockedThemes: HudThemeId[];
  selectedTheme: HudThemeId;
  colorBlindMode: ColorBlindModeId;
  // NEW: Statistics
  sessionHistory: SessionRecord[];
  // NEW: Endless Mode
  endlessHighScore: number;
  endlessHighWave: number;
}

export interface Blade {
  id: BladeId;
  name: string;
  detail: string;
  price: number;
  color: string;
  glow: string;
  bonus: string;
}

export const blades: Blade[] = [
  { id: 'ion', name: 'ION EDGE', detail: 'The survivor standard.', price: 0, color: '#d3ff35', glow: '#6cffcc', bonus: 'Balanced' },
  { id: 'ember', name: 'EMBER ARC', detail: 'Forged in the subway fires.', price: 360, color: '#ff8247', glow: '#ffbd46', bonus: '+12% score' },
  { id: 'void', name: 'VOID RELIC', detail: 'It hums when the dead get close.', price: 900, color: '#71e7ef', glow: '#b8fffa', bonus: '+1 starting life' },
  { id: 'cryo', name: 'CRYO FANG', detail: 'Cold enough to slow the night.', price: 1500, color: '#8ec9ff', glow: '#d8f0ff', bonus: 'Power-ups last 50% longer' },
  { id: 'quake', name: 'QUAKE SPLITTER', detail: 'Recovered from the collapse.', price: 2200, color: '#c98bff', glow: '#efd9ff', bonus: 'First hazard per run is absorbed' },
  { id: 'aurora', name: 'AURORA VEIL', detail: 'Salvage sings when it passes by.', price: 3200, color: '#ffd166', glow: '#fff2c9', bonus: '+30% coins from fruit' },
];

export function getBlade(id: BladeId): Blade {
  return blades.find((b) => b.id === id) ?? blades[0];
}

export interface Achievement {
  id: string;
  title: string;
  detail: string;
  reward: number;
}

export const achievements: Achievement[] = [
  { id: 'first_blood', title: 'FIRST BLOOD', detail: 'Slice your first zombie.', reward: 20 },
  { id: 'combo_10', title: 'CHAIN REACTION', detail: 'Reach a 10x combo in one run.', reward: 40 },
  { id: 'combo_25', title: 'UNSTOPPABLE', detail: 'Reach a 25x combo in one run.', reward: 100 },
  { id: 'rescue_1', title: 'GOOD SAMARITAN', detail: 'Rescue a survivor.', reward: 40 },
  { id: 'rescue_10', title: 'PROTECTOR', detail: 'Rescue 10 survivors total.', reward: 120 },
  { id: 'fruit_50', title: 'FRUIT FANATIC', detail: 'Slice 50 pieces of fruit total.', reward: 60 },
  { id: 'boss_1', title: 'BOSS SLAYER', detail: 'Defeat a boss wave.', reward: 150 },
  { id: 'score_5000', title: 'HIGH SCORER', detail: 'Score 5,000 in a single run.', reward: 150 },
  { id: 'score_15000', title: 'LEGEND OF THE NIGHT', detail: 'Score 15,000 in a single run.', reward: 400 },
  { id: 'collector', title: 'BLADE COLLECTOR', detail: 'Unlock every blade.', reward: 300 },
  { id: 'survivor_time', title: 'NIGHT OWL', detail: 'Survive 3 minutes in a single run.', reward: 150 },
  { id: 'flawless', title: 'FLAWLESS', detail: 'Defeat a boss without losing a life that run.', reward: 200 },
];

export interface DailyChallengeDef {
  id: string;
  title: string;
  detail: string;
  target: number;
  reward: number;
  metric: 'sliced' | 'combo' | 'fruit' | 'score' | 'rescues';
}

export const dailyChallengePool: DailyChallengeDef[] = [
  { id: 'slice_60', title: 'CULL THE HORDE', detail: 'Slice 60 zombies in a single run.', target: 60, reward: 80, metric: 'sliced' },
  { id: 'combo_15', title: 'PERFECT CHAIN', detail: 'Reach a 15x combo in a single run.', target: 15, reward: 90, metric: 'combo' },
  { id: 'fruit_20', title: 'FRESH SUPPLY', detail: 'Slice 20 pieces of fruit in a single run.', target: 20, reward: 70, metric: 'fruit' },
  { id: 'score_3000', title: 'SIGNAL BOOST', detail: 'Score 3,000 points in a single run.', target: 3000, reward: 100, metric: 'score' },
  { id: 'rescue_3', title: 'RAPID RESCUE', detail: 'Rescue 3 survivors in a single run.', target: 3, reward: 90, metric: 'rescues' },
];

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function getTodaysChallenge(): { key: string; def: DailyChallengeDef } {
  const today = new Date();
  const key = dayKey(today);
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  const def = dailyChallengePool[dayOfYear % dailyChallengePool.length];
  return { key, def };
}

export const STORAGE_KEY = 'zombie-slice-save-v3';

export const defaultSave: SavedData = {
  highScore: 0,
  coins: 120,
  unlocked: ['ion'],
  selected: 'ion',
  muted: false,
  musicOn: true,
  bestCombo: 0,
  sliced: 0,
  fruitsSliced: 0,
  survivorsRescued: 0,
  bossesDefeated: 0,
  gamesPlayed: 0,
  bestTime: 0,
  achievements: [],
  daily: { date: '', challengeId: '', progress: 0, completed: false, claimed: false },
  arcadeModifiers: [],
  unlockedSkills: [],
  skillLevels: {},
  xp: 0,
  unlockedTrails: ['neon'],
  selectedTrail: 'neon',
  unlockedThemes: ['default'],
  selectedTheme: 'default',
  colorBlindMode: 'none',
  sessionHistory: [],
  endlessHighScore: 0,
  endlessHighWave: 0,
};

export function readSave(): SavedData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultSave };
    const parsed = JSON.parse(raw) as Partial<SavedData>;
    return {
      ...defaultSave,
      ...parsed,
      unlocked: parsed.unlocked?.length ? parsed.unlocked : ['ion'],
      achievements: parsed.achievements ?? [],
      daily: parsed.daily ?? { ...defaultSave.daily },
      arcadeModifiers: parsed.arcadeModifiers ?? [],
      unlockedSkills: parsed.unlockedSkills ?? [],
      skillLevels: parsed.skillLevels ?? {},
      unlockedTrails: parsed.unlockedTrails ?? ['neon'],
      unlockedThemes: parsed.unlockedThemes ?? ['default'],
      sessionHistory: parsed.sessionHistory ?? [],
    };
  } catch {
    return { ...defaultSave };
  }
}

export function saveGame(data: SavedData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage unavailable — ignore
  }
}

export function formatNumber(value: number) {
  return Math.floor(value).toLocaleString('en-US');
}

export function calculateLifetimeStats(save: SavedData): LifetimeStats {
  const totalTime = save.sessionHistory.reduce((sum, s) => sum + s.duration, 0);
  const totalScore = save.sessionHistory.reduce((sum, s) => sum + s.finalScore, 0);
  const totalZombies = save.sessionHistory.reduce((sum, s) => sum + (s.finalScore / 20), 0); // rough estimate
  const avgCombo = save.sessionHistory.length > 0 ? save.sessionHistory.reduce((sum, s) => sum + s.finalCombo, 0) / save.sessionHistory.length : 0;
  const bestRun = save.sessionHistory.length > 0 ? save.sessionHistory.reduce((best, s) => s.finalScore > best.finalScore ? s : best) : null;

  return {
    totalRuns: save.gamesPlayed,
    totalScore,
    totalTime,
    totalZombiesSliced: save.sliced,
    totalFruitsSliced: save.fruitsSliced,
    totalSurvisorsRescued: save.survivorsRescued,
    totalBossesDefeated: save.bossesDefeated,
    totalCoinsEarned: save.coins,
    averageCombo: avgCombo,
    bestRun,
  };
}
