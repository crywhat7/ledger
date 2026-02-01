let audio: HTMLAudioElement | null = null;

/** Click tipo shutter con Web Audio API. Funciona sin ningún archivo. */
function playSyntheticClick() {
  if (typeof window === "undefined") return;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 1200;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.start(now);
    osc.stop(now + 0.05);
  } catch {
    // no sound
  }
}

/**
 * Sonido al registrar un movimiento (tipo shutter).
 * Por defecto usa un click sintético (no requiere archivo).
 * Si querés usar tu propio sonido: poné un archivo en /public/click.mp3.
 */
export function playShutterSound() {
  if (typeof window === "undefined") return;
  try {
    if (!audio) {
      audio = new Audio("/click.mp3");
      audio.volume = 0.35;
    }
    audio.currentTime = 0;
    audio.play().catch(() => playSyntheticClick());
  } catch {
    playSyntheticClick();
  }
}
