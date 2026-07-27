ZOMBIE SLICE — PREMIUM UPGRADE PACK
====================================

WHAT THIS IS
This replaces 4 files inside your existing Replit project's `src/` folder:
  - src/App.tsx           (rewritten — new mechanics, UI, effects)
  - src/index.css         (added one small animation for screen transitions)
  - src/main.tsx           (unchanged, included for completeness)
  - src/lib/gameData.ts   (NEW file — types, blades, achievements, daily challenge)
  - src/lib/audio.ts       (NEW file — synthesized sound engine, no audio assets needed)

HOW TO APPLY
1. In your Replit project, replace src/App.tsx and src/index.css with the versions here.
2. Create a src/lib/ folder if it doesn't exist and add gameData.ts and audio.ts.
3. Run your existing dev/build workflow as normal — no new dependencies were added
   (only lucide-react, which your project already has).
4. Old saves are auto-migrated: existing coins/high score carry over, new fields
   (achievements, daily challenge, fruit/rescue counters) start fresh.

WHAT'S NEW

Sound (previously silent)
  - Fully synthesized sound effects (slice, fruit, rescue, bomb, boss hits, UI clicks,
    achievement pop) using the Web Audio API — no audio files to host or load.
  - A minimal ambient pad + heartbeat "music" loop, toggle separate from SFX.
  - The mute toggle in Settings now actually mutes; added a second toggle for music.

New gameplay mechanics
  - Fruit: common bonus targets (apple icons) that give small score + coins — the
    "give me something else to cut" variety you asked for, mixed in with zombies.
  - Survivor rescue: the unused "survivor" entity type in the original code is now
    a real mechanic — slice a glowing gold survivor to gain +1 life and bonus score.
  - Power-up orbs: Freeze (slows all enemies), 2x Score, and Shield (absorbs the next
    bomb hit) — rare hexagonal pickups.
  - Boss waves: every 6th wave spawns a large multi-hit boss with an on-screen health
    bar; defeating it pays out a big score + coin bonus.

Progression
  - 12 achievements (combo streaks, rescues, fruit slicing, boss kills, score milestones,
    collecting all blades, survival time) — each grants a coin reward and pops a toast.
  - A daily challenge card on the menu that rotates automatically each day from a pool
    of 5 challenge types, with its own coin reward.
  - 3 new blades (6 total) each with a distinct passive: Cryo Fang (longer power-ups),
    Quake Splitter (absorbs your first hazard hit each run), Aurora Veil (+30% fruit coins).

Visual / juice polish
  - Real Settings toggles: Swipe Assist now actually widens the hit detection radius;
    Screen FX now actually reduces particle count and screen shake when turned off.
  - Boss health bar, power-up status chips (freeze/2x/shield) in the HUD.
  - Shockwave ring particles on bombs, boss hits, and rescues; a soft red screen flash
    when you take damage.
  - A quick cross-fade transition whenever you switch screens instead of a hard cut.

FILES YOU DON'T NEED TO TOUCH
Your existing shadcn/ui component library (src/components/ui/*), hooks, and
public/ assets (manifest, service worker, icons) are untouched and still work as-is.
