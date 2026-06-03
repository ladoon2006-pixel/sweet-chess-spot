// Real chess sounds (Lichess open-source pack served from /public/sounds).
// Menu click is synthesised via WebAudio for a clean UI click instead of a piece-move sound.
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

// ---- Menu click (synthesised) ----
let audioCtx: AudioContext | null = null;
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

export function playMenuClick() {
  const ac = ctx();
  if (!ac) return;
  try {
    if (ac.state === "suspended") void ac.resume();
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(1100, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.04);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    osc.connect(gain).connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.07);
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
