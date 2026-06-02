// Real chess sounds (Lichess open-source pack served from /public/sounds).
type SoundKind =
  | "click"
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
  click: "/sounds/Move.mp3",
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
    // clone for overlapping playback
    const node = a.cloneNode(true) as HTMLAudioElement;
    node.volume = kind === "click" ? 0.28 : 0.85;
    void node.play().catch(() => {});
  } catch {
    /* ignore */
  }
}

export function playMenuClick() {
  playSound("click");
}

// Warm up on first user interaction (mobile autoplay policies).
if (typeof window !== "undefined") {
  const warm = () => {
    (Object.keys(FILES) as SoundKind[]).forEach((k) => get(k));
    window.removeEventListener("pointerdown", warm);
  };
  window.addEventListener("pointerdown", warm, { once: true });
}
