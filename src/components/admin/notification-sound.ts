"use client";

/** Unlock + play a short inbound-message chime. Failures are silent (autoplay policy). */

let audioUnlocked = false;
let audioEl: HTMLAudioElement | null = null;
let audioContext: AudioContext | null = null;

function ensureUnlockListeners() {
  if (typeof window === "undefined") return;
  if ((window as Window & { __waAudioUnlockBound?: boolean }).__waAudioUnlockBound) {
    return;
  }
  (window as Window & { __waAudioUnlockBound?: boolean }).__waAudioUnlockBound =
    true;

  const unlock = () => {
    audioUnlocked = true;
    void primeAudio();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
}

async function primeAudio() {
  try {
    if (!audioEl) {
      audioEl = new Audio("/sounds/notification.wav");
      audioEl.preload = "auto";
      audioEl.volume = 0.45;
    }
    audioEl.muted = true;
    await audioEl.play();
    audioEl.pause();
    audioEl.currentTime = 0;
    audioEl.muted = false;
  } catch {
    // ignore
  }
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (Ctx && !audioContext) {
      audioContext = new Ctx();
    }
    if (audioContext?.state === "suspended") {
      await audioContext.resume();
    }
  } catch {
    // ignore
  }
}

function playWebAudioBeep() {
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return;
  if (!audioContext) audioContext = new Ctx();
  const ctx = audioContext;
  void ctx.resume().catch(() => undefined);

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
  gain.connect(ctx.destination);

  for (const [freq, start] of [
    [880, 0],
    [1175, 0.05],
  ] as const) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.connect(gain);
    osc.start(now + start);
    osc.stop(now + start + 0.12);
  }
}

export function bindNotificationAudioUnlock() {
  ensureUnlockListeners();
}

export function playInboundNotificationSound() {
  ensureUnlockListeners();
  if (!audioUnlocked) return;

  void (async () => {
    try {
      if (!audioEl) {
        audioEl = new Audio("/sounds/notification.wav");
        audioEl.volume = 0.45;
      }
      audioEl.currentTime = 0;
      await audioEl.play();
      return;
    } catch {
      // fall through to Web Audio
    }
    try {
      playWebAudioBeep();
    } catch {
      // silent
    }
  })();
}
