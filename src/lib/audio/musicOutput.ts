"use client";

/**
 * Hintergrundmusik so, dass ihre Lautstärke auf JEDEM Gerät wirkt.
 *
 * Problem iPhone/iPad (Safari UND Chrome, beide WebKit):
 * 1. HTMLMediaElement.volume wird ignoriert (immer 100 %).
 * 2. Auch der übliche Umweg – <audio> per createMediaElementSource in einen
 *    GainNode – greift dort nicht zuverlässig: WebKit-Bugs 151589 (seit iOS 9
 *    offen) und 276813 (offen, Safari 17–27). Ergebnis im Usability-Test und
 *    im iPhone-Test 2026-11: Musik selbst bei "5 %" so laut, dass die Stimme
 *    nicht zu verstehen war.
 *
 * Lösung: Auf iOS spielt die Musik gar nicht über ein <audio>-Element,
 * sondern als dekodierter Puffer direkt in Web Audio (AudioBufferSourceNode →
 * GainNode). Dort wirkt die Lautstärke garantiert – genau so umgehen
 * Spiele-Engines (z. B. Construct) denselben Fehler. createMusicAudio()
 * liefert dafür ein Objekt, das sich wie ein <audio>-Element verhält (play,
 * pause, currentTime, duration, loop, Events), damit die Player-Logik
 * unverändert bleiben kann.
 *
 * Desktop und Android: wie bisher ein normales <audio> mit .volume.
 *
 * Fehlerfall: Läuft der AudioContext nicht (nicht entsperrt, unterbrochen),
 * bleibt die Musik STUMM – nie laut, nie die Stimme betroffen.
 * Lieber keine Musik als unverständliche Stimme.
 *
 * Speicher: Dekodiert wird erst beim Abspielen und mit 24 kHz (Hintergrund-
 * musik unter einer Stimme klingt damit gleich) – ein 4-Minuten-Track
 * ≈ 46 MB. Es bleibt immer nur der Track der laufenden Story im Speicher.
 */

let elementVolumeWorks: boolean | null = null;
let context: AudioContext | null = null;
const targetVolumes = new WeakMap<object, number>();

/** iPhone, iPod, iPad (auch iPadOS, das sich als Mac ausgibt). */
export function isIOSWebKit(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return /Macintosh/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1;
}

/** false auf iOS: dort wirkt .volume nicht (liest meist 1, teils auch den gesetzten Wert – ohne Wirkung). */
export function canSetElementVolume(): boolean {
  if (elementVolumeWorks !== null) return elementVolumeWorks;
  if (typeof document === "undefined") return true;
  if (isIOSWebKit()) {
    elementVolumeWorks = false;
    return false;
  }
  try {
    const probe = document.createElement("audio");
    probe.volume = 0.5;
    elementVolumeWorks = Math.abs(probe.volume - 0.5) < 0.01;
  } catch {
    elementVolumeWorks = true;
  }
  return elementVolumeWorks;
}

function hasWebAudio(): boolean {
  if (typeof window === "undefined") return false;
  return !!((window as any).AudioContext || (window as any).webkitAudioContext);
}

/**
 * Zum Testen am Desktop: localStorage "ps_force_buffer_music" = "1" erzwingt
 * den iOS-Weg (Puffer-Musik) – derselbe Web-Audio-Code wie auf dem iPhone.
 */
function forcedBufferMusic(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem("ps_force_buffer_music") === "1";
  } catch {
    return false;
  }
}

/** Musik über Web-Audio-Puffer statt <audio> (nur wo .volume nicht wirkt). */
function shouldUseBufferMusic(): boolean {
  return (forcedBufferMusic() || !canSetElementVolume()) && hasWebAudio();
}

function getContext(): AudioContext | null {
  if (context) return context;
  try {
    const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor() as AudioContext;
    // Nach Anruf/Siri meldet iOS "interrupted" – sobald es wieder darf, weiterlaufen.
    context.addEventListener("statechange", () => {
      if (context && context.state !== "running" && context.state !== "closed") {
        context.resume().catch(() => {});
      }
    });
    // iOS suspendiert den Context teils im Hintergrund/bei gesperrtem Bildschirm
    // (WebKit-Bug 261554). Beim Zurückkehren sofort wieder anwerfen.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && context && context.state !== "running" && context.state !== "closed") {
        context.resume().catch(() => {});
      }
    });
    return context;
  } catch (err) {
    console.warn("[musicOutput] AudioContext nicht verfügbar:", err);
    return null;
  }
}

/**
 * Synchron im Klick-Handler aufrufen (vor jedem await): Auf iOS darf der
 * AudioContext nur innerhalb einer Nutzergeste starten.
 */
export function unlockMusicAudio(): void {
  if (!shouldUseBufferMusic()) return;

  // iOS 16.4+: Wiedergabe-Session, damit der Stummschalter die Web-Audio-Musik
  // nicht stummschaltet, während die Stimme (normales Audio-Element) weiterläuft.
  try {
    const session = (navigator as any).audioSession;
    if (session && session.type !== "playback") session.type = "playback";
  } catch {
    /* ältere iOS-Versionen */
  }

  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state !== "running") ctx.resume().catch(() => {});
  // Ein kurzer stiller Puffer im selben Tippen entsperrt ältere iOS-Versionen zuverlässig.
  try {
    const silent = ctx.createBuffer(1, 1, 22050);
    const node = ctx.createBufferSource();
    node.buffer = silent;
    node.connect(ctx.destination);
    node.start(0);
  } catch {
    /* egal */
  }
}

// ---------------------------------------------------------------------------
// Puffer-Musik (iOS)
// ---------------------------------------------------------------------------

/** Dekodier-Rate: Hintergrundmusik unter der Stimme – 24 kHz reichen und sparen Speicher. */
const DECODE_SAMPLE_RATE = 24000;

/** Nur der zuletzt dekodierte Track bleibt im Speicher (gleiche URL = sofort da). */
let decodeCache: { url: string; promise: Promise<AudioBuffer> } | null = null;
/** Die Musik, die zuletzt gespielt hat – alle anderen geben ihren Puffer frei. */
let lastPlaying: BufferMusic | null = null;

function becomeLastPlaying(player: BufferMusic) {
  if (lastPlaying && lastPlaying !== player && lastPlaying.paused) lastPlaying.release();
  lastPlaying = player;
  // Nur im Testmodus (ps_force_buffer_music): Zustand in der Konsole prüfbar.
  if (forcedBufferMusic()) (window as any).__psBufferMusic = player;
}

function decodeArrayBuffer(data: ArrayBuffer): Promise<AudioBuffer> {
  const decodeWith = (ctx: BaseAudioContext) =>
    new Promise<AudioBuffer>((resolve, reject) => {
      // Ältere WebKit-Versionen kennen nur die Callback-Form.
      const result = ctx.decodeAudioData(data.slice(0), resolve, reject);
      if (result && typeof (result as Promise<AudioBuffer>).then === "function") {
        (result as Promise<AudioBuffer>).then(resolve, reject);
      }
    });
  try {
    const Offline = (window as any).OfflineAudioContext || (window as any).webkitOfflineAudioContext;
    if (Offline) {
      // decodeAudioData rechnet auf die Rate des Contexts um → kleiner Puffer.
      const offline = new Offline(2, 1, DECODE_SAMPLE_RATE) as OfflineAudioContext;
      return decodeWith(offline).catch(() => {
        const ctx = getContext();
        if (!ctx) throw new Error("Kein AudioContext");
        return decodeWith(ctx);
      });
    }
  } catch {
    /* ältere Browser: unten mit dem normalen Context */
  }
  const ctx = getContext();
  if (!ctx) return Promise.reject(new Error("Kein AudioContext"));
  return decodeWith(ctx);
}

function loadBuffer(url: string): Promise<AudioBuffer> {
  if (decodeCache?.url === url) return decodeCache.promise;
  const promise = fetch(url, { mode: "cors" })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.arrayBuffer();
    })
    .then(decodeArrayBuffer);
  decodeCache = { url, promise };
  promise.catch(() => {
    if (decodeCache?.promise === promise) decodeCache = null;
  });
  return promise;
}

/**
 * Verhält sich für die Player wie ein <audio>-Element (die genutzte
 * Teilmenge): src, preload, load(), play(), pause(), currentTime, duration,
 * paused, ended, loop, muted, volume, readyState und die Events
 * loadedmetadata, durationchange, canplay, canplaythrough, play, playing,
 * pause, ended, timeupdate, error.
 *
 * Laden: bei preload="auto" sofort beim Setzen von src, sonst beim ersten play().
 */
class BufferMusic extends EventTarget {
  private _src = "";
  private _buffer: AudioBuffer | null = null;
  private _loading: Promise<void> | null = null;
  private _duration = NaN;
  private _offset = 0;
  private _startedAt = 0;
  private _paused = true;
  private _ended = false;
  private _loop = false;
  private _muted = false;
  private _volume = 1;
  private _wantPlay = false;
  private _source: AudioBufferSourceNode | null = null;
  private _gain: GainNode | null = null;
  private _ticker: ReturnType<typeof setInterval> | null = null;

  preload = "auto";
  crossOrigin: string | null = null;
  playsInline = true;
  error: { code: number; message: string } | null = null;

  // ----- Attribute wie bei <audio> -----

  get src() {
    return this._src;
  }

  set src(value: string) {
    const next = value || "";
    if (next === this._src) return;
    this._stopSource();
    this._stopTicker();
    this._src = next;
    this._buffer = null;
    this._loading = null;
    this._duration = NaN;
    this._offset = 0;
    this._ended = false;
    this.error = null;
    if (next && this.preload === "auto") void this._load();
  }

  get duration() {
    return this._duration;
  }

  get paused() {
    return this._paused;
  }

  get ended() {
    return this._ended;
  }

  get readyState() {
    return this._buffer ? 4 : isFinite(this._duration) ? 1 : 0;
  }

  get loop() {
    return this._loop;
  }

  set loop(value: boolean) {
    const next = !!value;
    if (next === this._loop) return;
    // Laufend umschalten: Position mit der alten Regel festhalten, neu ansetzen.
    const playing = !this._paused && !!this._source;
    const position = this.currentTime;
    this._loop = next;
    if (playing) this._startSource(position);
  }

  get muted() {
    return this._muted;
  }

  set muted(value: boolean) {
    this._muted = !!value;
    this._applyGain();
  }

  get volume() {
    return this._volume;
  }

  set volume(value: number) {
    this._volume = Math.min(1, Math.max(0, isFinite(value) ? value : 0));
    this._applyGain();
  }

  get currentTime() {
    if (!this._paused && this._source && context) {
      const position = context.currentTime - this._startedAt;
      const dur = this._duration;
      if (!isFinite(dur) || dur <= 0) return Math.max(0, position);
      return this._loop ? position % dur : Math.min(Math.max(0, position), dur);
    }
    return this._offset;
  }

  set currentTime(value: number) {
    const dur = this._duration;
    let next = Math.max(0, isFinite(value) ? value : 0);
    if (isFinite(dur) && dur > 0) next = this._loop ? next % dur : Math.min(next, dur);
    this._offset = next;
    if (!isFinite(dur) || next < dur) this._ended = false;
    if (!this._paused && this._buffer) this._startSource(next);
    this._emit("timeupdate");
  }

  setAttribute() {
    /* playsinline o. Ä. – für Puffer-Musik bedeutungslos */
  }

  removeAttribute(name: string) {
    if (name === "src") this.src = "";
  }

  load() {
    if (this._src && !this._buffer) void this._load();
  }

  // ----- Wiedergabe -----

  play(): Promise<void> {
    if (!this._src) return Promise.reject(new DOMException("Keine Quelle", "NotSupportedError"));
    if (this._ended) {
      this._offset = 0;
      this._ended = false;
    }
    const wasPaused = this._paused;
    this._paused = false;
    this._wantPlay = true;
    if (wasPaused) this._emit("play");

    if (this._buffer) {
      this._startSource(this._offset);
      return Promise.resolve();
    }
    return this._load().then(() => {
      if (this._wantPlay && !this._paused && this._buffer) this._startSource(this._offset);
    });
  }

  pause() {
    this._wantPlay = false;
    if (this._paused) return;
    this._offset = this.currentTime;
    this._stopSource();
    this._stopTicker();
    this._paused = true;
    this._emit("pause");
  }

  /** Puffer freigeben (Speicher). Beim nächsten play() wird neu geladen. */
  release() {
    this.pause();
    this._buffer = null;
    this._loading = null;
  }

  /** Vom Graphen trennen und alles freigeben (Player wird verworfen). */
  dispose() {
    this.release();
    try {
      this._gain?.disconnect();
    } catch {
      /* egal */
    }
    this._gain = null;
    if (lastPlaying === this) lastPlaying = null;
  }

  // ----- intern -----

  private _emit(type: string) {
    try {
      this.dispatchEvent(new Event(type));
    } catch {
      /* egal */
    }
  }

  private _ensureGain(): GainNode | null {
    if (this._gain) return this._gain;
    const ctx = getContext();
    if (!ctx) return null;
    const gain = ctx.createGain();
    gain.gain.value = this._muted ? 0 : this._volume;
    gain.connect(ctx.destination);
    this._gain = gain;
    return gain;
  }

  private _applyGain() {
    const gain = this._gain;
    if (!gain) return;
    const target = this._muted ? 0 : this._volume;
    try {
      const now = gain.context.currentTime;
      gain.gain.cancelScheduledValues(now);
      // Kurze Rampe statt Sprung – kein Knacken beim Ziehen am Regler.
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(target, now + 0.05);
    } catch {
      gain.gain.value = target;
    }
  }

  private _load(): Promise<void> {
    if (this._buffer) return Promise.resolve();
    if (this._loading) return this._loading;
    const url = this._src;
    const loading = loadBuffer(url)
      .then((buffer) => {
        if (this._src !== url || this._loading !== loading) return;
        this._buffer = buffer;
        const firstTime = !isFinite(this._duration);
        this._duration = buffer.duration;
        if (firstTime) {
          this._emit("loadedmetadata");
          this._emit("durationchange");
        }
        this._emit("canplay");
        this._emit("canplaythrough");
      })
      .catch((err) => {
        if (this._src !== url) return;
        console.warn("[musicOutput] Musik konnte nicht geladen werden:", err);
        this._loading = null;
        this.error = { code: 4, message: String(err?.message || err) };
        this._wantPlay = false;
        if (!this._paused) {
          this._paused = true;
          this._emit("pause");
        }
        this._emit("error");
      });
    this._loading = loading;
    return loading;
  }

  private _startSource(offset: number) {
    const ctx = getContext();
    const gain = this._ensureGain();
    const buffer = this._buffer;
    if (!ctx || !gain || !buffer) return;

    // Nur eine Puffer-Musik zur Zeit hält ihren Puffer – die vorige gibt ihn frei.
    becomeLastPlaying(this);

    this._stopSource();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = this._loop;
    source.connect(gain);
    const dur = buffer.duration;
    const start = dur > 0 ? (this._loop ? offset % dur : Math.min(offset, dur)) : 0;
    source.onended = () => {
      // Nur das natürliche Ende der aktuellen Quelle zählt (nicht stop()).
      if (this._source !== source || this._loop) return;
      this._source = null;
      this._stopTicker();
      this._offset = dur;
      this._ended = true;
      this._paused = true;
      this._wantPlay = false;
      this._emit("timeupdate");
      this._emit("pause");
      this._emit("ended");
    };
    try {
      source.start(0, start);
    } catch {
      return;
    }
    this._source = source;
    this._startedAt = ctx.currentTime - start;
    this._ended = false;
    this._startTicker();
    this._emit("playing");
  }

  private _stopSource() {
    const source = this._source;
    if (!source) return;
    this._source = null;
    source.onended = null;
    try {
      source.stop();
    } catch {
      /* bereits gestoppt */
    }
    try {
      source.disconnect();
    } catch {
      /* egal */
    }
  }

  private _startTicker() {
    if (this._ticker) return;
    this._ticker = setInterval(() => this._emit("timeupdate"), 250);
  }

  private _stopTicker() {
    if (!this._ticker) return;
    clearInterval(this._ticker);
    this._ticker = null;
  }
}

export function isBufferMusic(el: unknown): el is BufferMusic {
  return el instanceof BufferMusic;
}

/**
 * Musik-"Element" für die Player. Auf iOS eine Puffer-Musik (siehe oben),
 * sonst ein normales <audio>. Typ HTMLAudioElement, damit die Player-Logik
 * gleich bleibt – die Puffer-Musik unterstützt genau die dort genutzten Teile.
 */
export function createMusicAudio(): HTMLAudioElement {
  if (shouldUseBufferMusic()) return new BufferMusic() as unknown as HTMLAudioElement;
  return new Audio();
}

// ---------------------------------------------------------------------------
// Lautstärke (für beide Arten)
// ---------------------------------------------------------------------------

/**
 * Direkt nach createMusicAudio() und VOR dem Setzen von src aufrufen.
 * Setzt die Startlautstärke (0 = stumm).
 */
export function attachMusicElement(el: HTMLMediaElement, volume: number): void {
  setMusicElementVolume(el, volume);
}

/** Wirkt sofort, auch während der Wiedergabe. */
export function setMusicElementVolume(el: HTMLMediaElement, volume: number): void {
  const v = Math.min(1, Math.max(0, isFinite(volume) ? volume : 0));
  targetVolumes.set(el, v);
  // "Aus" ist immer stumm – muted funktioniert überall.
  el.muted = v <= 0;
  if (isBufferMusic(el)) {
    el.volume = v;
    return;
  }
  if (canSetElementVolume()) el.volume = v;
}

export function getMusicElementVolume(el: HTMLMediaElement): number {
  return targetVolumes.get(el) ?? (canSetElementVolume() || isBufferMusic(el) ? el.volume : 0);
}

/** Beim Wegwerfen eines Musik-Elements: Puffer und Knoten freigeben. */
export function detachMusicElement(el: HTMLMediaElement): void {
  if (isBufferMusic(el)) el.dispose();
}
