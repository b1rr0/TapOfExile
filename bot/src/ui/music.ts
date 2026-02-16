/**
 * Global music manager — singleton.
 * Persists across scene switches so the track doesn't restart
 * every time the player returns to hideout.
 */

const STORAGE_KEY = "toe_music_enabled";

class MusicManager {
  private audio: HTMLAudioElement | null = null;
  private _enabled: boolean;
  private _src: string = "";

  constructor() {
    const stored = localStorage.getItem(STORAGE_KEY);
    this._enabled = stored === null ? true : stored === "1";
  }

  get enabled(): boolean {
    return this._enabled;
  }

  /** Start (or resume) a track. Does nothing if already playing the same src. */
  play(src: string): void {
    if (this.audio && this._src === src) {
      // Same track — just resume if enabled
      if (this._enabled && this.audio.paused) {
        this.audio.play().catch(() => {});
      }
      return;
    }

    // Different track or first call — create element
    this.stop();
    this._src = src;
    this.audio = new Audio(src);
    this.audio.loop = true;
    this.audio.volume = 0.35;

    if (this._enabled) {
      this.audio.play().catch(() => {});
    }
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = "";
      this.audio = null;
      this._src = "";
    }
  }

  toggle(): boolean {
    this._enabled = !this._enabled;
    localStorage.setItem(STORAGE_KEY, this._enabled ? "1" : "0");

    if (this.audio) {
      if (this._enabled) {
        this.audio.play().catch(() => {});
      } else {
        this.audio.pause();
      }
    }

    return this._enabled;
  }
}

export const music = new MusicManager();
