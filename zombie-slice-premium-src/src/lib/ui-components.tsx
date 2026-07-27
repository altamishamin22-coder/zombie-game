import { ReactNode } from 'react';
import { ArrowLeft, Zap, Coins, Lock, Unlock } from 'lucide-react';

// ============================================================================
// REUSABLE UI COMPONENTS FOR NEW SCREENS
// ============================================================================

export function ScreenHeader({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack: () => void }) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <div className="font-mono-app text-[10px] uppercase tracking-[.28em] text-[#71e7ef]">{subtitle}</div>
        <h1 className="mt-2 font-display text-5xl font-black uppercase tracking-[-.03em] text-[#f3f2df]">
          {title}
        </h1>
      </div>
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 font-mono-app text-[10px] uppercase tracking-[.2em] text-[#71847a] transition hover:text-[#d3ff35]"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
    </div>
  );
}

export function ModifierCard({ name, description, difficulty, scoreMultiplier, selected, onClick }: {
  name: string;
  description: string;
  difficulty: string;
  scoreMultiplier: number;
  selected: boolean;
  onClick: () => void;
}) {
  const difficultyColor = difficulty === 'easy' ? '#8bff7a' : difficulty === 'normal' ? '#d3ff35' : difficulty === 'hard' ? '#ff8247' : '#ff5d5d';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col border p-4 transition ${selected ? 'border-[#d3ff35] bg-[#1a1710]/80' : 'border-[#30433c] bg-[#0d1717]/60 hover:border-[#71e7ef]'}`}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-display text-lg font-bold text-[#f3f2df]">{name}</h3>
        {selected && <div className="h-3 w-3 bg-[#d3ff35] rounded-full" />}
      </div>
      <p className="text-left font-mono-app text-xs text-[#8da095] mb-3">{description}</p>
      <div className="flex items-center justify-between">
        <span className="font-mono-app text-[9px] uppercase tracking-[.12em]" style={{ color: difficultyColor }}>
          {difficulty}
        </span>
        <span className="font-mono-app text-xs text-[#ffbd46]">{scoreMultiplier}x</span>
      </div>
    </button>
  );
}

export function SkillCard({ name, description, cost, unlocked, onClick }: {
  name: string;
  description: string;
  cost: number;
  unlocked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col border p-5 transition ${unlocked ? 'border-[#d3ff35]/50 bg-[#1a1710]/80' : 'border-[#3e4e41] bg-[#0d1717]/60 hover:border-[#71e7ef]'}`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className={`h-8 w-8 shrink-0 grid place-items-center border ${unlocked ? 'border-[#d3ff35] text-[#d3ff35]' : 'border-[#3e4e41] text-[#71847a]'}`}>
          {unlocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
        </div>
        <h3 className="font-display text-lg font-bold text-[#f3f2df] text-left">{name}</h3>
      </div>
      <p className="text-left font-mono-app text-xs text-[#8da095] mb-4">{description}</p>
      <div className={`font-mono-app text-xs flex items-center gap-1 ${unlocked ? 'text-[#d3ff35]' : 'text-[#ffbd46]'}`}>
        <Coins className="h-3 w-3" /> {cost}
      </div>
    </button>
  );
}

export function CosmeticCard({ name, colors, unlocked, selected, onClick }: {
  name: string;
  colors: string[];
  unlocked: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col items-center border p-5 transition ${selected ? 'border-[#d3ff35] bg-[#1a1710]/80' : unlocked ? 'border-[#30433c] bg-[#0d1717]/60' : 'border-[#3e4e41] bg-[#0d1717]/40'}`}
    >
      <div className="w-full h-12 mb-3 rounded flex items-center justify-center" style={{
        background: `linear-gradient(90deg, ${colors.join(', ')})`
      }} />
      <h3 className="font-display text-sm font-bold text-[#f3f2df]">{name}</h3>
      {selected && <div className="absolute top-2 right-2 h-2.5 w-2.5 bg-[#d3ff35] rounded-full" />}
      {!unlocked && <Lock className="absolute top-2 left-2 h-4 w-4 text-[#71847a]" />}
    </button>
  );
}

export function StatBox({ label, value, icon }: { label: string; value: string | number; icon?: ReactNode }) {
  return (
    <div className="border border-[#30433c] bg-[#0d1717]/85 p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon && <span className="text-[#71e7ef]">{icon}</span>}
        <div className="font-mono-app text-[9px] uppercase tracking-[.2em] text-[#71847a]">{label}</div>
      </div>
      <div className="font-display text-2xl font-bold text-[#f3f2df]">{value}</div>
    </div>
  );
}
