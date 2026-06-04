// Real chess sounds (Lichess open-source pack served from /public/sounds).
// Menu click is a short noise-burst click for a realistic UI tick.
type SoundKind =
  | "move"
  | "capture"
  | "check"
  | "castle"
  | "promote"
  | "notify"
  | "victory"
  | "defeat"
  | "draw"
  | "lowtime";

const FILES: Record<SoundKind, string> = {
  move: "/sounds/Move.mp3",
  capture: "/sounds/Capture.mp3",
  check: "/sounds/Check.mp3",
  castle: "/sounds/Castle.mp3",
  promote: "/sounds/Move.mp3",
  notify: "/sounds/Genericnotify.mp3",
  victory: "/sounds/Victory.mp3",
  defeat: "/sounds/Defeat.mp3",
  draw: "/sounds/Draw.mp3",
  lowtime: "/sounds/LowTime.mp3",
};

const cache: Partial<Record<SoundKind, HTMLAudioElement>> = {};

function get(kind: SoundKind): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!cache[kind]) {
    const a = new Audio(FILES[kind]);
    a.preload = "auto";
    cache[kind] = a;
  }
  return cache[kind]!;
}

export function playSound(kind: SoundKind = "move") {
  const a = get(kind);
  if (!a) return;
  try {
    const node = a.cloneNode(true) as HTMLAudioElement;
    node.volume = 0.85;
    void node.play().catch(() => {});
  } catch {
    /* ignore */
  }
}

// ---- Realistic menu click: short filtered noise burst ----
let audioCtx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

function getNoiseBuffer(ac: AudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer;
  const len = Math.floor(ac.sampleRate * 0.05);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  noiseBuffer = buf;
  return buf;
}

export function playMenuClick() {
  const ac = ctx();
  if (!ac) return;
  try {
    if (ac.state === "suspended") void ac.resume();
    const now = ac.currentTime;

    // Noise burst — sounds like a real plastic tap
    const src = ac.createBufferSource();
    src.buffer = getNoiseBuffer(ac);
    const hp = ac.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1800;
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 3200;
    bp.Q.value = 1.2;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.55, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
    src.connect(hp).connect(bp).connect(gain).connect(ac.destination);
    src.start(now);
    src.stop(now + 0.06);

    // Tiny low-frequency thump to give it body
    const osc = ac.createOscillator();
    const og = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.04);
    og.gain.setValueAtTime(0.0001, now);
    og.gain.exponentialRampToValueAtTime(0.18, now + 0.004);
    og.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    osc.connect(og).connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  } catch {
    /* ignore */
  }
}

// Warm up on first user interaction (mobile autoplay policies).
if (typeof window !== "undefined") {
  const warm = () => {
    (Object.keys(FILES) as SoundKind[]).forEach((k) => get(k));
    ctx();
    window.removeEventListener("pointerdown", warm);
  };
  window.addEventListener("pointerdown", warm, { once: true });
}
