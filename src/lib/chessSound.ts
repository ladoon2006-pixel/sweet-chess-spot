// Realistic wood-click move sound generated with Web Audio API.
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

type SoundKind = "move" | "capture" | "check" | "castle" | "promote" | "end";

export function playSound(kind: SoundKind = "move") {
  const ac = getCtx();
  if (!ac) return;
  if (ac.state === "suspended") ac.resume();

  const now = ac.currentTime;

  // Short filtered noise burst → wood "tock"
  const bufferSize = Math.floor(ac.sampleRate * 0.12);
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
  }
  const noise = ac.createBufferSource();
  noise.buffer = buffer;

  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 4;
  bp.frequency.value =
    kind === "capture" ? 320 : kind === "check" ? 900 : kind === "end" ? 240 : 600;

  const gain = ac.createGain();
  const peak = kind === "capture" ? 0.6 : 0.45;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(peak, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

  noise.connect(bp).connect(gain).connect(ac.destination);
  noise.start(now);
  noise.stop(now + 0.16);

  // Add a low thud body
  const osc = ac.createOscillator();
  const oGain = ac.createGain();
  osc.frequency.setValueAtTime(kind === "capture" ? 140 : 180, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.1);
  oGain.gain.setValueAtTime(0.0001, now);
  oGain.gain.linearRampToValueAtTime(0.35, now + 0.005);
  oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  osc.connect(oGain).connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.14);

  if (kind === "check" || kind === "end") {
    const o2 = ac.createOscillator();
    const g2 = ac.createGain();
    o2.type = "triangle";
    o2.frequency.setValueAtTime(kind === "check" ? 880 : 220, now + 0.08);
    g2.gain.setValueAtTime(0.0001, now + 0.08);
    g2.gain.linearRampToValueAtTime(0.25, now + 0.09);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    o2.connect(g2).connect(ac.destination);
    o2.start(now + 0.08);
    o2.stop(now + 0.5);
  }
}
