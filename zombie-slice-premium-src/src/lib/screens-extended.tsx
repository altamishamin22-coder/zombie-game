import { useMemo } from 'react';
import { BarChart3, Trophy, Zap, Clock, Target } from 'lucide-react';
import type { SavedData, Screen } from '@/lib/gameData';
import { calculateLifetimeStats, formatNumber, trailStyles, hudThemes } from '@/lib/gameData';
import { ScreenHeader, StatBox, CosmeticCard, SkillCard } from '@/lib/ui-components';

// ============================================================================
// STATS DASHBOARD
// ============================================================================

export function Stats({ save, setScreen }: { save: SavedData; setScreen: (screen: Screen) => void }) {
  const stats = useMemo(() => calculateLifetimeStats(save), [save]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  return (
    <main className="noise-overlay relative min-h-[100dvh] overflow-hidden bg-[#09100f]">
      <div className="relative z-10 mx-auto min-h-[100dvh] max-w-6xl px-6 py-6 sm:px-10 sm:py-8">
        <ScreenHeader title="Statistics" subtitle="Field record" onBack={() => setScreen('menu')} />

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatBox label="Total Runs" value={stats.totalRuns} icon={<Trophy className="h-4 w-4" />} />
          <StatBox label="Total Score" value={formatNumber(stats.totalScore)} icon={<Zap className="h-4 w-4" />} />
          <StatBox label="Playtime" value={formatTime(stats.totalTime)} icon={<Clock className="h-4 w-4" />} />
          <StatBox label="Zombies Sliced" value={formatNumber(stats.totalZombiesSliced)} icon={<Target className="h-4 w-4" />} />
          <StatBox label="Fruit Sliced" value={formatNumber(stats.totalFruitsSliced)} icon={<Target className="h-4 w-4" />} />
          <StatBox label="Survivors Rescued" value={stats.totalSurvisorsRescued} icon={<Trophy className="h-4 w-4" />} />
          <StatBox label="Bosses Defeated" value={stats.totalBossesDefeated} icon={<Zap className="h-4 w-4" />} />
          <StatBox label="Total Coins" value={formatNumber(stats.totalCoinsEarned)} icon={<Trophy className="h-4 w-4" />} />
          <StatBox label="Avg Combo" value={`${Math.floor(stats.averageCombo)}x`} icon={<Zap className="h-4 w-4" />} />
        </div>

        {stats.bestRun && (
          <div className="mt-10 max-w-2xl">
            <div className="font-mono-app text-[10px] uppercase tracking-[.35em] text-[#ff8247]">Peak Performance</div>
            <div className="mt-4 border border-[#30433c] bg-[#0d1717]/85 p-6">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <div>
                  <div className="font-mono-app text-[9px] uppercase tracking-[.2em] text-[#71847a]">Score</div>
                  <div className="mt-1 font-display text-2xl font-bold text-[#d3ff35]">{formatNumber(stats.bestRun.finalScore)}</div>
                </div>
                <div>
                  <div className="font-mono-app text-[9px] uppercase tracking-[.2em] text-[#71847a]">Wave</div>
                  <div className="mt-1 font-display text-2xl font-bold text-[#71e7ef]">{stats.bestRun.finalWave}</div>
                </div>
                <div>
                  <div className="font-mono-app text-[9px] uppercase tracking-[.2em] text-[#71847a]">Combo</div>
                  <div className="mt-1 font-display text-2xl font-bold text-[#ff8247]">{stats.bestRun.finalCombo}x</div>
                </div>
                <div>
                  <div className="font-mono-app text-[9px] uppercase tracking-[.2em] text-[#71847a]">Duration</div>
                  <div className="mt-1 font-display text-xl font-bold text-[#ffbd46]">{formatTime(stats.bestRun.duration)}</div>
                </div>
                <div>
                  <div className="font-mono-app text-[9px] uppercase tracking-[.2em] text-[#71847a]">Blade</div>
                  <div className="mt-1 font-mono-app text-sm font-bold text-[#8bff7a]">{stats.bestRun.blade.toUpperCase()}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// ============================================================================
// COSMETICS SHOP
// ============================================================================

export function Cosmetics({ save, setSave, setScreen }: {
  save: SavedData;
  setSave: (value: SavedData) => void;
  setScreen: (screen: Screen) => void;
}) {
  const buyTrail = (trailId: string) => {
    const trail = trailStyles.find((t) => t.id === trailId);
    if (!trail) return;
    if (save.unlockedTrails.includes(trailId as any)) {
      setSave({ ...save, selectedTrail: trailId as any });
      return;
    }
    if (save.coins >= trail.price) {
      setSave({
        ...save,
        coins: save.coins - trail.price,
        unlockedTrails: [...save.unlockedTrails, trailId] as any,
        selectedTrail: trailId as any,
      });
    }
  };

  const buyTheme = (themeId: string) => {
    const theme = hudThemes.find((t) => t.id === themeId);
    if (!theme) return;
    if (save.unlockedThemes.includes(themeId as any)) {
      setSave({ ...save, selectedTheme: themeId as any });
      return;
    }
    if (save.coins >= theme.price) {
      setSave({
        ...save,
        coins: save.coins - theme.price,
        unlockedThemes: [...save.unlockedThemes, themeId] as any,
        selectedTheme: themeId as any,
      });
    }
  };

  return (
    <main className="noise-overlay relative min-h-[100dvh] overflow-hidden bg-[#09100f]">
      <div className="relative z-10 mx-auto min-h-[100dvh] max-w-6xl px-6 py-6 sm:px-10 sm:py-8">
        <ScreenHeader title="Cosmetics" subtitle="Customize your blade" onBack={() => setScreen('menu')} />

        <div className="mt-10">
          <h2 className="font-display text-2xl font-bold text-[#f3f2df] mb-4">Particle Trails</h2>
          <p className="font-mono-app text-xs text-[#9aa99b] mb-6">Change your swipe trail effect.</p>
          <div className="grid gap-4 md:grid-cols-5">
            {trailStyles.map((trail) => (
              <CosmeticCard
                key={trail.id}
                name={trail.name}
                colors={trail.colors}
                unlocked={save.unlockedTrails.includes(trail.id)}
                selected={save.selectedTrail === trail.id}
                onClick={() => buyTrail(trail.id)}
              />
            ))}
          </div>
        </div>

        <div className="mt-14">
          <h2 className="font-display text-2xl font-bold text-[#f3f2df] mb-4">HUD Themes</h2>
          <p className="font-mono-app text-xs text-[#9aa99b] mb-6">Change the UI color scheme.</p>
          <div className="grid gap-4 md:grid-cols-5">
            {hudThemes.map((theme) => (
              <CosmeticCard
                key={theme.id}
                name={theme.name}
                colors={[theme.primaryColor, theme.accentColor]}
                unlocked={save.unlockedThemes.includes(theme.id)}
                selected={save.selectedTheme === theme.id}
                onClick={() => buyTheme(theme.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

// ============================================================================
// SKILL TREE
// ============================================================================

export function SkillTree({ save, setSave, setScreen }: {
  save: SavedData;
  setSave: (value: SavedData) => void;
  setScreen: (screen: Screen) => void;
}) {
  const unlockSkill = (skillId: string) => {
    if (save.unlockedSkills.includes(skillId as any)) return;
    const skill = skillTree.find((s) => s.id === skillId);
    if (!skill || save.coins < skill.cost) return;

    setSave({
      ...save,
      coins: save.coins - skill.cost,
      unlockedSkills: [...save.unlockedSkills, skillId] as any,
      skillLevels: { ...save.skillLevels, [skillId]: 1 },
      xp: save.xp + 10,
    });
  };

  return (
    <main className="noise-overlay relative min-h-[100dvh] overflow-hidden bg-[#09100f]">
      <div className="relative z-10 mx-auto min-h-[100dvh] max-w-6xl px-6 py-6 sm:px-10 sm:py-8">
        <ScreenHeader title="Skill Tree" subtitle="Permanent upgrades" onBack={() => setScreen('menu')} />

        <div className="mt-10 max-w-2xl">
          <p className="font-mono-app text-xs text-[#9aa99b] mb-8">
            Unlock permanent upgrades to customize your playstyle. Each skill is a one-time investment that applies to all future runs.
          </p>
          <div className="mb-6 p-4 border border-[#30433c] bg-[#0d1717]/85">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono-app text-[9px] uppercase tracking-[.2em] text-[#71847a]">Available Coins</div>
                <div className="mt-1 font-display text-2xl font-bold text-[#ffbd46]">{formatNumber(save.coins)}</div>
              </div>
              <div>
                <div className="font-mono-app text-[9px] uppercase tracking-[.2em] text-[#71847a]">Skills Unlocked</div>
                <div className="mt-1 font-display text-2xl font-bold text-[#d3ff35]">{save.unlockedSkills.length} / {skillTree.length}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {skillTree.map((skill) => (
            <button
              type="button"
              key={skill.id}
              onClick={() => unlockSkill(skill.id)}
              disabled={save.unlockedSkills.includes(skill.id) || save.coins < skill.cost}
              className="disabled:opacity-50"
            >
              <SkillCard
                name={skill.name}
                description={skill.description}
                cost={skill.cost}
                unlocked={save.unlockedSkills.includes(skill.id)}
                onClick={() => unlockSkill(skill.id)}
              />
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}

const skillTree = [
  { id: 'combodecay', name: 'Combo Decay', description: 'Combo decays 20% slower', cost: 100 },
  { id: 'startlives', name: 'Fortified', description: '+1 starting life', cost: 200 },
  { id: 'powerupboost', name: 'Power Surge', description: 'Power-up duration +25%', cost: 150 },
  { id: 'coinmultiplier', name: 'Wealth', description: 'Coins earned +20%', cost: 250 },
  { id: 'scoreboost', name: 'Score Ascent', description: 'Score +15%', cost: 200 },
  { id: 'fruitluck', name: 'Fruit Luck', description: 'Fruit spawn rate +30%', cost: 180 },
];
