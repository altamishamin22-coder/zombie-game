// Lightweight procedural sound engine — everything is synthesized with the
// Web Audio API so the game never has to ship or load external audio files.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicNode: { stop: () => void } | null = null;
let muted = false;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
  }
  return ctx;
}

export function setMuted(value: boolean) {
  muted = value;
  if (master) master.gain.value = value ? 0 : 0.55;
  if (value) stopMusic();
}

export function resumeAudio() {
  const c = getCtx();
  if (c && c.state === 'suspended') void c.resume();
}

function tone(
  freq: number,
  duration: number,
  {
    type = 'sine' as OscillatorType,
    gain = 0.3,
    slideTo,
    delay = 0,
    filterFreq,
  }: { type?: OscillatorType; gain?: number; slideTo?: number; delay?: number; filterFreq?: number } = {},
) {
  const c = getCtx();
  if (!c || !master || muted) return;
  const start = c.currentTime + delay;
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), start + duration);
  const env = c.createGain();
  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(gain, start + Math.min(0.02, duration * 0.3));
  env.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  let node: AudioNode = env;
  if (filterFreq) {
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    node = filter;
    env.connect(filter);
  }
  osc.connect(env);
  node.connect(master);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

function noiseBurst(duration: number, { gain = 0.25, delay = 0, filterFreq = 2200 }: { gain?: number; delay?: number; filterFreq?: number } = {}) {
  const c = getCtx();
  if (!c || !master || muted) return;
  const start = c.currentTime + delay;
  const bufferSize = Math.floor(c.sampleRate * duration);
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  const env = c.createGain();
  env.gain.setValueAtTime(gain, start);
  env.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  src.connect(filter);
  filter.connect(env);
  env.connect(master);
  src.start(start);
  src.stop(start + duration + 0.05);
}

export const sfx = {
  sliceZombie(comboLevel = 1) {
    const pitch = 520 + Math.min(comboLevel, 12) * 34;
    tone(pitch, 0.14, { type: 'triangle', gain: 0.22, slideTo: pitch * 0.5 });
    noiseBurst(0.09, { gain: 0.18, filterFreq: 3200 });
  },
  sliceFruit() {
    tone(880, 0.16, { type: 'sine', gain: 0.22, slideTo: 1400 });
    tone(1320, 0.12, { type: 'sine', gain: 0.12, delay: 0.02, slideTo: 1760 });
  },
  slicePowerup() {
    tone(660, 0.22, { type: 'square', gain: 0.16, slideTo: 1320 });
    tone(990, 0.22, { type: 'sine', gain: 0.14, delay: 0.05, slideTo: 1760 });
  },
  rescueSurvivor() {
    tone(523, 0.14, { type: 'sine', gain: 0.2 });
    tone(659, 0.14, { type: 'sine', gain: 0.2, delay: 0.09 });
    tone(784, 0.22, { type: 'sine', gain: 0.22, delay: 0.18 });
  },
  bombHit() {
    noiseBurst(0.35, { gain: 0.4, filterFreq: 900 });
    tone(120, 0.4, { type: 'sawtooth', gain: 0.3, slideTo: 40 });
  },
  bossHit() {
    tone(160, 0.12, { type: 'square', gain: 0.22, slideTo: 90 });
    noiseBurst(0.1, { gain: 0.15, filterFreq: 1400 });
  },
  bossDefeated() {
    [0, 0.1, 0.2, 0.32].forEach((delay, index) => tone(300 + index * 140, 0.22, { type: 'triangle', gain: 0.24, delay, slideTo: 300 + index * 220 }));
  },
  lifeLost() {
    tone(200, 0.3, { type: 'sawtooth', gain: 0.25, slideTo: 70 });
  },
  waveUp() {
    tone(440, 0.16, { type: 'sine', gain: 0.18, slideTo: 660 });
    tone(660, 0.2, { type: 'sine', gain: 0.16, delay: 0.1, slideTo: 880 });
  },
  achievement() {
    [0, 0.09, 0.18].forEach((delay, index) => tone(523 * Math.pow(1.2599, index), 0.18, { type: 'triangle', gain: 0.2, delay }));
  },
  uiClick() {
    tone(320, 0.06, { type: 'square', gain: 0.12, slideTo: 220 });
  },
  uiConfirm() {
    tone(500, 0.1, { type: 'sine', gain: 0.16, slideTo: 760 });
  },
  gameOver() {
    tone(300, 0.5, { type: 'sawtooth', gain: 0.22, slideTo: 60 });
  },
};

// A minimal procedural ambient pad/beat loop so the background isn't silent
// during menus and runs — synthesized, no assets.
export function startMusic() {
  const c = getCtx();
  if (!c || !master || muted || musicNode) return;
  const bus = c.createGain();
  bus.gain.value = 0.12;
  bus.connect(master);

  const pad = c.createOscillator();
  pad.type = 'sine';
  pad.frequency.value = 65.4; // C2
  const pad2 = c.createOscillator();
  pad2.type = 'sine';
  pad2.frequency.value = 98; // G2
  const padGain = c.createGain();
  padGain.gain.value = 0.5;
  pad.connect(padGain);
  pad2.connect(padGain);
  padGain.connect(bus);
  pad.start();
  pad2.start();

  let stopped = false;
  let beatTimer: number | null = null;
  const scheduleBeat = () => {
    if (stopped) return;
    noiseBurst(0.05, { gain: 0.05, filterFreq: 500 });
    beatTimer = window.setTimeout(scheduleBeat, 900);
  };
  scheduleBeat();

  musicNode = {
    stop: () => {
      stopped = true;
      if (beatTimer) window.clearTimeout(beatTimer);
      try {
        pad.stop();
        pad2.stop();
      } catch {
        // already stopped
      }
      bus.disconnect();
    },
  };
}

export function stopMusic() {
  musicNode?.stop();
  musicNode = null;
}

// ---------------------------------------------------------------------------
// Haptics — short vibration patterns for phones that support the Vibration
// API. Silently does nothing on devices/browsers without support (desktop,
// iOS Safari) or while the setting is turned off.
// ---------------------------------------------------------------------------

let hapticsEnabled = true;

export function setHapticsEnabled(value: boolean) {
  hapticsEnabled = value;
}

function vibrate(pattern: number | number[]) {
  if (!hapticsEnabled) return;
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
  } catch {
    // unsupported — ignore
  }
}

export const haptics = {
  tap: () => vibrate(8),
  slice: () => vibrate(6),
  rescue: () => vibrate(16),
  hazard: () => vibrate([0, 35, 40, 35]),
  bossHit: () => vibrate(10),
  bossDefeated: () => vibrate([0, 30, 40, 30, 40, 60]),
  achievement: () => vibrate([0, 18, 30, 18]),
  gameOver: () => vibrate([0, 50, 60, 50]),
};
