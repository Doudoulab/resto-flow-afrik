/**
 * Real notification beep using Web Audio API.
 * The previous base64 WAV stub was empty (0 PCM bytes) and produced no sound.
 */

let ctx: AudioContext | null = null;

const getCtx = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  return ctx;
};

export const playBeep = (frequency = 880, duration = 220, volume = 0.35): void => {
  const c = getCtx();
  if (!c) return;
  try {
    if (c.state === "suspended") c.resume().catch(() => {});
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(c.destination);
    const now = c.currentTime;
    gain.gain.linearRampToValueAtTime(volume, now + 0.01);
    gain.gain.linearRampToValueAtTime(0, now + duration / 1000);
    osc.start(now);
    osc.stop(now + duration / 1000 + 0.02);
  } catch { /* ignore */ }
};

/** Two-tone alert for new orders */
export const playNewOrderAlert = (): void => {
  playBeep(880, 180, 0.4);
  setTimeout(() => playBeep(1175, 220, 0.4), 200);
};
