let audio: HTMLAudioElement | null = null;

export function playShutterSound() {
  if (typeof window === "undefined") return;
  try {
    if (!audio) {
      audio = new Audio("/click.mp3");
      audio.volume = 0.3;
    }
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch {
    // no sound
  }
}
