import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent, ReactNode } from 'react';
import {
  ArrowLeft, Award, BarChart3, Coins, Crosshair, Flame, Heart, Info, LockKeyhole, Palette, Pause, Play, RotateCcw,
  Settings2, Shield, ShoppingBag, Snowflake, Sparkles, Swords, Target, Timer, Trophy, Volume2, VolumeX, Zap, Zap2,
} from 'lucide-react';
import {
  type Achievement, type BladeId, type DailyChallengeDef, type Entity, type EntityKind, type ModifierId,
  type FloatLabel, type Particle, type PowerKind, type SavedData, type Screen, type TrailPoint,
  achievements, blades, defaultSave, formatNumber, getBlade, getTodaysChallenge,
  readSave, saveGame,
} from '@/lib/gameData';
import { resumeAudio, setMuted, sfx, startMusic, stopMusic } from '@/lib/audio';
import { Modifiers, Endless } from '@/lib/screens';
import { Stats, Cosmetics, SkillTree } from '@/lib/screens-extended';

// ... [All existing code from App.tsx remains the same until the Menu function] ...

function Menu({ save, setSave, setScreen, firstRun, setFirstRun }: { save: SavedData; setScreen: (screen: Screen) => void; setSave: (value: SavedData) => void; firstRun: boolean; setFirstRun: (va: boolean) => void }) {
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
            <h1 className="mobile-hero-title font-display text-[clamp(5rem,15vw,12.5rem)] font-black uppercase leading-[.77] tracking-[-.04em] text-[#f3f2df] [text-shadow:8px_12px_0_rgba(21,35,37,.3)]">
              Cut<br /><span className="text-[#d3ff35]">through</span>
            </h1>
            <p className="mt-8 max-w-md border-l-2 border-[#ff8247] pl-4 font-mono-app text-xs leading-6 text-[#a9b3a1] animate-rise-in" style={{ animationDelay: '160ms' }}>
              The dead are learning to jump. Slice fruit for salvage, rescue survivors, and don't let the boss waves catch you flat-footed.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4 animate-rise-in" style={{ animationDelay: '240ms' }}>
              <button type="button" data-testid="button-play" onClick={handlePlay} className="group relative flex items-center gap-4 bg-[#d3ff35] px-7 py-4 font-display text-xl font-extrabold tracking-[.08em] text-[#10180d] transition hover:bg-[#e3ff82]">
                <Play className="h-5 w-5 fill-current" /> ENTER THE NIGHT
                <span className="absolute -bottom-1 -right-1 h-2 w-2 bg-[#ff8247]" />
              </button>
              <button type="button" data-testid="button-shop" onClick={() => nav('shop')} className="flex items-center gap-3 border border-[#3e5448] bg-[#0d1717]/80 px-6 py-4 font-display text-lg font-bold tracking-[.06em] text-[#d8ddc9] transition hover:border-[#d3ff35]">
                <ShoppingBag className="h-5 w-5" /> LOADOUT
              </button>
              <button type="button" data-testid="button-achievements" onClick={() => nav('achievements')} className="flex items-center gap-3 border border-[#3e5448] bg-[#0d1717]/80 px-6 py-4 font-display text-lg font-bold tracking-[.06em] text-[#d8ddc9] transition hover:border-[#d3ff35]">
                <Award className="h-5 w-5" /> AWARDS
              </button>
            </div>

            {/* NEW EXPANSION BUTTONS */}
            <div className="mt-6 flex flex-wrap items-center gap-3 animate-rise-in" style={{ animationDelay: '280ms' }}>
              <button type="button" onClick={() => nav('endless')} className="flex items-center gap-2 border border-[#71e7ef]/50 bg-[#0d1717]/60 px-5 py-3 font-display text-sm font-bold tracking-[.05em] text-[#71e7ef] transition hover:border-[#71e7ef]">
                <Flame className="h-4 w-4" /> ENDLESS
              </button>
              <button type="button" onClick={() => nav('modifiers')} className="flex items-center gap-2 border border-[#ffd166]/50 bg-[#0d1717]/60 px-5 py-3 font-display text-sm font-bold tracking-[.05em] text-[#ffd166] transition hover:border-[#ffd166]">
                <Zap2 className="h-4 w-4" /> ARCADE
              </button>
              <button type="button" onClick={() => nav('skilltree')} className="flex items-center gap-2 border border-[#8bff7a]/50 bg-[#0d1717]/60 px-5 py-3 font-display text-sm font-bold tracking-[.05em] text-[#8bff7a] transition hover:border-[#8bff7a]">
                <Target className="h-4 w-4" /> SKILLS
              </button>
              <button type="button" onClick={() => nav('cosmetics')} className="flex items-center gap-2 border border-[#c98bff]/50 bg-[#0d1717]/60 px-5 py-3 font-display text-sm font-bold tracking-[.05em] text-[#c98bff] transition hover:border-[#c98bff]">
                <Palette className="h-4 w-4" /> COSMETICS
              </button>
              <button type="button" onClick={() => nav('stats')} className="flex items-center gap-2 border border-[#ff8247]/50 bg-[#0d1717]/60 px-5 py-3 font-display text-sm font-bold tracking-[.05em] text-[#ff8247] transition hover:border-[#ff8247]">
                <BarChart3 className="h-4 w-4" /> STATS
              </button>
            </div>

            <div className="mt-10 animate-rise-in" style={{ animationDelay: '300ms' }}>
              <DailyChallengeCard save={save} def={def} />
            </div>
            <div className="mt-8 flex items-center gap-8 animate-rise-in" style={{ animationDelay: '360ms' }}>
              <StatChip icon={<Trophy className="h-4 w-4" />} label="best run" value={formatNumber(save.highScore)} />
              <StatChip icon={<Zap className="h-4 w-4" />} label="best combo" value={`${save.bestCombo}x`} accent="orange" />
              <button type="button" data-testid="button-settings" onClick={() => nav('settings')} className="ml-auto border border-[#30433c] p-3 text-[#80958a] transition hover:border-[#71e7ef] hover:text-[#71e7ef]">
                <Settings2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>
        <footer className="flex flex-col justify-between gap-3 border-t border-[#293932] pt-4 font-mono-app text-[9px] uppercase tracking-[.22em] text-[#64766d] sm:flex-row">
          <span>Blade protocol // v.4.0</span>
          <span>Survivors online: <b className="text-[#d3ff35]">04</b> · Storm front: <b className="text-[#ff8247]">incoming</b></span>
        </footer>
      </div>
      {firstRun && (
        <div className="mobile-first-signal absolute bottom-20 right-6 z-20 max-w-[245px] border border-[#71e7ef]/40 bg-[#0d1c20]/95 p-4 shadow-[0_0_30px_rgba(113,231,239,.1)] sm:right-10">
          <div className="mb-2 flex items-center gap-2 font-display text-lg font-bold tracking-[.08em] text-[#71e7ef]"><Info className="h-4 w-4" /> FIRST SIGNAL</div>
          <p className="font-mono-app text-[10px] leading-5 text-[#a9b3a1]">Swipe zombies to slice them, fruit for salvage, and golden survivors to rescue them. Watch for bombs — and boss waves. Check out ENDLESS, ARCADE, SKILLS, and COSMETICS modes!</p>
          <div className="mt-3 h-px w-full bg-[#71e7ef]/25" />
          <button type="button" data-testid="button-dismiss-tutorial" onClick={() => setFirstRun(false)} className="mt-3 font-mono-app text-[9px] uppercase tracking-[.18em] text-[#d3ff35] hover:underline">
            Got it
          </button>
        </div>
      )}
      <button type="button" data-testid="button-reset-progress" onClick={resetProgress} className="absolute bottom-5 right-6 z-10 font-mono-app text-[8px] uppercase tracking-[.2em] text-[#405148] transition hover:text-[#8da095]">
        Reset
      </button>
      <div className="pointer-events-none absolute left-[54%] top-[26%] hidden h-40 w-40 rounded-full bg-[#ff8247]/10 blur-3xl sm:block" />
    </main>
  );
}

// ... [All other existing screen components remain the same] ...

function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [save, setSave] = useState<SavedData>(() => ensureDailyFresh(readSave()));
  const [firstRun, setFirstRun] = useState(() => !localStorage.getItem('zombie-slice-seen'));
  const [screenFx, setScreenFx] = useState(true);
  const [swipeAssist, setSwipeAssist] = useState(true);

  useEffect(() => { setMuted(save.muted); }, [save.muted]);
  useEffect(() => { saveGame(save); }, [save]);

  const handleStartGame = (modifierIds: ModifierId[]) => {
    setSave({ ...save, arcadeModifiers: modifierIds });
    setScreen('game');
  };

  const handleStartEndless = () => {
    setScreen('game');
  };

  return (
    <div className="min-h-[100dvh] bg-[#09100f]">
      <ScreenFade screenKey={screen}>
        {screen === 'menu' && <Menu save={save} setSave={setSave} setScreen={setScreen} firstRun={firstRun} setFirstRun={setFirstRun} />}
        {screen === 'shop' && <Shop save={save} setSave={setSave} setScreen={setScreen} />}
        {screen === 'settings' && <Settings save={save} setSave={setSave} setScreen={setScreen} screenFx={screenFx} setScreenFx={setScreenFx} swipeAssist={swipeAssist} setSwipeAssist={setSwipeAssist} />}
        {screen === 'achievements' && <Achievements save={save} setScreen={setScreen} />}
        {screen === 'endless' && <Endless save={save} setScreen={setScreen} onStartEndless={handleStartEndless} />}
        {screen === 'modifiers' && <Modifiers save={save} setScreen={setScreen} onStartGame={handleStartGame} />}
        {screen === 'stats' && <Stats save={save} setScreen={setScreen} />}
        {screen === 'cosmetics' && <Cosmetics save={save} setSave={setSave} setScreen={setScreen} />}
        {screen === 'skilltree' && <SkillTree save={save} setSave={setSave} setScreen={setScreen} />}
        {screen === 'game' && <Game save={save} setSave={setSave} setScreen={setScreen} screenFx={screenFx} swipeAssist={swipeAssist} />}
        {screen === 'gameover' && <GameOver save={save} setScreen={setScreen} />}
      </ScreenFade>
      <InstallPrompt visible={screen === 'menu'} />
    </div>
  );
}

export default App;
