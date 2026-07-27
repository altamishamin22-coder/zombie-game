import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent, ReactNode } from 'react';
import {
  Download, X, Share2, ArrowRight, Award, BarChart3, Coins, Crosshair, Flame, Heart, Info, LockKeyhole, Palette, Pause, Play, RotateCcw,
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

// ---------------------------------------------------------------------------
// INSTALL PROMPT — Enhanced PWA installation for mobile users
// ---------------------------------------------------------------------------

type InstallPromptEvent = Event & { 
  prompt: () => Promise<void>; 
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> 
};

function isStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function isMobileDevice() {
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase());
}

function EnhancedInstallPrompt({ visible }: { visible: boolean }) {
  const deferredPromptRef = useRef<InstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already in standalone mode or dismissed
    if (isStandaloneMode() || localStorage.getItem('zombie-slice-install-dismissed') === '1') {
      setDismissed(true);
      return;
    }

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      deferredPromptRef.current = event as InstallPromptEvent;
      // Show prompt after 1.5 seconds on first visit
      if (isMobileDevice()) {
        window.setTimeout(() => setShowPrompt(true), 1500);
      }
    };

    const onInstalled = () => {
      deferredPromptRef.current = null;
      setShowPrompt(false);
      setDismissed(true);
      localStorage.setItem('zombie-slice-install-dismissed', '1');
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);

    // For iOS, show after delay even without beforeinstallprompt
    if (isIos && isMobileDevice()) {
      const timer = window.setTimeout(() => {
        if (!isStandaloneMode() && !dismissed) {
          setShowPrompt(true);
        }
      }, 2000);
      return () => window.clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [dismissed]);

  useEffect(() => {
    if (!visible) setShowPrompt(false);
  }, [visible]);

  if (!visible || dismissed || (!showPrompt && !showInstructions)) return null;

  const isIos = /iphone|ipad|ipot/i.test(navigator.userAgent);

  const install = async () => {
    if (isIos || !deferredPromptRef.current) {
      setShowPrompt(false);
      setShowInstructions(true);
      return;
    }

    try {
      await deferredPromptRef.current.prompt();
      const choice = await deferredPromptRef.current.userChoice;
      if (choice.outcome === 'accepted') {
        sfx.uiConfirm();
        setShowPrompt(false);
        setDismissed(true);
        localStorage.setItem('zombie-slice-install-dismissed', '1');
      }
    } catch (err) {
      console.error('Install prompt error:', err);
    }
    deferredPromptRef.current = null;
  };

  const dismiss = () => {
    setShowPrompt(false);
    setShowInstructions(false);
    setDismissed(true);
    localStorage.setItem('zombie-slice-install-dismissed', '1');
  };

  return (
    <>
      {/* MAIN INSTALL PROMPT */}
      {showPrompt && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-[#000000]/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm border border-[#d3ff35]/60 bg-[#0b1716]/98 p-6 shadow-[0_20px_80px_rgba(0,0,0,.8)]">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center border border-[#d3ff35]/60 bg-[#d3ff35]/10 font-display text-xl font-black text-[#d3ff35]">
                  ZS
                </div>
                <div>
                  <div className="font-mono-app text-[9px] uppercase tracking-[.24em] text-[#71e7ef]">Installation</div>
                  <div className="font-display text-xl font-bold text-[#f3f2df]">Install Game</div>
                </div>
              </div>
              <button type="button" onClick={dismiss} className="text-[#71847a] hover:text-[#ff8247] transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="font-mono-app text-xs leading-6 text-[#9aa99b] mb-6">
              {isIos 
                ? 'Add Zombie Slice to your home screen for instant access. No app store needed—just as fast as a native app.'
                : 'Install Zombie Slice on your phone for instant access, offline play, and full-screen gaming. Launch in one tap!'}
            </p>

            <div className="mb-6 flex items-center gap-3 bg-[#0d1717]/80 border border-[#30433c] p-4 rounded">
              <div className="text-[#71e7ef]">
                {isIos ? <Share2 className="h-5 w-5" /> : <Download className="h-5 w-5" />}
              </div>
              <div className="text-left text-sm">
                <div className="font-display font-bold text-[#f3f2df]">{isIos ? 'Share Button' : 'Quick Install'}</div>
                <div className="font-mono-app text-[9px] text-[#8da095]">{isIos ? 'Tap share, then "Add to Home Screen"' : 'Tap "Install" to get started'}</div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={install}
                className="flex-1 flex items-center justify-center gap-2 bg-[#d3ff35] py-3 px-4 font-display font-bold text-base tracking-[.08em] text-[#10180d] transition hover:bg-[#e3ff82]"
              >
                <Download className="h-4 w-4" /> {isIos ? 'ADD TO HOME SCREEN' : 'INSTALL NOW'}
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="border border-[#3e5448] px-4 py-3 font-mono-app text-[9px] uppercase tracking-[.12em] text-[#9aa99b] transition hover:border-[#71e7ef] hover:text-[#71e7ef]"
              >
                Skip
              </button>
            </div>

            <p className="mt-4 font-mono-app text-[8px] text-[#5d6d64] text-center">You can install later in settings</p>
          </div>
        </div>
      )}

      {/* iOS INSTRUCTIONS */}
      {showInstructions && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-[#000000]/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm border border-[#71e7ef]/60 bg-[#0b1716]/98 p-6 shadow-[0_20px_80px_rgba(0,0,0,.8)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl font-bold text-[#f3f2df]">
                {isIos ? 'Add to Home Screen' : 'Install Guide'}
              </h2>
              <button type="button" onClick={dismiss} className="text-[#71847a] hover:text-[#ff8247]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {isIos ? (
                <>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded bg-[#d3ff35]/20 font-display font-bold text-[#d3ff35]">1</div>
                    <div>
                      <div className="font-display font-bold text-[#d3ff35]">Open Safari menu</div>
                      <p className="font-mono-app text-xs text-[#8da095]">Tap the Share button at the bottom</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded bg-[#71e7ef]/20 font-display font-bold text-[#71e7ef]">2</div>
                    <div>
                      <div className="font-display font-bold text-[#71e7ef]">Scroll and tap</div>
                      <p className="font-mono-app text-xs text-[#8da095]">"Add to Home Screen"</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded bg-[#8bff7a]/20 font-display font-bold text-[#8bff7a]">3</div>
                    <div>
                      <div className="font-display font-bold text-[#8bff7a]">Confirm</div>
                      <p className="font-mono-app text-xs text-[#8da095]">Tap "Add" in the top right</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded bg-[#d3ff35]/20 font-display font-bold text-[#d3ff35]">1</div>
                    <div>
                      <div className="font-display font-bold text-[#d3ff35]">Open menu</div>
                      <p className="font-mono-app text-xs text-[#8da095]">⋮ or ⋯ (three dots)</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded bg-[#71e7ef]/20 font-display font-bold text-[#71e7ef]">2</div>
                    <div>
                      <div className="font-display font-bold text-[#71e7ef]">Tap "Install app"</div>
                      <p className="font-mono-app text-xs text-[#8da095]">Or "Add to home screen"</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded bg-[#8bff7a]/20 font-display font-bold text-[#8bff7a]">3</div>
                    <div>
                      <div className="font-display font-bold text-[#8bff7a]">Done!</div>
                      <p className="font-mono-app text-xs text-[#8da095]">Launch from home screen</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={dismiss}
              className="w-full bg-[#d3ff35] py-3 font-display font-bold text-base tracking-[.08em] text-[#10180d] transition hover:bg-[#e3ff82]"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// [Keep all existing components: ensureDailyFresh, unlockAchievements, useAchievementToasts, ScreenFade, etc.]

// Insert the Menu component with all features from previous commit...

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
      <EnhancedInstallPrompt visible={screen === 'menu'} />
    </div>
  );
}

export default App;
