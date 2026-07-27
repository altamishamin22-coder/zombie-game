export type Screen = 'menu' | 'game' | 'shop' | 'settings' | 'achievements' | 'gameover';
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

export interface SavedData {
  highScore: number;
  highScores: Record<DifficultyId, number>;
  coins: number;
  unlocked: BladeId[];
  selected: BladeId;
  difficulty: DifficultyId;
  muted: boolean;
  musicOn: boolean;
  hapticsOn: boolean;
  bestCombo: number;
  sliced: number;
  fruitsSliced: number;
  survivorsRescued: number;
  bossesDefeated: number;
  gamesPlayed: number;
  bestTime: number;
  achievements: string[];
  daily: DailyChallengeState;
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
  { id: 'hard_wave_10', title: 'HARDENED', detail: 'Reach wave 10 on Hard difficulty or above.', reward: 180 },
  { id: 'nightmare_boss', title: 'NIGHTMARE FUEL', detail: 'Defeat a boss on Nightmare difficulty.', reward: 350 },
];

// ---------------------------------------------------------------------------
// Difficulty modes
// ---------------------------------------------------------------------------

export type DifficultyId = 'easy' | 'normal' | 'hard' | 'nightmare';

export interface Difficulty {
  id: DifficultyId;
  label: string;
  detail: string;
  spawnMult: number;
  bombMult: number;
  speedMult: number;
  scoreMult: number;
  waveMult: number;
  livesDelta: number;
  color: string;
}

export const difficulties: Difficulty[] = [
  { id: 'easy', label: 'EASY', detail: 'Slower horde, forgiving hazards.', spawnMult: 0.8, bombMult: 0.6, speedMult: 0.85, scoreMult: 0.8, waveMult: 0.85, livesDelta: 1, color: '#8bff7a' },
  { id: 'normal', label: 'NORMAL', detail: 'The standard broadcast.', spawnMult: 1, bombMult: 1, speedMult: 1, scoreMult: 1, waveMult: 1, livesDelta: 0, color: '#d3ff35' },
  { id: 'hard', label: 'HARD', detail: 'Faster horde, more hazards.', spawnMult: 1.25, bombMult: 1.35, speedMult: 1.15, scoreMult: 1.25, waveMult: 1.15, livesDelta: 0, color: '#ff8247' },
  { id: 'nightmare', label: 'NIGHTMARE', detail: 'Relentless. High risk, high reward.', spawnMult: 1.5, bombMult: 1.7, speedMult: 1.3, scoreMult: 1.6, waveMult: 1.35, livesDelta: -1, color: '#ff5d5d' },
];

export function getDifficulty(id: DifficultyId): Difficulty {
  return difficulties.find((d) => d.id === id) ?? difficulties[1];
}

export function defaultHighScores(): Record<DifficultyId, number> {
  return { easy: 0, normal: 0, hard: 0, nightmare: 0 };
}

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

export const STORAGE_KEY = 'zombie-slice-save-v2';

export const defaultSave: SavedData = {
  highScore: 0,
  highScores: defaultHighScores(),
  coins: 120,
  unlocked: ['ion'],
  selected: 'ion',
  difficulty: 'normal',
  muted: false,
  musicOn: true,
  hapticsOn: true,
  bestCombo: 0,
  sliced: 0,
  fruitsSliced: 0,
  survivorsRescued: 0,
  bossesDefeated: 0,
  gamesPlayed: 0,
  bestTime: 0,
  achievements: [],
  daily: { date: '', challengeId: '', progress: 0, completed: false, claimed: false },
};

export function readSave(): SavedData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultSave };
    const parsed = JSON.parse(raw) as Partial<SavedData>;
    const highScores = { ...defaultHighScores(), ...(parsed.highScores ?? {}) };
    // Older saves only tracked a single highScore — migrate it into "normal".
    if (!parsed.highScores && parsed.highScore) highScores.normal = Math.max(highScores.normal, parsed.highScore);
    return {
      ...defaultSave,
      ...parsed,
      unlocked: parsed.unlocked?.length ? parsed.unlocked : ['ion'],
      achievements: parsed.achievements ?? [],
      daily: parsed.daily ?? { ...defaultSave.daily },
      highScores,
      difficulty: parsed.difficulty ?? 'normal',
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
