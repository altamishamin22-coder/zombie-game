import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent, ReactNode } from 'react';
import {
  ArrowLeft, Award, Coins, Crosshair, Flame, Heart, Info, LockKeyhole, Pause, Play, RotateCcw,
  Settings2, Shield, ShoppingBag, Snowflake, Sparkles, Swords, Target, Timer, Trophy, Volume2, VolumeX, Zap,
} from 'lucide-react';
import {
  type Achievement, type BladeId, type DailyChallengeDef, type Entity, type EntityKind,
  type FloatLabel, type Particle, type PowerKind, type SavedData, type Screen, type TrailPoint,
  achievements, blades, defaultSave, formatNumber, getBlade, getTodaysChallenge,
  readSave, saveGame,
} from '@/lib/gameData';
import { resumeAudio, setMuted, sfx, startMusic, stopMusic } from '@/lib/audio';

// ---------------------------------------------------------------------------
// Save helpers that live alongside the component tree (need React-free logic
// shared by multiple screens).
// ---------------------------------------------------------------------------

function ensureDailyFresh(save: SavedData): SavedData {
  const { key, def } = getTodaysChallenge();
  if (save.daily.date === key && save.daily.challengeId === def.id) return save;
  return { ...save, daily: { date: key, challengeId: def.id, progress: 0, completed: false, claimed: false } };
}

function unlockAchievements(save: SavedData, ids: string[]): { save: SavedData; unlocked: Achievement[] } {
  const fresh = ids.filter((id) => !save.achievements.includes(id));
  if (!fresh.length) return { save, unlocked: [] };
  const unlockedDefs = fresh.map((id) => achievements.find((a) => a.id === id)).filter(Boolean) as Achievement[];
  const rewardTotal = unlockedDefs.reduce((sum, a) => sum + a.reward, 0);
  const next: SavedData = { ...save, achievements: [...save.achievements, ...fresh], coins: save.coins + rewardTotal };
  return { save: next, unlocked: unlockedDefs };
}

interface RunStats {
  fruitsSliced: number;
  survivorsRescued: number;
  bossesDefeated: number;
  tookDamage: boolean;
}

interface Effects { freezeUntil: number; multiUntil: number; shieldCount: number; hazardAbsorbed: boolean; }

interface GameState {
  entities: Entity[];
  particles: Particle[];
  labels: FloatLabel[];
  trail: TrailPoint[];
  width: number;
  height: number;
  score: number;
  combo: number;
  lives: number;
  wave: number;
  time: number;
  spawn: number;
  nextId: number;
  last: number;
  previousPoint: { x: number; y: number } | null;
  shake: number;
  running: boolean;
  gameOver: boolean;
  elapsed: number;
  effects: Effects;
  bossActive: boolean;
  bossWaveHandled: number;
  runStats: RunStats;
  runCoins: number;
  dailyProgress: number;
}

function freshState(maxLives: number): GameState {
  return {
    entities: [], particles: [], labels: [], trail: [],
    width: 0, height: 0, score: 0, combo: 0, lives: maxLives, wave: 1, time: 0,
    spawn: 20, nextId: 0, last: 0, previousPoint: null, shake: 0, running: true, gameOver: false, elapsed: 0,
    effects: { freezeUntil: 0, multiUntil: 0, shieldCount: 0, hazardAbsorbed: false },
    bossActive: false, bossWaveHandled: 0,
    runStats: { fruitsSliced: 0, survivorsRescued: 0, bossesDefeated: 0, tookDamage: false },
    runCoins: 0, dailyProgress: 0,
  };
}

function maxLivesFor(bladeId: BladeId) {
  return bladeId === 'void' ? 4 : 3;
}

function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const length = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

// ---------------------------------------------------------------------------
// Achievement toast stack — small reusable notification queue
// ---------------------------------------------------------------------------

function AchievementToastStack({ queue }: { queue: { key: number; achievement: Achievement }[] }) {
  if (!queue.length) return null;
  return (
    <div className="pointer-events-none fixed left-1/2 top-6 z-[70] flex -translate-x-1/2 flex-col items-center gap-2">
      {queue.map(({ key, achievement }) => (
        <div key={key} className="animate-rise-in flex items-center gap-3 border border-[#ffbd46]/60 bg-[#0d1717]/95 px-5 py-3 shadow-[0_10px_50px_rgba(0,0,0,.5)]">
          <div className="grid h-9 w-9 shrink-0 place-items-center border border-[#ffbd46] bg-[#ffbd46]/10 text-[#ffbd46]"><Award className="h-5 w-5" /></div>
          <div>
            <div className="font-mono-app text-[9px] uppercase tracking-[.24em] text-[#ffbd46]">Achievement unlocked</div>
            <div className="font-display text-lg font-bold tracking-[.05em] text-[#f3f2df]">{achievement.title}</div>
          </div>
          <div className="ml-2 flex items-center gap-1 font-mono-app text-xs text-[#ffbd46]"><Coins className="h-3.5 w-3.5" />+{achievement.reward}</div>
        </div>
      ))}
    </div>
  );
}

function useAchievementToasts() {
  const [queue, setQueue] = useState<{ key: number; achievement: Achievement }[]>([]);
  const idRef = useRef(0);
  const push = useCallback((list: Achievement[]) => {
    if (!list.length) return;
    sfx.achievement();
    const entries = list.map((achievement) => ({ key: idRef.current++, achievement }));
    setQueue((old) => [...old, ...entries]);
    entries.forEach((entry) => {
      window.setTimeout(() => setQueue((old) => old.filter((item) => item.key !== entry.key)), 3400);
    });
  }, []);
  return { queue, push };
}

// ---------------------------------------------------------------------------
// Screen fade wrapper — subtle cross-fade whenever the active screen changes
// ---------------------------------------------------------------------------

function ScreenFade({ screenKey, children }: { screenKey: string; children: ReactNode }) {
  return <div key={screenKey} className="animate-screen-in h-full">{children}</div>;
}

// ---------------------------------------------------------------------------
// PWA install prompt (unchanged behavior, sound on install accept)
// ---------------------------------------------------------------------------

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

function isStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function InstallPrompt({ visible }: { visible: boolean }) {
  const deferredPromptRef = useRef<InstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    if (isStandaloneMode() || localStorage.getItem('zombie-slice-install-dismissed') === '1') return;
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      deferredPromptRef.current = event as InstallPromptEvent;
    };
    const onInstalled = () => { deferredPromptRef.current = null; setShowPrompt(false); };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    const timer = window.setTimeout(() => { if (isIos || deferredPromptRef.current) setShowPrompt(true); }, 2200);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  useEffect(() => { if (!visible) setShowPrompt(false); }, [visible]);

  if (!visible || (!showPrompt && !showInstructions)) return null;
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const install = async () => {
    if (isIos || !deferredPromptRef.current) { setShowPrompt(false); setShowInstructions(true); return; }
    await deferredPromptRef.current.prompt();
    const choice = await deferredPromptRef.current.userChoice;
    if (choice.outcome === 'accepted') { sfx.uiConfirm(); setShowPrompt(false); }
    deferredPromptRef.current = null;
  };
  const dismiss = () => { setShowPrompt(false); setShowInstructions(false); localStorage.setItem('zombie-slice-install-dismissed', '1'); };

  return (
    <>
      {showPrompt && (
        <div className="install-prompt fixed inset-x-4 bottom-5 z-[60] sm:inset-auto sm:bottom-8 sm:right-10 sm:w-[340px]" role="dialog" aria-label="Install Zombie Slice">
          <div className="border border-[#d3ff35]/55 bg-[#0b1716]/[.97] p-4 shadow-[0_18px_70px_rgba(0,0,0,.5)] backdrop-blur-md">
            <div className="flex items-start gap-3">
              <div className="install-prompt-icon grid h-11 w-11 shrink-0 place-items-center border border-[#d3ff35]/60 bg-[#d3ff35]/10 font-display text-xl font-black text-[#d3ff35]">ZS</div>
              <div className="min-w-0 flex-1">
                <div className="font-mono-app text-[9px] uppercase tracking-[.24em] text-[#71e7ef]">Field kit ready</div>
                <h2 className="mt-1 font-display text-2xl font-bold uppercase tracking-[.08em] text-[#f3f2df]">Install the game</h2>
                <p className="mt-1 font-mono-app text-[10px] leading-5 text-[#9aa99b]">Launch faster from your phone with a full-screen icon and no browser chrome.</p>
              </div>
              <button type="button" aria-label="Dismiss install prompt" onClick={dismiss} className="text-[#71847a] hover:text-[#f3f2df]">×</button>
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={install} className="flex-1 bg-[#d3ff35] py-3 font-display text-base font-bold tracking-[.12em] text-[#10180d] transition hover:bg-[#e3ff82]">INSTALL GAME</button>
              <button type="button" onClick={dismiss} className="border border-[#3e5448] px-4 font-mono-app text-[9px] uppercase tracking-[.12em] text-[#9aa99b] hover:border-[#71e7ef] hover:text-[#71e7ef]">Later</button>
            </div>
          </div>
        </div>
      )}
      {showInstructions && (
        <div className="install-prompt fixed inset-x-4 bottom-5 z-[60] sm:inset-auto sm:bottom-8 sm:right-10 sm:w-[340px]" role="dialog" aria-label="Phone installation instructions">
          <div className="border border-[#71e7ef]/50 bg-[#0b1716]/[.97] p-5 shadow-[0_18px_70px_rgba(0,0,0,.5)] backdrop-blur-md">
            <div className="font-mono-app text-[9px] uppercase tracking-[.24em] text-[#71e7ef]">Phone install guide</div>
            <h2 className="mt-2 font-display text-3xl font-bold uppercase tracking-[.06em] text-[#f3f2df]">{isIos ? 'Add to Home Screen' : 'Install from your browser'}</h2>
            <p className="mt-3 font-mono-app text-[10px] leading-5 text-[#9aa99b]">{isIos ? 'Tap the Share button in Safari, then choose "Add to Home Screen" and confirm.' : 'Open your browser menu and choose "Install app" or "Add to Home screen" to keep Zombie Slice one tap away.'}</p>
            <button type="button" onClick={dismiss} className="mt-4 w-full border border-[#3e5448] py-3 font-display text-base font-bold tracking-[.12em] text-[#d8ddc9] hover:border-[#d3ff35] hover:text-[#d3ff35]">GOT IT</button>
          </div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Shared decorative pieces
// ---------------------------------------------------------------------------

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${compact ? 'scale-90 origin-left' : ''}`}>
      <div className="relative grid h-10 w-10 place-items-center border border-[#d3ff35]/60 bg-[#d3ff35]/10 shadow-[0_0_24px_rgba(211,255,53,.18)]">
        <Swords className="h-5 w-5 text-[#d3ff35]" strokeWidth={1.5} />
        <span className="absolute -right-1 -top-1 h-1.5 w-1.5 bg-[#ff8247]" />
      </div>
      <div className="leading-none">
        <div className="font-display text-[25px] font-extrabold tracking-[.08em] text-[#f3f2df]">ZOMBIE</div>
        <div className="font-display text-[25px] font-extrabold tracking-[.18em] text-[#d3ff35]">SLICE</div>
      </div>
    </div>
  );
}

function StatChip({ icon, label, value, accent = 'lime' }: { icon: ReactNode; label: string; value: string | number; accent?: 'lime' | 'orange' | 'cyan' }) {
  const color = accent === 'orange' ? '#ff8247' : accent === 'cyan' ? '#71e7ef' : '#d3ff35';
  return (
    <div className="flex items-center gap-2 border-l border-[#30433c] pl-3">
      <span style={{ color }}>{icon}</span>
      <div>
        <div className="font-mono-app text-[9px] uppercase tracking-[.2em] text-[#71847a]">{label}</div>
        <div className="font-display text-xl font-bold leading-none text-[#f3f2df]">{value}</div>
      </div>
    </div>
  );
}

function CityBackdrop({ dense = false }: { dense?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_85%,rgba(31,78,63,.52),transparent_52%),linear-gradient(180deg,#101729_0%,#111524_54%,#08100f_100%)]" />
      <div className="absolute left-[9%] top-[18%] h-24 w-28 border-x border-t border-[#34434c]/40 bg-[#121b2a]/60" />
      <div className="absolute left-[11%] top-[26%] h-1 w-2 bg-[#d3ff35]/60 shadow-[12px_0_#d3ff35,24px_0_rgba(211,255,53,.3),12px_23px_rgba(255,130,71,.45),36px_23px_rgba(211,255,53,.3)]" />
      <div className="absolute right-[7%] top-[12%] h-40 w-36 border-x border-t border-[#34434c]/40 bg-[#111a29]/70" />
      <div className="absolute right-[11%] top-[22%] h-1 w-2 bg-[#ff8247]/60 shadow-[12px_0_rgba(255,130,71,.45),24px_0_#d3ff35,12px_31px_rgba(211,255,53,.3),36px_31px_rgba(255,130,71,.25)]" />
      <div className="absolute bottom-[12%] left-[-4%] h-[30%] w-[108%] skew-x-[-18deg] border-t border-[#31433e]/75 bg-[#101b1d]/90" />
      <div className="absolute bottom-[12%] left-[-4%] h-px w-[108%] bg-[#d3ff35]/20 shadow-[0_8px_0_rgba(211,255,53,.07),0_22px_0_rgba(211,255,53,.05)]" />
      <div className="absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(180deg,transparent,#070c0d)]" />
      <div className="absolute inset-0 opacity-[.22]" style={{ backgroundImage: 'linear-gradient(116deg, transparent 0 48%, rgba(142,191,192,.32) 49%, transparent 50%), linear-gradient(102deg, transparent 0 72%, rgba(142,191,192,.2) 73%, transparent 74%)', backgroundSize: dense ? '240px 160px, 340px 210px' : '320px 180px, 410px 260px' }} />
      <div className="absolute inset-x-0 top-0 h-1/2 bg-[radial-gradient(ellipse_at_50%_0%,rgba(86,147,147,.11),transparent_70%)]" />
    </div>
  );
}

function DailyChallengeCard({ save, def }: { save: SavedData; def: DailyChallengeDef }) {
  const progress = Math.min(1, save.daily.progress / def.target);
  return (
    <div className="w-full max-w-md border border-[#30433c] bg-[#0d1717]/85 p-4 animate-rise-in" style={{ animationDelay: '360ms' }}>
      <div className="flex items-center justify-between">
        <div className="font-mono-app text-[9px] uppercase tracking-[.26em] text-[#ff8247]">Daily broadcast</div>
        {save.daily.completed && <span className="font-mono-app text-[9px] uppercase tracking-[.2em] text-[#d3ff35]">Complete +{def.reward}c</span>}
      </div>
      <div className="mt-1 font-display text-xl font-bold tracking-[.05em] text-[#f3f2df]">{def.title}</div>
      <div className="mt-0.5 font-mono-app text-[10px] text-[#8da095]">{def.detail}</div>
      <div className="mt-3 h-1.5 w-full bg-[#232f28]">
        <div className="h-full bg-[#ff8247] transition-all" style={{ width: `${progress * 100}%`, boxShadow: '0 0 10px rgba(255,130,71,.6)' }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------

function Menu({ save, setSave, setScreen, firstRun, setFirstRun }: { save: SavedData; setScreen: (screen: Screen) => void; setSave: (value: SavedData) => void; firstRun: boolean; setFirstRun: (value: boolean) => void }) {
  const { def } = useMemo(() => getTodaysChallenge(), []);
  const handlePlay = () => {
    resumeAudio();
    sfx.uiConfirm();
    setFirstRun(false);
    localStorage.setItem('zombie-slice-seen', '1');
    setScreen('game');
  };
  const nav = (screen: Screen) => { sfx.uiClick(); setScreen(screen); };
  const resetProgress = () => {
    if (window.confirm('Reset all run data, achievements, and unlocked blades?')) {
      setSave(defaultSave);
      saveGame(defaultSave);
    }
  };
  return (
    <main className="noise-overlay relative min-h-[100dvh] overflow-hidden bg-[#09100f]">
      <CityBackdrop />
      <div className="mobile-menu-shell relative z-10 mx-auto flex min-h-[100dvh] max-w-[1440px] flex-col px-6 py-6 sm:px-10 sm:py-8">
        <header className="flex items-start justify-between">
          <Logo />
          <div className="flex items-center gap-5">
            <div className="hidden text-right sm:block">
              <div className="font-mono-app text-[9px] tracking-[.23em] text-[#71847a]">RUN RECORD</div>
              <div className="font-display text-2xl font-bold text-[#f3f2df]">{formatNumber(save.highScore)}</div>
            </div>
            <div className="flex items-center gap-2 border border-[#3e4e41] bg-[#0d1717]/85 px-3 py-2">
              <Coins className="h-4 w-4 text-[#ffbd46]" />
              <span className="font-mono-app text-sm text-[#ffbd46]">{formatNumber(save.coins)}</span>
            </div>
          </div>
        </header>

        <section className="mobile-menu-content flex flex-1 items-center py-14 sm:py-20">
          <div className="max-w-2xl">
            <div className="mb-6 flex items-center gap-3 font-mono-app text-[10px] uppercase tracking-[.34em] text-[#71e7ef] animate-rise-in">
              <span className="h-px w-12 bg-[#71e7ef]" /> Sector 07 / Last signal received
            </div>
            <h1 className="mobile-hero-title font-display text-[clamp(5rem,15vw,12.5rem)] font-black uppercase leading-[.77] tracking-[-.04em] text-[#f3f2df] [text-shadow:8px_12px_0_rgba(21,35,37,.8)] animate-rise-in" style={{ animationDelay: '80ms' }}>
              Cut<br /><span className="text-[#d3ff35]">through</span>
            </h1>
            <p className="mt-8 max-w-md border-l-2 border-[#ff8247] pl-4 font-mono-app text-xs leading-6 text-[#a9b3a1] animate-rise-in" style={{ animationDelay: '160ms' }}>
              The dead are learning to jump. Slice fruit for salvage, rescue survivors, and don't let the boss waves catch you flat-footed.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4 animate-rise-in" style={{ animationDelay: '240ms' }}>
              <button type="button" data-testid="button-play" onClick={handlePlay} className="group relative flex items-center gap-4 bg-[#d3ff35] px-7 py-4 font-display text-xl font-extrabold tracking-[.16em] text-[#10180d] transition hover:-translate-y-1 hover:bg-[#e3ff82] active:translate-y-0">
                <Play className="h-5 w-5 fill-current" /> ENTER THE NIGHT
                <span className="absolute -bottom-1 -right-1 h-2 w-2 bg-[#ff8247]" />
              </button>
              <button type="button" data-testid="button-shop" onClick={() => nav('shop')} className="flex items-center gap-3 border border-[#3e5448] bg-[#0d1717]/80 px-6 py-4 font-display text-lg font-bold tracking-[.14em] text-[#d8ddc9] transition hover:border-[#d3ff35] hover:text-[#d3ff35]">
                <ShoppingBag className="h-5 w-5" /> LOADOUT
              </button>
              <button type="button" data-testid="button-achievements" onClick={() => nav('achievements')} className="flex items-center gap-3 border border-[#3e5448] bg-[#0d1717]/80 px-6 py-4 font-display text-lg font-bold tracking-[.14em] text-[#d8ddc9] transition hover:border-[#ffbd46] hover:text-[#ffbd46]">
                <Award className="h-5 w-5" /> AWARDS
              </button>
            </div>
            <div className="mt-10 animate-rise-in" style={{ animationDelay: '300ms' }}>
              <DailyChallengeCard save={save} def={def} />
            </div>
            <div className="mt-8 flex items-center gap-8 animate-rise-in" style={{ animationDelay: '360ms' }}>
              <StatChip icon={<Trophy className="h-4 w-4" />} label="best run" value={formatNumber(save.highScore)} />
              <StatChip icon={<Zap className="h-4 w-4" />} label="best combo" value={`${save.bestCombo}x`} accent="orange" />
              <button type="button" data-testid="button-settings" onClick={() => nav('settings')} className="ml-auto border border-[#30433c] p-3 text-[#80958a] transition hover:border-[#71e7ef] hover:text-[#71e7ef]"><Settings2 className="h-5 w-5" /></button>
            </div>
          </div>
        </section>
        <footer className="flex flex-col justify-between gap-3 border-t border-[#293932] pt-4 font-mono-app text-[9px] uppercase tracking-[.22em] text-[#64766d] sm:flex-row">
          <span>Blade protocol // v.3.0</span>
          <span>Survivors online: <b className="text-[#d3ff35]">04</b> · Storm front: <b className="text-[#ff8247]">incoming</b></span>
        </footer>
      </div>
      {firstRun && (
        <div className="mobile-first-signal absolute bottom-20 right-6 z-20 max-w-[245px] border border-[#71e7ef]/40 bg-[#0d1c20]/95 p-4 shadow-[0_0_30px_rgba(113,231,239,.1)] sm:right-10">
          <div className="mb-2 flex items-center gap-2 font-display text-lg font-bold tracking-[.08em] text-[#71e7ef]"><Info className="h-4 w-4" /> FIRST SIGNAL</div>
          <p className="font-mono-app text-[10px] leading-5 text-[#a9b3a1]">Swipe zombies to slice them, fruit for salvage, and golden survivors to rescue them. Watch for bombs — and boss waves every few rounds.</p>
          <div className="mt-3 h-px w-full bg-[#71e7ef]/25" />
          <button type="button" data-testid="button-dismiss-tutorial" onClick={() => setFirstRun(false)} className="mt-3 font-mono-app text-[9px] uppercase tracking-[.18em] text-[#d3ff35] hover:underline">Got it / continue</button>
        </div>
      )}
      <button type="button" data-testid="button-reset-progress" onClick={resetProgress} className="absolute bottom-5 right-6 z-10 font-mono-app text-[8px] uppercase tracking-[.2em] text-[#405148] hover:text-[#71847a] sm:right-10">clear local record</button>
      <div className="pointer-events-none absolute left-[54%] top-[26%] hidden h-40 w-40 rounded-full bg-[#ff8247]/10 blur-3xl sm:block" />
    </main>
  );
}

// ---------------------------------------------------------------------------
// Shop
// ---------------------------------------------------------------------------

function Shop({ save, setSave, setScreen }: { save: SavedData; setSave: (value: SavedData) => void; setScreen: (screen: Screen) => void }) {
  const [toasts, setToasts] = useState<{ key: number; achievement: Achievement }[]>([]);
  const toastId = useRef(0);
  const pushToasts = (list: Achievement[]) => {
    if (!list.length) return;
    sfx.achievement();
    const entries = list.map((achievement) => ({ key: toastId.current++, achievement }));
    setToasts((old) => [...old, ...entries]);
    entries.forEach((entry) => window.setTimeout(() => setToasts((old) => old.filter((item) => item.key !== entry.key)), 3400));
  };
  const buyOrEquip = (blade: typeof blades[number]) => {
    if (save.unlocked.includes(blade.id)) {
      sfx.uiClick();
      const next = { ...save, selected: blade.id };
      setSave(next); saveGame(next);
      return;
    }
    if (save.coins >= blade.price) {
      sfx.uiConfirm();
      let next = { ...save, coins: save.coins - blade.price, unlocked: [...save.unlocked, blade.id], selected: blade.id };
      if (next.unlocked.length === blades.length) {
        const result = unlockAchievements(next, ['collector']);
        next = result.save;
        pushToasts(result.unlocked);
      }
      setSave(next); saveGame(next);
    }
  };
  return (
    <main className="noise-overlay relative min-h-[100dvh] overflow-hidden bg-[#09100f]">
      <CityBackdrop dense />
      <AchievementToastStack queue={toasts} />
      <div className="relative z-10 mx-auto min-h-[100dvh] max-w-6xl px-6 py-6 sm:px-10 sm:py-8">
        <header className="flex items-center justify-between">
          <button type="button" data-testid="button-shop-back" onClick={() => setScreen('menu')} className="flex items-center gap-2 font-mono-app text-[10px] uppercase tracking-[.2em] text-[#71847a] transition hover:text-[#d3ff35]"><ArrowLeft className="h-4 w-4" /> Back to base</button>
          <div className="flex items-center gap-2 border border-[#3e4e41] bg-[#0d1717]/85 px-3 py-2"><Coins className="h-4 w-4 text-[#ffbd46]" /><span className="font-mono-app text-sm text-[#ffbd46]">{formatNumber(save.coins)}</span></div>
        </header>
        <div className="mt-16 max-w-2xl">
          <div className="font-mono-app text-[10px] uppercase tracking-[.35em] text-[#ff8247]">Armory / recovered tech</div>
           <h1 className="mobile-shop-title mt-2 font-display text-7xl font-black uppercase leading-none tracking-[-.03em] text-[#f3f2df] sm:text-9xl">Choose<br /><span className="text-[#d3ff35]">your edge.</span></h1>
          <p className="mt-6 max-w-md font-mono-app text-xs leading-6 text-[#9aa99b]">Every blade leaves a different mark. The right one gets you through wave ten — and beyond.</p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {blades.map((blade, index) => {
            const unlocked = save.unlocked.includes(blade.id);
            const selected = save.selected === blade.id;
            return (
              <button type="button" data-testid={`button-blade-${blade.id}`} key={blade.id} onClick={() => buyOrEquip(blade)} className={`group relative min-h-[340px] overflow-hidden border p-5 text-left transition hover:-translate-y-2 ${selected ? 'border-[#d3ff35] bg-[#162218]' : 'border-[#30433c] bg-[#0d1717]/90 hover:border-[#71847a]'}`}>
                <div className="absolute right-[-25%] top-[-10%] h-52 w-52 rounded-full opacity-10 blur-3xl" style={{ backgroundColor: blade.glow }} />
                <div className="flex items-start justify-between"><span className="font-mono-app text-[9px] tracking-[.25em] text-[#61746b]">MK-{String(index + 1).padStart(2, '0')}</span>{selected ? <span className="font-mono-app text-[9px] uppercase tracking-[.16em] text-[#d3ff35]">Equipped</span> : unlocked ? <span className="font-mono-app text-[9px] uppercase tracking-[.16em] text-[#71e7ef]">Owned</span> : <LockKeyhole className="h-4 w-4 text-[#61746b]" />}</div>
                <div className="relative mx-auto my-10 h-28 w-16 rotate-[35deg]">
                  <div className="absolute left-1/2 top-0 h-24 w-2 -translate-x-1/2 rounded-full" style={{ background: `linear-gradient(180deg, ${blade.color}, ${blade.glow}, transparent)`, boxShadow: `0 0 18px ${blade.color}` }} />
                  <div className="absolute bottom-0 left-1/2 h-10 w-2 -translate-x-1/2 rounded bg-[#5a4435]" />
                  <div className="absolute bottom-8 left-1/2 h-1 w-12 -translate-x-1/2 bg-[#d6b87d]" />
                </div>
                <div className="font-display text-2xl font-bold tracking-[.06em]" style={{ color: blade.color }}>{blade.name}</div>
                <div className="mt-1 font-mono-app text-[10px] text-[#8da095]">{blade.detail}</div>
                <div className="mt-5 flex items-center justify-between border-t border-[#30433c] pt-4">
                  <span className="font-mono-app text-[10px] uppercase tracking-[.15em] text-[#9aa99b]">{blade.bonus}</span>
                  <span className={`font-mono-app text-xs ${unlocked ? 'text-[#d3ff35]' : 'text-[#ffbd46]'}`}>{unlocked ? selected ? 'ACTIVE' : 'EQUIP' : `${blade.price} C`}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

function Settings({ save, setSave, setScreen, screenFx, setScreenFx, swipeAssist, setSwipeAssist }: {
  save: SavedData; setSave: (value: SavedData) => void; setScreen: (screen: Screen) => void;
  screenFx: boolean; setScreenFx: (value: boolean) => void; swipeAssist: boolean; setSwipeAssist: (value: boolean) => void;
}) {
  const toggleMute = () => {
    const next = { ...save, muted: !save.muted };
    setMuted(next.muted);
    if (next.muted) stopMusic(); else if (next.musicOn) startMusic();
    setSave(next); saveGame(next);
    if (!next.muted) sfx.uiClick();
  };
  const toggleMusic = () => {
    const next = { ...save, musicOn: !save.musicOn };
    if (next.musicOn && !save.muted) startMusic(); else stopMusic();
    setSave(next); saveGame(next);
    sfx.uiClick();
  };
  return (
    <main className="noise-overlay relative min-h-[100dvh] overflow-hidden bg-[#09100f]">
      <CityBackdrop dense />
      <div className="relative z-10 mx-auto min-h-[100dvh] max-w-3xl px-6 py-6 sm:px-10 sm:py-10">
        <button type="button" data-testid="button-settings-back" onClick={() => setScreen('menu')} className="flex items-center gap-2 font-mono-app text-[10px] uppercase tracking-[.2em] text-[#71847a] transition hover:text-[#d3ff35]"><ArrowLeft className="h-4 w-4" /> Back to base</button>
        <div className="mt-14 border border-[#30433c] bg-[#0d1717]/90 p-6 sm:p-10">
          <div className="flex items-center gap-3"><Settings2 className="text-[#71e7ef]" /><span className="font-mono-app text-[10px] uppercase tracking-[.28em] text-[#71e7ef]">System preferences</span></div>
           <h1 className="mobile-settings-title mt-3 font-display text-6xl font-black uppercase tracking-[-.03em] text-[#f3f2df] sm:text-7xl">Signal <span className="text-[#d3ff35]">settings</span></h1>
          <div className="mt-10 divide-y divide-[#30433c] border-y border-[#30433c]">
            <button type="button" data-testid="button-toggle-mute" onClick={toggleMute} className="flex w-full items-center justify-between py-6 text-left transition hover:bg-[#162218]/70">
              <div className="flex items-center gap-4">{save.muted ? <VolumeX className="text-[#ff8247]" /> : <Volume2 className="text-[#d3ff35]" />}<div><div className="font-display text-xl font-bold tracking-[.08em] text-[#f3f2df]">SOUND EFFECTS</div><div className="font-mono-app text-[10px] text-[#71847a]">Slices, hazards, and alerts</div></div></div>
              <div className={`h-6 w-11 border p-1 transition ${save.muted ? 'border-[#4a5149] bg-[#202a25]' : 'border-[#d3ff35] bg-[#d3ff35]/20'}`}><div className={`h-4 w-4 transition ${save.muted ? '' : 'translate-x-5 bg-[#d3ff35]'} ${save.muted ? 'bg-[#71847a]' : ''}`} /></div>
            </button>
            <button type="button" data-testid="button-toggle-music" onClick={toggleMusic} className="flex w-full items-center justify-between py-6 text-left transition hover:bg-[#162218]/70">
              <div className="flex items-center gap-4"><Sparkles className={save.musicOn ? 'text-[#d3ff35]' : 'text-[#71847a]'} /><div><div className="font-display text-xl font-bold tracking-[.08em] text-[#f3f2df]">AMBIENT MUSIC</div><div className="font-mono-app text-[10px] text-[#71847a]">Low synth pad while you play</div></div></div>
              <div className={`h-6 w-11 border p-1 transition ${!save.musicOn ? 'border-[#4a5149] bg-[#202a25]' : 'border-[#d3ff35] bg-[#d3ff35]/20'}`}><div className={`h-4 w-4 transition ${save.musicOn ? 'translate-x-5 bg-[#d3ff35]' : 'bg-[#71847a]'}`} /></div>
            </button>
            <button type="button" data-testid="button-toggle-assist" onClick={() => { setSwipeAssist(!swipeAssist); sfx.uiClick(); }} className="flex w-full items-center justify-between py-6 text-left transition hover:bg-[#162218]/70">
              <div className="flex items-center gap-4"><Crosshair className="text-[#71e7ef]" /><div><div className="font-display text-xl font-bold tracking-[.08em] text-[#f3f2df]">SWIPE ASSIST</div><div className="font-mono-app text-[10px] text-[#71847a]">Widens the slice hitbox for easier chains</div></div></div>
              <div className={`h-6 w-11 border p-1 transition ${!swipeAssist ? 'border-[#4a5149] bg-[#202a25]' : 'border-[#d3ff35] bg-[#d3ff35]/20'}`}><div className={`h-4 w-4 transition ${swipeAssist ? 'translate-x-5 bg-[#d3ff35]' : 'bg-[#71847a]'}`} /></div>
            </button>
            <button type="button" data-testid="button-toggle-fx" onClick={() => { setScreenFx(!screenFx); sfx.uiClick(); }} className="flex w-full items-center justify-between py-6 text-left transition hover:bg-[#162218]/70">
              <div className="flex items-center gap-4"><Sparkles className="text-[#ff8247]" /><div><div className="font-display text-xl font-bold tracking-[.08em] text-[#f3f2df]">SCREEN FX</div><div className="font-mono-app text-[10px] text-[#71847a]">Particles, fog, and impact shake</div></div></div>
              <div className={`h-6 w-11 border p-1 transition ${!screenFx ? 'border-[#4a5149] bg-[#202a25]' : 'border-[#d3ff35] bg-[#d3ff35]/20'}`}><div className={`h-4 w-4 transition ${screenFx ? 'translate-x-5 bg-[#d3ff35]' : 'bg-[#71847a]'}`} /></div>
            </button>
          </div>
          <div className="mt-8 flex items-center justify-between font-mono-app text-[9px] uppercase tracking-[.2em] text-[#5d6d64]"><span>Zombie Slice // local build</span><span>v3.0</span></div>
        </div>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Achievements screen
// ---------------------------------------------------------------------------

function Achievements({ save, setScreen }: { save: SavedData; setScreen: (screen: Screen) => void }) {
  const unlockedCount = save.achievements.length;
  return (
    <main className="noise-overlay relative min-h-[100dvh] overflow-hidden bg-[#09100f]">
      <CityBackdrop dense />
      <div className="relative z-10 mx-auto min-h-[100dvh] max-w-4xl px-6 py-6 sm:px-10 sm:py-10">
        <button type="button" data-testid="button-achievements-back" onClick={() => setScreen('menu')} className="flex items-center gap-2 font-mono-app text-[10px] uppercase tracking-[.2em] text-[#71847a] transition hover:text-[#d3ff35]"><ArrowLeft className="h-4 w-4" /> Back to base</button>
        <div className="mt-10 max-w-xl">
          <div className="font-mono-app text-[10px] uppercase tracking-[.35em] text-[#ffbd46]">Field record</div>
          <h1 className="mt-2 font-display text-6xl font-black uppercase leading-none tracking-[-.03em] text-[#f3f2df] sm:text-7xl">Awards<span className="text-[#ffbd46]">.</span></h1>
          <p className="mt-4 font-mono-app text-xs text-[#9aa99b]">{unlockedCount} / {achievements.length} unlocked</p>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {achievements.map((achievement) => {
            const unlocked = save.achievements.includes(achievement.id);
            return (
              <div key={achievement.id} data-testid={`achievement-${achievement.id}`} className={`flex items-center gap-4 border p-4 transition ${unlocked ? 'border-[#ffbd46]/50 bg-[#1a1710]/80' : 'border-[#30433c] bg-[#0d1717]/70 opacity-60'}`}>
                <div className={`grid h-11 w-11 shrink-0 place-items-center border ${unlocked ? 'border-[#ffbd46] text-[#ffbd46]' : 'border-[#3e4e41] text-[#4a5a50]'}`}>
                  {unlocked ? <Award className="h-5 w-5" /> : <LockKeyhole className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-lg font-bold tracking-[.05em] text-[#f3f2df]">{achievement.title}</div>
                  <div className="font-mono-app text-[10px] text-[#8da095]">{achievement.detail}</div>
                </div>
                <div className="font-mono-app text-xs text-[#ffbd46]">+{achievement.reward}c</div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Game
// ---------------------------------------------------------------------------

function Game({ save, setSave, setScreen, screenFx, swipeAssist }: {
  save: SavedData; setSave: (value: SavedData) => void; setScreen: (screen: Screen) => void; screenFx: boolean; swipeAssist: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const blade = useMemo(() => getBlade(save.selected), [save.selected]);
  const startingLives = maxLivesFor(save.selected);
  const stateRef = useRef<GameState>(freshState(startingLives));
  const [hud, setHud] = useState({
    score: 0, combo: 0, lives: startingLives, wave: 1, time: 0,
    freezeActive: false, multiActive: false, shieldCount: 0,
    bossHp: null as number | null, bossMaxHp: null as number | null,
  });
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [hint, setHint] = useState(true);
  const [damageFlash, setDamageFlash] = useState(0);
  const pointerDownRef = useRef(false);
  const saveRef = useRef(save);
  saveRef.current = save;
  const { queue: toastQueue, push: pushToasts } = useAchievementToasts();
  const { def: dailyDef } = useMemo(() => getTodaysChallenge(), []);

  useEffect(() => {
    resumeAudio();
    if (!save.muted && save.musicOn) startMusic();
    return () => stopMusic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hitThreshold = swipeAssist ? 26 : 17;

  const spawnEntity = useCallback((s: GameState) => {
    const edge = Math.floor(Math.random() * 3);
    const x = edge === 0 ? -50 : edge === 1 ? s.width + 50 : Math.random() * s.width;
    const y = edge === 2 ? s.height + 48 : s.height * (0.18 + Math.random() * 0.37);
    const roll = Math.random();
    const bombChance = 0.09 + s.wave * 0.007;
    const powerupChance = 0.05;
    const survivorChance = 0.045;
    const fruitChance = 0.22;
    let kind: EntityKind;
    let powerKind: PowerKind | undefined;
    if (roll < bombChance) kind = 'bomb';
    else if (roll < bombChance + powerupChance) {
      kind = 'powerup';
      const kinds: PowerKind[] = ['freeze', 'multi', 'shield'];
      powerKind = kinds[Math.floor(Math.random() * kinds.length)];
    } else if (roll < bombChance + powerupChance + survivorChance) kind = 'survivor';
    else if (roll < bombChance + powerupChance + survivorChance + fruitChance) kind = 'fruit';
    else {
      const zr = Math.random();
      kind = zr < 0.34 ? 'brute' : zr < 0.57 ? 'runner' : 'crawler';
    }
    const targetX = s.width * (0.2 + Math.random() * 0.6);
    const targetY = s.height * (0.26 + Math.random() * 0.35);
    const dx = targetX - x;
    const dy = targetY - y;
    const baseSpeed = kind === 'runner' ? 1.45 : kind === 'brute' ? 0.68 : kind === 'bomb' ? 0.82 : kind === 'fruit' ? 0.72 : kind === 'survivor' ? 1.1 : kind === 'powerup' ? 0.6 : 0.98;
    const dist = Math.hypot(dx, dy) || 1;
    const size = kind === 'brute' ? 33 : kind === 'runner' ? 21 : kind === 'bomb' ? 25 : kind === 'fruit' ? 18 : kind === 'survivor' ? 24 : kind === 'powerup' ? 22 : 26;
    s.entities.push({
      id: s.nextId++, kind, x, y,
      vx: (dx / dist) * baseSpeed,
      vy: (dy / dist) * baseSpeed - (kind === 'crawler' ? 1.2 : 0.25),
      size, spin: Math.random() * 6, age: 0, hit: false, powerKind,
    });
  }, []);

  const spawnBoss = useCallback((s: GameState) => {
    const hp = 7 + s.wave * 1.2;
    s.entities.push({
      id: s.nextId++, kind: 'boss', x: s.width * 0.5, y: -80,
      vx: 0.35, vy: 0.4, size: 58, spin: 0, age: 0, hit: false, hp, maxHp: hp,
    });
    s.bossActive = true;
    s.bossWaveHandled = s.wave;
    s.labels.push({ x: s.width * 0.5, y: s.height * 0.3, text: 'BOSS WAVE', color: '#ff5d5d', life: 1.6, big: true });
    s.shake = 10;
  }, []);

  const burst = useCallback((s: GameState, x: number, y: number, color: string, amount = 14, ring = false) => {
    if (!screenFx) amount = Math.max(3, Math.floor(amount * 0.35));
    for (let i = 0; i < amount; i += 1) s.particles.push({ x, y, vx: (Math.random() - 0.5) * 5.5, vy: (Math.random() - 0.5) * 5.5, life: 0.45 + Math.random() * 0.45, max: 0.9, color, size: 1 + Math.random() * 3 });
    if (ring) s.particles.push({ x, y, vx: 0, vy: 0, life: 0.5, max: 0.5, color, size: 2, ring: true });
  }, [screenFx]);

  const handleSlice = useCallback((x: number, y: number) => {
    const s = stateRef.current;
    const previous = s.previousPoint;
    s.previousPoint = { x, y };
    s.trail.push({ x, y, age: 0 });
    if (!previous || pausedRef.current || s.gameOver) return;
    setHint(false);
    let hits = 0;
    const multiActive = s.effects.multiUntil > s.elapsed;
    const scoreMult = multiActive ? 2 : 1;

    s.entities.forEach((entity) => {
      if (entity.hit) return;
      const threshold = entity.size + hitThreshold;
      if (distanceToSegment(entity.x, entity.y, previous.x, previous.y, x, y) >= threshold) return;

      if (entity.kind === 'boss') {
        const dmg = 1 + s.combo * 0.12;
        entity.hp = (entity.hp ?? 1) - dmg;
        burst(s, entity.x, entity.y, '#ff5d5d', 10);
        sfx.bossHit();
        s.shake = Math.min(10, s.shake + 3);
        if ((entity.hp ?? 0) <= 0) {
          entity.hit = true;
          hits += 1;
          const points = Math.floor((900 + s.wave * 60) * scoreMult);
          s.score += points;
          s.runCoins += 120;
          s.combo += 3;
          s.runStats.bossesDefeated += 1;
          s.bossActive = false;
          s.labels.push({ x: entity.x, y: entity.y, text: `BOSS DOWN +${points}`, color: '#ff5d5d', life: 1.4, big: true });
          burst(s, entity.x, entity.y, '#ff5d5d', 40, true);
          s.shake = 16;
          sfx.bossDefeated();
        }
        return;
      }

      entity.hit = true;
      hits += 1;

      if (entity.kind === 'bomb') {
        burst(s, entity.x, entity.y, '#ff8247', 28, true);
        if (s.effects.shieldCount > 0) {
          s.effects.shieldCount -= 1;
          s.labels.push({ x: entity.x, y: entity.y, text: 'SHIELDED', color: '#8ec9ff', life: 1 });
        } else if (blade.id === 'quake' && !s.effects.hazardAbsorbed) {
          s.effects.hazardAbsorbed = true;
          s.labels.push({ x: entity.x, y: entity.y, text: 'ABSORBED', color: '#c98bff', life: 1 });
        } else {
          s.lives -= 1;
          s.combo = 0;
          s.runStats.tookDamage = true;
          s.labels.push({ x: entity.x, y: entity.y, text: 'HAZARD', color: '#ff8247', life: 1 });
          s.shake = 13;
          sfx.bombHit();
        }
        return;
      }

      if (entity.kind === 'fruit') {
        burst(s, entity.x, entity.y, '#8bff7a', 15);
        s.combo += 1;
        const points = Math.floor(14 * Math.max(1, s.combo * 0.5) * scoreMult);
        const coinBonus = blade.id === 'aurora' ? 4 : 3;
        s.score += points;
        s.runCoins += coinBonus;
        s.runStats.fruitsSliced += 1;
        s.dailyProgress = dailyDef.metric === 'fruit' ? s.runStats.fruitsSliced : s.dailyProgress;
        s.labels.push({ x: entity.x, y: entity.y, text: `+${points}`, color: '#8bff7a', life: 1 });
        sfx.sliceFruit();
      } else if (entity.kind === 'survivor') {
        const cap = maxLivesFor(blade.id);
        s.lives = Math.min(cap, s.lives + 1);
        s.combo += 1;
        const points = Math.floor(220 * scoreMult);
        s.score += points;
        s.runStats.survivorsRescued += 1;
        s.dailyProgress = dailyDef.metric === 'rescues' ? s.runStats.survivorsRescued : s.dailyProgress;
        burst(s, entity.x, entity.y, '#ffe27a', 26, true);
        s.labels.push({ x: entity.x, y: entity.y, text: 'RESCUED +1 LIFE', color: '#ffe27a', life: 1.2, big: true });
        sfx.rescueSurvivor();
      } else if (entity.kind === 'powerup') {
        const duration = blade.id === 'cryo' ? 1.5 : 1;
        if (entity.powerKind === 'freeze') { s.effects.freezeUntil = s.elapsed + 6 * duration; }
        else if (entity.powerKind === 'multi') { s.effects.multiUntil = s.elapsed + 8 * duration; }
        else if (entity.powerKind === 'shield') { s.effects.shieldCount = Math.min(3, s.effects.shieldCount + 1); }
        s.combo += 1;
        s.score += Math.floor(30 * scoreMult);
        burst(s, entity.x, entity.y, blade.glow, 18, true);
        s.labels.push({ x: entity.x, y: entity.y, text: entity.powerKind?.toUpperCase() ?? 'POWER', color: blade.color, life: 1 });
        sfx.slicePowerup();
      } else {
        const color = blade.color;
        burst(s, entity.x, entity.y, color, 15);
        s.combo += 1;
        const base = entity.kind === 'brute' ? 40 : entity.kind === 'runner' ? 28 : 20;
        const emberBonus = blade.id === 'ember' ? 1.12 : 1;
        const points = Math.floor(base * Math.max(1, s.combo) * scoreMult * emberBonus);
        s.score += points;
        s.labels.push({ x: entity.x, y: entity.y, text: `+${points}`, color, life: 1 });
        s.shake = Math.min(8, s.shake + 2);
        sfx.sliceZombie(s.combo);
        if (s.combo > saveRef.current.bestCombo) {
          const next = { ...saveRef.current, bestCombo: s.combo };
          saveRef.current = next; setSave(next); saveGame(next);
        }
      }
      s.dailyProgress = dailyDef.metric === 'sliced' ? s.dailyProgress + (entity.kind !== 'fruit' && entity.kind !== 'survivor' && entity.kind !== 'powerup' ? 1 : 0) : s.dailyProgress;
      if (dailyDef.metric === 'combo') s.dailyProgress = Math.max(s.dailyProgress, s.combo);
      if (dailyDef.metric === 'score') s.dailyProgress = s.score;

      // Live combo achievements
      if (s.combo === 10 || s.combo === 25) {
        const id = s.combo === 10 ? 'combo_10' : 'combo_25';
        const result = unlockAchievements(saveRef.current, [id]);
        if (result.unlocked.length) { saveRef.current = result.save; setSave(result.save); saveGame(result.save); pushToasts(result.unlocked); }
      }
      if (s.score >= 5000 || s.score >= 15000) {
        const ids = [s.score >= 5000 ? 'score_5000' : null, s.score >= 15000 ? 'score_15000' : null].filter(Boolean) as string[];
        const result = unlockAchievements(saveRef.current, ids);
        if (result.unlocked.length) { saveRef.current = result.save; setSave(result.save); saveGame(result.save); pushToasts(result.unlocked); }
      }
    });

    if (hits) setHud((old) => ({ ...old, score: s.score, combo: s.combo, lives: s.lives, wave: s.wave }));
  }, [blade.color, blade.glow, blade.id, burst, dailyDef.metric, hitThreshold, pushToasts, setSave]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const arena = arenaRef.current;
    if (!canvas || !arena) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = stateRef.current;
    const resize = () => {
      const rect = arena.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      s.width = rect.width; s.height = rect.height;
      canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`; canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const finalizeRun = () => {
      s.gameOver = true;
      const current = saveRef.current;
      const runCoinsTotal = Math.floor(s.score / 38) + s.runCoins;
      let next: SavedData = {
        ...current,
        highScore: Math.max(current.highScore, s.score),
        coins: current.coins + runCoinsTotal,
        sliced: current.sliced + s.entities.filter((e) => e.hit && e.kind !== 'bomb' && e.kind !== 'fruit' && e.kind !== 'survivor' && e.kind !== 'powerup').length,
        fruitsSliced: current.fruitsSliced + s.runStats.fruitsSliced,
        survivorsRescued: current.survivorsRescued + s.runStats.survivorsRescued,
        bossesDefeated: current.bossesDefeated + s.runStats.bossesDefeated,
        gamesPlayed: current.gamesPlayed + 1,
        bestTime: Math.max(current.bestTime, s.elapsed),
      };

      // Daily challenge check
      if (!next.daily.completed && dailyDef.id === next.daily.challengeId) {
        const achieved = s.dailyProgress >= dailyDef.target;
        if (achieved) next = { ...next, coins: next.coins + dailyDef.reward, daily: { ...next.daily, progress: s.dailyProgress, completed: true } };
        else next = { ...next, daily: { ...next.daily, progress: Math.max(next.daily.progress, s.dailyProgress) } };
      }

      const endIds: string[] = [];
      if (s.runStats.fruitsSliced > 0) endIds.push('first_blood');
      if (next.fruitsSliced >= 50) endIds.push('fruit_50');
      if (s.runStats.survivorsRescued >= 1) endIds.push('rescue_1');
      if (next.survivorsRescued >= 10) endIds.push('rescue_10');
      if (s.runStats.bossesDefeated >= 1) endIds.push('boss_1');
      if (s.runStats.bossesDefeated >= 1 && !s.runStats.tookDamage) endIds.push('flawless');
      if (s.elapsed >= 180) endIds.push('survivor_time');
      const result = unlockAchievements(next, endIds);
      next = result.save;

      saveRef.current = next; setSave(next); saveGame(next);
      if (result.unlocked.length) pushToasts(result.unlocked);
      setScreen('gameover');
    };

    const tick = (now: number) => {
      const delta = Math.min(32, now - (s.last || now)) / 16.67;
      s.last = now;
      ctx.clearRect(0, 0, s.width, s.height);
      if (!pausedRef.current && !s.gameOver) {
        s.elapsed += delta / 60;
        s.time += delta;
        s.spawn -= delta;
        if (s.spawn <= 0 && !s.bossActive) {
          spawnEntity(s);
          s.spawn = Math.max(22, 54 - s.wave * 3) + Math.random() * 22;
        }
        const nextWave = Math.floor(s.elapsed / 16) + 1;
        if (nextWave > s.wave) { s.wave = nextWave; sfx.waveUp(); }
        if (s.wave % 6 === 0 && s.bossWaveHandled !== s.wave && !s.bossActive) spawnBoss(s);

        const freezeActive = s.effects.freezeUntil > s.elapsed;
        const speedScale = freezeActive ? 0.42 : 1;
        s.entities.forEach((entity) => {
          entity.age += delta;
          entity.x += entity.vx * delta * (1 + s.wave * 0.035) * speedScale;
          entity.y += entity.vy * delta * (1 + s.wave * 0.035) * speedScale;
          if (entity.kind === 'boss') {
            if (entity.y < s.height * 0.22) entity.vy = Math.abs(entity.vy);
            if (entity.x < entity.size || entity.x > s.width - entity.size) entity.vx *= -1;
          } else {
            entity.vy += 0.012 * delta * speedScale;
          }
          entity.spin += 0.02 * delta;
        });
        s.entities = s.entities.filter((entity) => {
          if (entity.hit) return entity.age < 18;
          if (entity.kind === 'boss') return entity.age < 20 * 60;
          if (entity.y > s.height + 65 || entity.x < -80 || entity.x > s.width + 80) {
            if (entity.kind !== 'bomb' && entity.kind !== 'fruit' && entity.kind !== 'powerup') s.combo = 0;
            return false;
          }
          return true;
        });
        if (s.combo > 0) { s.time -= delta * 0.006; if (s.time < -1) s.combo = 0; }
        if (s.lives <= 0) { finalizeRun(); }
        const bossEntity = s.entities.find((e) => e.kind === 'boss' && !e.hit);
        setHud({
          score: s.score, combo: s.combo, lives: s.lives, wave: s.wave, time: s.elapsed,
          freezeActive, multiActive: s.effects.multiUntil > s.elapsed, shieldCount: s.effects.shieldCount,
          bossHp: bossEntity ? Math.max(0, bossEntity.hp ?? 0) : null, bossMaxHp: bossEntity ? bossEntity.maxHp ?? null : null,
        });
      }
      s.trail.forEach((point) => { point.age += delta / 60; });
      s.trail = s.trail.filter((point) => point.age < 0.35);
      s.particles.forEach((particle) => {
        if (particle.ring) { particle.life -= delta / 60; return; }
        particle.x += particle.vx * delta; particle.y += particle.vy * delta; particle.vy += 0.08 * delta; particle.life -= delta / 60;
      });
      s.particles = s.particles.filter((particle) => particle.life > 0);
      s.labels.forEach((label) => { label.y -= 0.55 * delta; label.life -= delta / 60; });
      s.labels = s.labels.filter((label) => label.life > 0);
      const jitter = screenFx && s.shake > 0 ? (Math.random() - 0.5) * s.shake : 0; s.shake *= 0.87;
      ctx.save(); ctx.translate(jitter, jitter);

      s.entities.forEach((entity) => {
        ctx.save(); ctx.translate(entity.x, entity.y); ctx.rotate(entity.kind === 'fruit' || entity.kind === 'boss' ? 0 : entity.spin);
        const alpha = entity.hit ? Math.max(0, entity.age / 18) : 1;
        ctx.globalAlpha = alpha;
        if (entity.kind === 'bomb') {
          const color = '#ff8247';
          ctx.shadowBlur = entity.hit ? 24 : 13; ctx.shadowColor = color; ctx.strokeStyle = color; ctx.fillStyle = entity.hit ? 'transparent' : `${color}20`; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(0, 0, entity.size * 0.58, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(-entity.size * 0.76, 0); ctx.lineTo(entity.size * 0.76, 0); ctx.moveTo(0, -entity.size * 0.76); ctx.lineTo(0, entity.size * 0.76); ctx.stroke();
          ctx.fillStyle = '#f7e7b0'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
        } else if (entity.kind === 'fruit') {
          const palette = ['#ff5d5d', '#ff9d3d', '#8bff7a'];
          const color = palette[entity.id % 3];
          ctx.shadowBlur = entity.hit ? 22 : 10; ctx.shadowColor = color;
          ctx.fillStyle = entity.hit ? 'transparent' : color; ctx.strokeStyle = color; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(0, 0, entity.size * 0.55, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = '#e9ffb0'; ctx.beginPath(); ctx.moveTo(0, -entity.size * 0.55); ctx.lineTo(0, -entity.size * 0.85); ctx.stroke();
          ctx.fillStyle = '#ffffff40'; ctx.beginPath(); ctx.arc(-entity.size * 0.16, -entity.size * 0.16, entity.size * 0.14, 0, Math.PI * 2); ctx.fill();
        } else if (entity.kind === 'survivor') {
          const color = '#ffe27a';
          ctx.shadowBlur = entity.hit ? 26 : 16; ctx.shadowColor = color;
          ctx.globalAlpha = alpha * (0.75 + Math.sin(entity.age * 0.2) * 0.25);
          ctx.strokeStyle = color; ctx.fillStyle = `${color}22`; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(0, -entity.size * 0.4, entity.size * 0.28, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, -entity.size * 0.12); ctx.lineTo(0, entity.size * 0.5); ctx.moveTo(-entity.size * 0.32, entity.size * 0.05); ctx.lineTo(entity.size * 0.32, entity.size * 0.05); ctx.moveTo(0, entity.size * 0.5); ctx.lineTo(-entity.size * 0.24, entity.size * 0.85); ctx.moveTo(0, entity.size * 0.5); ctx.lineTo(entity.size * 0.24, entity.size * 0.85); ctx.stroke();
        } else if (entity.kind === 'powerup') {
          const color = entity.powerKind === 'freeze' ? '#8ec9ff' : entity.powerKind === 'multi' ? '#ffd166' : '#9dffb0';
          ctx.shadowBlur = entity.hit ? 26 : 16; ctx.shadowColor = color;
          ctx.strokeStyle = color; ctx.fillStyle = `${color}18`; ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i < 6; i += 1) {
            const angle = (Math.PI / 3) * i - Math.PI / 2;
            const px = Math.cos(angle) * entity.size * 0.6; const py = Math.sin(angle) * entity.size * 0.6;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = color; ctx.font = '700 13px "DM Mono"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(entity.powerKind === 'freeze' ? '❄' : entity.powerKind === 'multi' ? 'x2' : '◈', 0, 1);
        } else if (entity.kind === 'boss') {
          const color = '#ff5d5d';
          ctx.shadowBlur = entity.hit ? 30 : 20; ctx.shadowColor = color;
          ctx.strokeStyle = color; ctx.fillStyle = entity.hit ? 'transparent' : `${color}22`; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(0, 0, entity.size * 0.62, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, -entity.size); ctx.lineTo(entity.size * 0.7, entity.size * 0.5); ctx.lineTo(-entity.size * 0.7, entity.size * 0.5); ctx.closePath(); ctx.stroke();
          ctx.fillStyle = color; ctx.beginPath(); ctx.arc(-entity.size * 0.22, -entity.size * 0.05, 4, 0, Math.PI * 2); ctx.arc(entity.size * 0.22, -entity.size * 0.05, 4, 0, Math.PI * 2); ctx.fill();
        } else {
          const color = entity.kind === 'brute' ? '#bd70a8' : entity.kind === 'runner' ? '#71e7ef' : '#d3ff35';
          ctx.shadowBlur = entity.hit ? 24 : 13; ctx.shadowColor = color; ctx.strokeStyle = color; ctx.fillStyle = entity.hit ? 'transparent' : `${color}20`; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(0, -entity.size); ctx.lineTo(entity.size * 0.68, entity.size * 0.54); ctx.lineTo(0, entity.size * 0.82); ctx.lineTo(-entity.size * 0.68, entity.size * 0.54); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = color; ctx.shadowBlur = 5; ctx.beginPath(); ctx.arc(-entity.size * 0.25, -entity.size * 0.1, 2.3, 0, Math.PI * 2); ctx.arc(entity.size * 0.25, -entity.size * 0.1, 2.3, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = color; ctx.beginPath(); ctx.moveTo(-entity.size * 0.25, entity.size * 0.25); ctx.lineTo(entity.size * 0.25, entity.size * 0.25); ctx.stroke();
          if (entity.kind === 'brute') { ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, entity.size + 6, 0, Math.PI * 2); ctx.stroke(); }
        }
        ctx.restore();
      });

      s.particles.forEach((particle) => {
        ctx.globalAlpha = Math.max(0, particle.life / particle.max);
        if (particle.ring) {
          const progress = 1 - Math.max(0, particle.life / particle.max);
          ctx.strokeStyle = particle.color; ctx.lineWidth = 2; ctx.shadowBlur = 12; ctx.shadowColor = particle.color;
          ctx.beginPath(); ctx.arc(particle.x, particle.y, 6 + progress * 46, 0, Math.PI * 2); ctx.stroke();
        } else {
          ctx.fillStyle = particle.color; ctx.shadowBlur = 10; ctx.shadowColor = particle.color; ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
        }
      });
      ctx.shadowBlur = 0;
      s.labels.forEach((label) => {
        ctx.globalAlpha = Math.min(1, label.life * 2);
        ctx.fillStyle = label.color; ctx.font = label.big ? '900 20px "Barlow Condensed"' : '700 14px "DM Mono"'; ctx.textAlign = 'center';
        ctx.fillText(label.text, label.x, label.y);
      });
      if (s.trail.length > 1) {
        ctx.globalAlpha = 1; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.shadowColor = blade.glow; ctx.shadowBlur = 18; ctx.strokeStyle = blade.color; ctx.lineWidth = 3.5;
        ctx.beginPath(); s.trail.forEach((point, index) => { if (!index) ctx.moveTo(point.x, point.y); else ctx.lineTo(point.x, point.y); }); ctx.stroke();
        ctx.shadowBlur = 0; ctx.strokeStyle = '#f5ffe6'; ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.restore();
      animation = requestAnimationFrame(tick);
    };
    let animation = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(animation); window.removeEventListener('resize', resize); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blade.color, blade.glow, blade.id, burst, dailyDef, pushToasts, screenFx, setSave, setScreen, spawnBoss, spawnEntity]);

  const previousLivesRef = useRef(hud.lives);
  useEffect(() => {
    if (hud.lives < previousLivesRef.current) {
      setDamageFlash(1);
      window.setTimeout(() => setDamageFlash(0), 260);
    }
    previousLivesRef.current = hud.lives;
  }, [hud.lives]);

  const localPoint = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => { event.currentTarget.setPointerCapture(event.pointerId); pointerDownRef.current = true; const point = localPoint(event); handleSlice(point.x, point.y); };
  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => { if (!pointerDownRef.current) return; const point = localPoint(event); handleSlice(point.x, point.y); };
  const onPointerUp = () => { pointerDownRef.current = false; stateRef.current.previousPoint = null; };
  const togglePause = () => { sfx.uiClick(); const next = !pausedRef.current; pausedRef.current = next; setPaused(next); };
  const restart = () => {
    const lives = maxLivesFor(save.selected);
    stateRef.current = freshState(lives);
    setHud({ score: 0, combo: 0, lives, wave: 1, time: 0, freezeActive: false, multiActive: false, shieldCount: 0, bossHp: null, bossMaxHp: null });
    setPaused(false); pausedRef.current = false; setScreen('game');
  };

  return (
    <main className="noise-overlay relative h-[100dvh] overflow-hidden bg-[#08100f] select-none">
      <AchievementToastStack queue={toastQueue} />
      <div ref={arenaRef} className="scanlines absolute inset-0 touch-none">
        <CityBackdrop dense />
        <canvas ref={canvasRef} data-testid="game-canvas" className="absolute inset-0 h-full w-full touch-none cursor-crosshair" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} />
      </div>
      <div className={`pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(255,60,60,.35)_100%)] transition-opacity duration-200 ${damageFlash ? 'opacity-100' : 'opacity-0'}`} />
      <header className="mobile-game-header pointer-events-none relative z-10 flex items-start justify-between p-5 sm:p-8">
        <div><div className="font-mono-app text-[9px] uppercase tracking-[.28em] text-[#71847a]">Wave {String(hud.wave).padStart(2, '0')} / active</div><div data-testid="text-score" className="font-display text-6xl font-black leading-none text-[#f3f2df] sm:text-8xl">{formatNumber(hud.score)}</div><div className="font-mono-app text-[9px] uppercase tracking-[.22em] text-[#d3ff35]">points</div></div>
        <div className="flex items-start gap-4 sm:gap-8">
          <div className="text-right"><div className="font-mono-app text-[9px] uppercase tracking-[.2em] text-[#71847a]">survival</div><div data-testid="text-timer" className="flex items-center justify-end gap-2 font-display text-3xl font-bold text-[#71e7ef]"><Timer className="h-5 w-5" />{Math.floor(hud.time).toString().padStart(2, '0')}s</div></div>
          <button type="button" data-testid="button-pause" onClick={togglePause} className="pointer-events-auto border border-[#51645a] bg-[#091311]/80 p-3 text-[#d8ddc9] transition hover:border-[#d3ff35] hover:text-[#d3ff35]"><Pause className="h-5 w-5" /></button>
        </div>
      </header>

      {hud.bossHp !== null && hud.bossMaxHp !== null && (
        <div className="pointer-events-none absolute left-1/2 top-[13%] z-20 w-[min(90vw,420px)] -translate-x-1/2">
          <div className="mb-1 flex items-center justify-between font-mono-app text-[9px] uppercase tracking-[.24em] text-[#ff5d5d]"><span>Boss signal</span><Flame className="h-3.5 w-3.5" /></div>
          <div className="h-3 w-full border border-[#ff5d5d]/50 bg-[#1a0d0d]"><div className="h-full bg-[#ff5d5d] transition-all" style={{ width: `${(hud.bossHp / hud.bossMaxHp) * 100}%`, boxShadow: '0 0 14px rgba(255,93,93,.7)' }} /></div>
        </div>
      )}

      <div className="pointer-events-none relative z-10 mx-auto flex max-w-6xl justify-center">
        {hud.combo > 1 && <div className="absolute top-4 text-center animate-rise-in"><div className="font-display text-6xl font-black italic leading-none text-[#ff8247] [text-shadow:0_0_20px_rgba(255,130,71,.35)]">{hud.combo}x</div><div className="font-mono-app text-[9px] uppercase tracking-[.3em] text-[#ffbd46]">chain reaction</div></div>}
      </div>

      <div className="pointer-events-none absolute right-5 top-24 z-10 flex flex-col items-end gap-2 sm:right-8 sm:top-32">
        {hud.freezeActive && <div className="flex items-center gap-2 border border-[#8ec9ff]/50 bg-[#0b1520]/85 px-3 py-1.5 font-mono-app text-[9px] uppercase tracking-[.18em] text-[#8ec9ff]"><Snowflake className="h-3.5 w-3.5" /> Time slowed</div>}
        {hud.multiActive && <div className="flex items-center gap-2 border border-[#ffd166]/50 bg-[#201a0b]/85 px-3 py-1.5 font-mono-app text-[9px] uppercase tracking-[.18em] text-[#ffd166]"><Zap className="h-3.5 w-3.5" /> 2x score</div>}
        {hud.shieldCount > 0 && <div className="flex items-center gap-2 border border-[#9dffb0]/50 bg-[#0b2013]/85 px-3 py-1.5 font-mono-app text-[9px] uppercase tracking-[.18em] text-[#9dffb0]"><Shield className="h-3.5 w-3.5" /> Shield x{hud.shieldCount}</div>}
      </div>

      <div className="mobile-game-hud pointer-events-none absolute bottom-7 left-6 right-6 z-10 flex items-end justify-between sm:bottom-9 sm:left-10 sm:right-10">
        <div><div className="mb-2 font-mono-app text-[9px] uppercase tracking-[.2em] text-[#71847a]">vital signs</div><div className="flex gap-2">{Array.from({ length: hud.lives }).map((_, index) => <Heart key={index} className="h-6 w-6 fill-[#ff8247] text-[#ff8247] drop-shadow-[0_0_8px_rgba(255,130,71,.5)]" />)}</div></div>
        <div className="text-right"><div className="font-mono-app text-[9px] uppercase tracking-[.2em] text-[#71847a]">blade // {blade.name}</div><div className="mt-2 h-1 w-32 bg-[#30433c] sm:w-48"><div className="h-full w-[72%]" style={{ backgroundColor: blade.color, boxShadow: `0 0 14px ${blade.color}` }} /></div></div>
      </div>

      {hint && <div className="absolute bottom-[42%] left-1/2 z-20 -translate-x-1/2 border border-[#71e7ef]/40 bg-[#0c191b]/90 px-5 py-3 text-center shadow-[0_0_35px_rgba(113,231,239,.12)]"><div className="font-display text-lg font-bold tracking-[.12em] text-[#71e7ef]">SWIPE TO SLICE</div><div className="mt-1 font-mono-app text-[9px] uppercase tracking-[.15em] text-[#8da095]">Fruit for salvage, gold for rescue, watch the bombs</div></div>}

      {paused && <div className="absolute inset-0 z-30 grid place-items-center bg-[#07100f]/75 backdrop-blur-[3px]"><div className="w-[min(90vw,430px)] border border-[#51645a] bg-[#0d1717] p-7 text-center shadow-[0_18px_80px_rgba(0,0,0,.45)]"><div className="mx-auto mb-5 grid h-14 w-14 place-items-center border border-[#d3ff35] text-[#d3ff35]"><Pause className="h-7 w-7" /></div><div className="font-mono-app text-[10px] uppercase tracking-[.28em] text-[#71847a]">Signal suspended</div><h2 className="mt-2 font-display text-6xl font-black uppercase text-[#f3f2df]">Hold fast.</h2><p className="mt-3 font-mono-app text-xs leading-5 text-[#8da095]">The city is waiting. Your combo is safe for now.</p><div className="mt-7 grid gap-3"><button type="button" data-testid="button-resume" onClick={togglePause} className="flex items-center justify-center gap-3 bg-[#d3ff35] py-3 font-display text-lg font-bold tracking-[.15em] text-[#10180d]"><Play className="h-4 w-4 fill-current" /> Resume run</button><button type="button" data-testid="button-pause-restart" onClick={restart} className="flex items-center justify-center gap-3 border border-[#3e5448] py-3 font-display text-lg font-bold tracking-[.15em] text-[#d8ddc9] hover:border-[#ff8247] hover:text-[#ff8247]"><RotateCcw className="h-4 w-4" /> Restart</button><button type="button" data-testid="button-pause-menu" onClick={() => { sfx.uiClick(); setScreen('menu'); }} className="py-2 font-mono-app text-[10px] uppercase tracking-[.2em] text-[#71847a] hover:text-[#f3f2df]">Return to base</button></div></div></div>}
    </main>
  );
}

// ---------------------------------------------------------------------------
// Game over
// ---------------------------------------------------------------------------

function GameOver({ save, setScreen }: { save: SavedData; setScreen: (screen: Screen) => void }) {
  useEffect(() => { sfx.gameOver(); }, []);
  const { def } = useMemo(() => getTodaysChallenge(), []);
  const dailyDone = save.daily.challengeId === def.id && save.daily.completed;
  return (
    <main className="noise-overlay relative min-h-[100dvh] overflow-hidden bg-[#09100f]">
      <CityBackdrop dense />
      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-3xl flex-col items-center justify-center px-6 py-12 text-center">
        <div className="font-mono-app text-[10px] uppercase tracking-[.38em] text-[#ff8247]">Signal lost / run terminated</div>
        <h1 className="mt-4 font-display text-[clamp(5rem,16vw,10rem)] font-black uppercase leading-[.8] tracking-[-.04em] text-[#f3f2df]">Night<br /><span className="text-[#ff8247]">claimed.</span></h1>
        <div className="mt-10 grid w-full max-w-lg grid-cols-3 border-y border-[#30433c] py-5">
          <div><div className="font-mono-app text-[9px] uppercase tracking-[.18em] text-[#71847a]">record</div><div className="mt-1 font-display text-3xl font-bold text-[#d3ff35]">{formatNumber(save.highScore)}</div></div>
          <div className="border-x border-[#30433c]"><div className="font-mono-app text-[9px] uppercase tracking-[.18em] text-[#71847a]">salvage</div><div className="mt-1 flex items-center justify-center gap-1 font-display text-3xl font-bold text-[#ffbd46]"><Coins className="h-5 w-5" /> {formatNumber(save.coins)}</div></div>
          <div><div className="font-mono-app text-[9px] uppercase tracking-[.18em] text-[#71847a]">best chain</div><div className="mt-1 font-display text-3xl font-bold text-[#71e7ef]">{save.bestCombo}x</div></div>
        </div>
        {dailyDone && <div className="mt-6 flex items-center gap-2 border border-[#d3ff35]/50 bg-[#162218]/80 px-4 py-2 font-mono-app text-[10px] uppercase tracking-[.2em] text-[#d3ff35]"><Target className="h-4 w-4" /> Daily broadcast complete — +{def.reward} salvage</div>}
        <p className="mt-8 max-w-sm font-mono-app text-xs leading-6 text-[#9aa99b]">Every cut buys another breath. The survivors remember your name.</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <button type="button" data-testid="button-gameover-restart" onClick={() => { sfx.uiConfirm(); setScreen('game'); }} className="flex items-center gap-3 bg-[#d3ff35] px-7 py-4 font-display text-xl font-bold tracking-[.13em] text-[#10180d] transition hover:bg-[#e3ff82]"><RotateCcw className="h-5 w-5" /> RUN IT BACK</button>
          <button type="button" data-testid="button-gameover-menu" onClick={() => { sfx.uiClick(); setScreen('menu'); }} className="flex items-center gap-3 border border-[#3e5448] px-7 py-4 font-display text-xl font-bold tracking-[.13em] text-[#d8ddc9] hover:border-[#71e7ef] hover:text-[#71e7ef]"><ArrowLeft className="h-5 w-5" /> BASE</button>
        </div>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Root app
// ---------------------------------------------------------------------------

function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [save, setSave] = useState<SavedData>(() => ensureDailyFresh(readSave()));
  const [firstRun, setFirstRun] = useState(() => !localStorage.getItem('zombie-slice-seen'));
  const [screenFx, setScreenFx] = useState(true);
  const [swipeAssist, setSwipeAssist] = useState(true);

  useEffect(() => { setMuted(save.muted); }, [save.muted]);
  useEffect(() => { saveGame(save); }, [save]);

  return (
    <div className="min-h-[100dvh] bg-[#09100f]">
      <ScreenFade screenKey={screen}>
        {screen === 'menu' && <Menu save={save} setSave={setSave} setScreen={setScreen} firstRun={firstRun} setFirstRun={setFirstRun} />}
        {screen === 'shop' && <Shop save={save} setSave={setSave} setScreen={setScreen} />}
        {screen === 'settings' && <Settings save={save} setSave={setSave} setScreen={setScreen} screenFx={screenFx} setScreenFx={setScreenFx} swipeAssist={swipeAssist} setSwipeAssist={setSwipeAssist} />}
        {screen === 'achievements' && <Achievements save={save} setScreen={setScreen} />}
        {screen === 'game' && <Game save={save} setSave={setSave} setScreen={setScreen} screenFx={screenFx} swipeAssist={swipeAssist} />}
        {screen === 'gameover' && <GameOver save={save} setScreen={setScreen} />}
      </ScreenFade>
      <InstallPrompt visible={screen === 'menu'} />
    </div>
  );
}

export default App;
