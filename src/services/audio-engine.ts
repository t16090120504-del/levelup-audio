/**
 * Global audio engine singleton.
 *
 * Wraps a single `HTMLAudioElement` and exposes a typed event system so
 * React components can subscribe to playback updates without each creating
 * their own audio element.
 *
 * The `timeupdate` event is throttled to fire at most once every 500 ms to
 * avoid excessive re-renders.
 */

/** All events emitted by the audio engine. */
export type AudioEngineEvent =
  | 'timeupdate'
  | 'play'
  | 'pause'
  | 'ended'
  | 'loadedmetadata'
  | 'error'
  | 'canplay'
  | 'buffering';

/**
 * Callback signature for audio engine events.
 *
 * - `timeupdate` receives the current playback position (seconds, `number`).
 * - `loadedmetadata` receives the media duration (seconds, `number`).
 * - `error` receives the native `Event`.
 * - Other events receive no data (`undefined`).
 */
export type AudioEngineCallback = (data?: number | Event) => void;

class AudioEngine {
  /** The underlying audio element, lazily created on first use. */
  private audio: HTMLAudioElement | null = null;

  /** Map of event name -> registered callbacks. */
  private listeners = new Map<AudioEngineEvent, Set<AudioEngineCallback>>();

  /** Timestamp (ms) of the last `timeupdate` emission, for throttling. */
  private lastTimeUpdateEmit = 0;

  /** Minimum interval between `timeupdate` emissions, in milliseconds. */
  private readonly timeUpdateThrottleMs = 500;

  /**
   * Returns the global `HTMLAudioElement`, creating it (and attaching native
   * listeners) on first call. This lazy initialisation keeps the module safe
   * to import during SSR or before the browser DOM is ready.
   */
  private getAudioElement(): HTMLAudioElement {
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.preload = 'metadata';
      this.attachNativeListeners();
    }
    return this.audio;
  }

  /** Wires native `<audio>` events to the engine's emit method. */
  private attachNativeListeners(): void {
    const audio = this.audio;
    if (!audio) return;

    audio.addEventListener('play', () => this.emit('play'));
    audio.addEventListener('pause', () => this.emit('pause'));
    audio.addEventListener('ended', () => this.emit('ended'));
    audio.addEventListener('loadedmetadata', () =>
      this.emit('loadedmetadata', this.getDuration()),
    );
    audio.addEventListener('canplay', () => this.emit('canplay'));
    audio.addEventListener('waiting', () => this.emit('buffering'));
    audio.addEventListener('error', (e: Event) => this.emit('error', e));
    audio.addEventListener('timeupdate', () => this.handleTimeUpdate());
  }

  /** Throttled handler for the native `timeupdate` event. */
  private handleTimeUpdate(): void {
    const now = Date.now();
    if (now - this.lastTimeUpdateEmit >= this.timeUpdateThrottleMs) {
      this.lastTimeUpdateEmit = now;
      this.emit('timeupdate', this.getCurrentTime());
    }
  }

  /** Notifies all registered callbacks for the given event. */
  private emit(event: AudioEngineEvent, data?: number | Event): void {
    this.listeners.get(event)?.forEach((cb) => cb(data));
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Registers a callback for the given event.
   * @param event    - The event name to listen for.
   * @param callback - The function to call when the event fires.
   */
  on(event: AudioEngineEvent, callback: AudioEngineCallback): void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(callback);
  }

  /**
   * Removes a previously registered callback.
   * @param event    - The event name.
   * @param callback - The exact function reference passed to `on`.
   */
  off(event: AudioEngineEvent, callback: AudioEngineCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  /**
   * Loads a new audio source URL into the engine.
   * @param url - The audio file URL to play.
   */
  loadSource(url: string): void {
    const audio = this.getAudioElement();
    audio.src = url;
    audio.load();
  }

  /** Starts (or resumes) playback. May reject if autoplay is blocked. */
  play(): Promise<void> {
    return this.getAudioElement().play();
  }

  /** Pauses playback. */
  pause(): void {
    this.getAudioElement().pause();
  }

  /**
   * Seeks to a specific time in the audio.
   * @param time - The target position in seconds.
   */
  seek(time: number): void {
    this.getAudioElement().currentTime = time;
  }

  /**
   * Sets the playback volume.
   * @param v - Volume from 0 (muted) to 1 (max). Clamped automatically.
   */
  setVolume(v: number): void {
    this.getAudioElement().volume = Math.max(0, Math.min(1, v));
  }

  /**
   * Sets the playback rate (speed).
   * @param r - Playback rate (1 = normal, 2 = double speed, 0.5 = half speed).
   */
  setPlaybackRate(r: number): void {
    this.getAudioElement().playbackRate = r;
  }

  /** Returns the current playback position in seconds (0 if not loaded). */
  getCurrentTime(): number {
    return this.audio?.currentTime ?? 0;
  }

  /** Returns the total duration in seconds (0 if not yet loaded). */
  getDuration(): number {
    const d = this.audio?.duration;
    return typeof d === 'number' && Number.isFinite(d) ? d : 0;
  }
}

/**
 * The shared audio engine singleton.
 *
 * Import this wherever you need to control audio playback or listen for
 * playback events:
 *
 * ```ts
 * import { audioEngine } from '@/services/audio-engine';
 *
 * audioEngine.loadSource(episode.audioUrl);
 * audioEngine.on('timeupdate', (time) => console.log(time));
 * await audioEngine.play();
 * ```
 */
export const audioEngine = new AudioEngine();

export default audioEngine;
