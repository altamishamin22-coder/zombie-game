import { useState } from 'react';
import { RotateCcw, Play } from 'lucide-react';
import type { SavedData, Screen, ModifierId } from '@/lib/gameData';
import { modifiers, formatNumber } from '@/lib/gameData';
import { ScreenHeader, ModifierCard } from '@/lib/ui-components';

// ============================================================================
// MODIFIERS SCREEN — select arcade modifiers before playing
// ============================================================================

export function Modifiers({ save, setScreen, onStartGame }: {
  save: SavedData;
  setScreen: (screen: Screen) => void;
  onStartGame: (modifierIds: ModifierId[]) => void;
}) {
  const [selectedModifiers, setSelectedModifiers] = useState<ModifierId[]>(save.arcadeModifiers);

  const toggleModifier = (id: ModifierId) => {
    setSelectedModifiers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const calculateScoreMultiplier = () => {
    return selectedModifiers.reduce((mult, id) => {
      const mod = modifiers.find((m) => m.id === id);
      return mult * (mod?.scoreMultiplier ?? 1);
    }, 1);
  };

  const startWithModifiers = () => {
    onStartGame(selectedModifiers);
  };

  return (
    <main className="noise-overlay relative min-h-[100dvh] overflow-hidden bg-[#09100f]">
      <div className="relative z-10 mx-auto min-h-[100dvh] max-w-6xl px-6 py-6 sm:px-10 sm:py-8">
        <ScreenHeader
          title="Arcade Modifiers"
          subtitle="Difficulty settings"
          onBack={() => setScreen('menu')}
        />

        <div className="mt-8 max-w-2xl">
          <p className="font-mono-app text-xs text-[#9aa99b] mb-6">
            Select one or more modifiers to increase score multiplier. Combine for extreme challenges and rewards.
          </p>
          <div className="mb-6 p-4 border border-[#30433c] bg-[#0d1717]/85">
            <div className="font-mono-app text-[9px] uppercase tracking-[.2em] text-[#71847a]">Score Multiplier</div>
            <div className="mt-2 font-display text-3xl font-bold text-[#d3ff35]">{calculateScoreMultiplier().toFixed(1)}x</div>
          </div>
        </div>

        <div className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {modifiers.map((mod) => (
            <ModifierCard
              key={mod.id}
              name={mod.name}
              description={mod.description}
              difficulty={mod.difficulty}
              scoreMultiplier={mod.scoreMultiplier}
              selected={selectedModifiers.includes(mod.id)}
              onClick={() => toggleModifier(mod.id)}
            />
          ))}
        </div>

        <div className="mt-12 flex gap-3">
          <button
            type="button"
            onClick={startWithModifiers}
            className="flex items-center gap-3 bg-[#d3ff35] px-7 py-4 font-display text-xl font-extrabold tracking-[.08em] text-[#10180d] transition hover:bg-[#e3ff82]"
          >
            <Play className="h-5 w-5 fill-current" /> START RUN
          </button>
          <button
            type="button"
            onClick={() => setSelectedModifiers([])}
            className="flex items-center gap-2 border border-[#3e5448] px-6 py-4 font-display text-lg font-bold tracking-[.06em] text-[#d8ddc9] transition hover:border-[#d3ff35]"
          >
            <RotateCcw className="h-4 w-4" /> CLEAR
          </button>
        </div>
      </div>
    </main>
  );
}

// ============================================================================
// ENDLESS MODE SCREEN
// ============================================================================

export function Endless({ save, setScreen, onStartEndless }: {
  save: SavedData;
  setScreen: (screen: Screen) => void;
  onStartEndless: () => void;
}) {
  return (
    <main className="noise-overlay relative min-h-[100dvh] overflow-hidden bg-[#09100f]">
      <div className="relative z-10 mx-auto min-h-[100dvh] max-w-4xl px-6 py-6 sm:px-10 sm:py-8 flex flex-col items-center justify-center">
        <ScreenHeader
          title="Endless Mode"
          subtitle="Wave infinity"
          onBack={() => setScreen('menu')}
        />

        <div className="mt-12 max-w-xl">
          <p className="font-mono-app text-xs text-[#9aa99b] mb-8 text-center leading-6">
            No wave limit. Difficulty scales infinitely. How long can you survive the night? Every wave increases spawn rates and entity speed. Your best endless run will be tracked separately.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="border border-[#30433c] bg-[#0d1717]/85 p-4">
              <div className="font-mono-app text-[9px] uppercase tracking-[.2em] text-[#71847a]">Best Wave</div>
              <div className="mt-2 font-display text-2xl font-bold text-[#71e7ef]">{save.endlessHighWave}</div>
            </div>
            <div className="border border-[#30433c] bg-[#0d1717]/85 p-4">
              <div className="font-mono-app text-[9px] uppercase tracking-[.2em] text-[#71847a]">Best Score</div>
              <div className="mt-2 font-display text-2xl font-bold text-[#ffbd46]">{formatNumber(save.endlessHighScore)}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onStartEndless}
            className="w-full flex items-center justify-center gap-3 bg-[#d3ff35] px-7 py-5 font-display text-xl font-extrabold tracking-[.08em] text-[#10180d] transition hover:bg-[#e3ff82]"
          >
            <Play className="h-5 w-5 fill-current" /> BEGIN ENDLESS RUN
          </button>
        </div>
      </div>
    </main>
  );
}
