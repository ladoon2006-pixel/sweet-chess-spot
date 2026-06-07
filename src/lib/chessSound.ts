// Real chess sounds — decoded via Web Audio API for zero-latency playback.
// Falls back to HTMLAudio if Web Audio isn't available.
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

// ---- Web Audio core ----
let audioCtx: AudioContext | null = null;
const buffers: Partial<Record<SoundKind, AudioBuffer>> = {};
const loading: Partial<Record<SoundKind, Promise<AudioBuffer | null>>> = {};
const htmlCache: Partial<Record<SoundKind, HTMLAudioElement>> = {};

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

async function loadBuffer(kind: SoundKind): Promise<AudioBuffer | null> {
  if (buffers[kind]) return buffers[kind]!;
  if (loading[kind]) return loading[kind]!;
  const ac = ctx();
  if (!ac) return null;
  const p = (async () => {
    try {
      const res = await fetch(FILES[kind]);
      if (!res.ok) return null;
      const arr = await res.arrayBuffer();
      const buf = await ac.decodeAudioData(arr.slice(0));
      buffers[kind] = buf;
      return buf;
    } catch {
      return null;
    }
  })();
  loading[kind] = p;
  return p;
}

function playViaWebAudio(kind: SoundKind, volume = 0.85): boolean {
  const ac = ctx();
  const buf = buffers[kind];
  if (!ac || !buf) return false;
  try {
    if (ac.state === "suspended") void ac.resume();
    const src = ac.createBufferSource();
    src.buffer = buf;
    const g = ac.createGain();
    g.gain.value = volume;
    src.connect(g).connect(ac.destination);
    src.start(0);
    return true;
  } catch {
    return false;
  }
}

function playViaHtml(kind: SoundKind) {
  if (typeof window === "undefined") return;
  if (!htmlCache[kind]) {
    const a = new Audio(FILES[kind]);
    a.preload = "auto";
    htmlCache[kind] = a;
  }
  try {
    const node = htmlCache[kind]!.cloneNode(true) as HTMLAudioElement;
    node.volume = 0.85;
    void node.play().catch(() => {});
  } catch {
    /* ignore */
  }
}

export function playSound(kind: SoundKind = "move") {
  // Fast path: Web Audio
  if (playViaWebAudio(kind)) return;
  // Kick off load for next time
  void loadBuffer(kind);
  // Immediate fallback
  playViaHtml(kind);
}

// ---- Realistic menu click: short filtered noise burst ----
let noiseBuffer: AudioBuffer | null = null;

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
    const src = ac.createBufferSource();
    src.buffer = getNoiseBuffer(ac);
    const hp = ac.createBiquadFilter();
    hp.type = "highpass"; hp.frequency.value = 1800;
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass"; bp.frequency.value = 3200; bp.Q.value = 1.2;
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.55, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
    src.connect(hp).connect(bp).connect(gain).connect(ac.destination);
    src.start(now); src.stop(now + 0.06);

    const osc = ac.createOscillator();
    const og = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.04);
    og.gain.setValueAtTime(0.0001, now);
    og.gain.exponentialRampToValueAtTime(0.18, now + 0.004);
    og.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    osc.connect(og).connect(ac.destination);
    osc.start(now); osc.stop(now + 0.06);
  } catch {
    /* ignore */
  }
}

// Warm up on first user interaction (mobile autoplay policies).
if (typeof window !== "undefined") {
  const warm = () => {
    const ac = ctx();
    if (ac && ac.state === "suspended") void ac.resume();
    (Object.keys(FILES) as SoundKind[]).forEach((k) => { void loadBuffer(k); });
    window.removeEventListener("pointerdown", warm);
    window.removeEventListener("touchstart", warm);
    window.removeEventListener("keydown", warm);
  };
  window.addEventListener("pointerdown", warm, { once: true });
  window.addEventListener("touchstart", warm, { once: true });
  window.addEventListener("keydown", warm, { once: true });
}
