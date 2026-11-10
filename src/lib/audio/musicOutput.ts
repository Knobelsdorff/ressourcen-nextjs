"use client";

/**
 * Lautstärke der Hintergrundmusik – so, dass sie auch auf dem iPhone wirkt.
 *
 * Warum es das braucht: iOS (Safari UND Chrome, beide WebKit) ignoriert
 * HTMLMediaElement.volume komplett – Setzen bleibt wirkungslos, Lesen liefert
 * immer 1. Die Musik lief auf dem iPhone deshalb mit 100 % statt mit den
 * 5–16 % aus dem Admin, übertönte die Stimme und der Regler tat nichts
 * (Usability-Test 2026-11).
 *
 * Lösung: Wo .volume nicht greift, läuft die Musik über einen Web-Audio-GainNode.
 * Wo .volume greift (Desktop, Android), bleibt es beim bewährten .volume –
 * kein unnötiges Risiko. Zusätzlich setzt Lautstärke 0 immer `muted`: Das
 * funktioniert auf iOS auch ohne Web Audio, "Musik aus" ist also immer stumm.
 *
 * Bewusst KEIN Kompressor: Der DynamicsCompressorNode hebt den Pegel
 * automatisch an (Makeup-Gain) und machte die Musik lauter statt leiser.
 *
 * Fehlerfall: Hängt der AudioContext (nicht entsperrt, unterbrochen), bleibt
 * die Musik stumm – nie die Stimme. Lieber keine Musik als unverständliche Stimme.
 */

type ElementOutput = {
  source: MediaElementAudioSourceNode;
  gain: GainNode;
};

let elementVolumeWorks: boolean | null = null;
let context: AudioContext | null = null;
const outputs = new WeakMap<HTMLMediaElement, ElementOutput>();
const targetVolumes = new WeakMap<HTMLMediaElement, number>();

/** false auf iOS: dort ist .volume schreibgeschützt und liest immer 1. */
export function canSetElementVolume(): boolean {
  if (elementVolumeWorks !== null) return elementVolumeWorks;
  if (typeof document === "undefined") return true;
  try {
    const probe = document.createElement("audio");
    probe.volume = 0.5;
    elementVolumeWorks = Math.abs(probe.volume - 0.5) < 0.01;
  } catch {
    elementVolumeWorks = true;
  }
  return elementVolumeWorks;
}

function needsWebAudio(): boolean {
  if (typeof window === "undefined") return false;
  if (canSetElementVolume()) return false;
  return !!((window as any).AudioContext || (window as any).webkitAudioContext);
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
    // (WebKit-Bug 261554, je nach iOS-Version). Beim Zurückkehren sofort wieder anwerfen.
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
 * Synchron im Klick-Handler aufrufen, BEVOR irgendein await kommt.
 * iOS startet einen AudioContext nur innerhalb einer Nutzer-Geste.
 */
export function unlockMusicAudio(): void {
  if (!needsWebAudio()) return;

  // iOS 16.4+: Wiedergabe-Session, damit der Stummschalter die Web-Audio-Musik
  // nicht stummschaltet, während die Stimme (normales Audio-Element) weiterläuft.
  try {
    const session = (navigator as any).audioSession;
    if (session && session.type !== "playback") session.type = "playback";
  } catch {
    /* ältere iOS-Versionen */
  }

  const ctx = getContext();
  if (ctx && ctx.state !== "running") ctx.resume().catch(() => {});
}

function connect(el: HTMLMediaElement): ElementOutput | null {
  const existing = outputs.get(el);
  if (existing) return existing;
  const ctx = getContext();
  if (!ctx) return null;
  try {
    const source = ctx.createMediaElementSource(el);
    const gain = ctx.createGain();
    gain.gain.value = targetVolumes.get(el) ?? 0;
    source.connect(gain);
    gain.connect(ctx.destination);
    const output = { source, gain };
    outputs.set(el, output);
    return output;
  } catch (err) {
    console.warn("[musicOutput] Web Audio konnte nicht verbunden werden:", err);
    return null;
  }
}

/**
 * Direkt nach `new Audio()` und VOR dem Setzen von src aufrufen:
 * Für Web Audio muss crossOrigin feststehen, bevor geladen wird – sonst
 * liefert der Browser aus Sicherheitsgründen nur Stille.
 */
export function attachMusicElement(el: HTMLMediaElement, volume: number): void {
  targetVolumes.set(el, volume);
  if (needsWebAudio()) {
    // Supabase Storage liefert "Access-Control-Allow-Origin: *".
    el.crossOrigin = "anonymous";
    connect(el);
  }
  setMusicElementVolume(el, volume);
}

/** Wirkt sofort, auch während der Wiedergabe. */
export function setMusicElementVolume(el: HTMLMediaElement, volume: number): void {
  const v = Math.min(1, Math.max(0, isFinite(volume) ? volume : 0));
  targetVolumes.set(el, v);
  // "Aus" ist immer stumm – muted funktioniert auch auf iOS.
  el.muted = v <= 0;

  const output = outputs.get(el);
  if (output) {
    try {
      const ctx = output.gain.context;
      output.gain.gain.cancelScheduledValues(ctx.currentTime);
      output.gain.gain.setValueAtTime(v, ctx.currentTime);
    } catch {
      output.gain.gain.value = v;
    }
    return;
  }

  if (canSetElementVolume()) el.volume = v;
}

export function getMusicElementVolume(el: HTMLMediaElement): number {
  return targetVolumes.get(el) ?? (canSetElementVolume() ? el.volume : 0);
}

/** Beim Wegwerfen eines Musik-Elements, damit keine Knoten im Graph hängen bleiben. */
export function detachMusicElement(el: HTMLMediaElement): void {
  const output = outputs.get(el);
  if (!output) return;
  try {
    output.source.disconnect();
    output.gain.disconnect();
  } catch {
    /* bereits getrennt */
  }
  outputs.delete(el);
}
