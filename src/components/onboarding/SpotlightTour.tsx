"use client";

/**
 * Geführte Tour mit Spotlight: dunkelt die Seite ab, lässt nur das aktuelle
 * Element frei (und bedienbar) und erklärt es in einer kleinen Karte.
 *
 * Kennt die Seite nur über data-tour-Anker (siehe tour-dom.ts) – das Layout
 * drumherum darf sich frei ändern. Inhalte der Schritte liegen außerhalb,
 * z.B. in firstStoryTour.ts.
 *
 * Bedienung: Weiter/Zurück/Überspringen, Pfeiltasten, Esc. Der Fokus bleibt
 * in der Karte. Auf schmalen Bildschirmen wird die Karte zum Bottom-Sheet.
 */

import { CSSProperties, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { findTourTarget, prefersReducedMotion, scrollTargetIntoView } from "./tour-dom";
import "./spotlight-tour.css";

export interface TourStep {
  id: string;
  /** Wert des data-tour-Attributs am hervorgehobenen Element. Fehlt es, wird der Schritt übersprungen. */
  target: string;
  title: string;
  body: string;
}

export type TourEndReason = "completed" | "skipped";

export interface TourLabels {
  next: string;
  back: string;
  done: string;
  skip: string;
  progress: (current: number, total: number) => string;
}

const DEFAULT_LABELS: TourLabels = {
  next: "Weiter",
  back: "Zurück",
  done: "Los geht's",
  skip: "Überspringen",
  progress: (current, total) => `${current} von ${total}`,
};

interface SpotlightTourProps {
  steps: TourStep[];
  open: boolean;
  onEnd: (reason: TourEndReason) => void;
  labels?: Partial<TourLabels>;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const HOLE_PADDING = 8;
const HOLE_RADIUS = 18;
const GAP = 14;
const EDGE = 16;
const MOBILE_QUERY = "(max-width: 639px)";
/** So lange wird auf ein Ziel gewartet (z.B. Liste lädt noch), bevor der Schritt entfällt. */
const TARGET_WAIT_MS = 1500;
/** Übergang des Spotlights von einem Ziel zum nächsten. */
const TWEEN_MS = 320;

function sameRect(a: Rect | null, b: Rect | null): boolean {
  if (!a || !b) return a === b;
  return (
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  );
}

function lerpRect(from: Rect, to: Rect, t: number): Rect {
  const mix = (a: number, b: number) => a + (b - a) * t;
  return { top: mix(from.top, to.top), left: mix(from.left, to.left), width: mix(from.width, to.width), height: mix(from.height, to.height) };
}

/** Vollflächiges Rechteck minus abgerundetes Loch (evenodd). */
function overlayPath(width: number, height: number, hole: Rect): string {
  const r = Math.min(HOLE_RADIUS, hole.width / 2, hole.height / 2);
  const { left: x, top: y, width: w, height: h } = hole;
  return (
    `M0 0H${width}V${height}H0Z ` +
    `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}` +
    `A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}` +
    `V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`
  );
}

function ringPath(hole: Rect): string {
  return overlayPath(0, 0, hole).replace(/^M0 0H0V0H0Z /, "");
}

/** Erwartete Kartenhöhe, bevor sie gemessen ist (für das erste Scrollen). */
const POPOVER_HEIGHT_ESTIMATE = { desktop: 240, mobile: 260 };

/** Position der Karte: unter, über, neben dem Ziel – sonst unten, aber am Ziel ausgerichtet. */
function popoverStyle(hole: Rect, pop: { width: number; height: number }, vw: number, vh: number): CSSProperties {
  const width = Math.min(380, vw - EDGE * 2);
  const height = pop.height || POPOVER_HEIGHT_ESTIMATE.desktop;
  // Unter/über dem Ziel mittig ausrichten, aber im Fenster halten.
  const left = Math.min(Math.max(hole.left + hole.width / 2 - width / 2, EDGE), vw - width - EDGE);
  const clampTop = (top: number) => Math.min(Math.max(top, EDGE), vh - height - EDGE);

  if (hole.top + hole.height + GAP + height <= vh - EDGE) return { top: hole.top + hole.height + GAP, left, width };
  if (hole.top - GAP - height >= EDGE) return { top: hole.top - GAP - height, left, width };
  if (hole.left + hole.width + GAP + width <= vw - EDGE) return { top: clampTop(hole.top), left: hole.left + hole.width + GAP, width };
  if (hole.left - GAP - width >= EDGE) return { top: clampTop(hole.top), left: hole.left - GAP - width, width };
  return { top: vh - height - EDGE, left, width };
}

export default function SpotlightTour({ steps, open, onEnd, labels: labelOverrides }: SpotlightTourProps) {
  const labels = { ...DEFAULT_LABELS, ...labelOverrides };
  const [index, setIndex] = useState(0);
  const [hole, setHole] = useState<Rect | null>(null);
  const [popSize, setPopSize] = useState({ width: 0, height: 0 });
  const [viewport, setViewport] = useState({ width: 0, height: 0, mobile: false });

  const popoverRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const holeRef = useRef<Rect | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const tweenRef = useRef<{ from: Rect | null; start: number }>({ from: null, start: 0 });
  const directionRef = useRef<1 | -1>(1);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const bodyId = useId();

  const step = open ? steps[index] : undefined;
  const isLast = index === steps.length - 1;
  const hasHole = hole !== null;

  // Aktuelle Werte in Refs: goTo/end bleiben stabil. Sonst würde jeder
  // Re-Render (das Spotlight rendert pro Frame) den Schritt neu aktivieren
  // und erneut scrollen.
  const indexRef = useRef(index);
  const stepCountRef = useRef(steps.length);
  const onEndRef = useRef(onEnd);
  useLayoutEffect(() => {
    indexRef.current = index;
    stepCountRef.current = steps.length;
    onEndRef.current = onEnd;
  });

  const end = useCallback((reason: TourEndReason) => onEndRef.current(reason), []);

  const goTo = useCallback(
    (next: number) => {
      directionRef.current = next >= indexRef.current ? 1 : -1;
      if (next >= stepCountRef.current) return end("completed");
      setIndex(Math.max(0, next));
    },
    [end]
  );

  // Öffnen/Schließen: bei Schritt 1 beginnen, Fokus merken und zurückgeben.
  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    setIndex(0);
    holeRef.current = null;
    setHole(null);
    return () => {
      restoreFocusRef.current?.focus?.({ preventScroll: true });
    };
  }, [open]);

  // Schritt aktivieren: auf das Ziel warten, dann so scrollen, dass es ganz sichtbar ist.
  useEffect(() => {
    if (!open || !step) return;
    let cancelled = false;
    let timer = 0;
    const startedAt = performance.now();

    const activate = () => {
      if (cancelled) return;
      const el = findTourTarget(step.target);
      if (!el) {
        if (performance.now() - startedAt < TARGET_WAIT_MS) {
          timer = window.setTimeout(activate, 100);
          return;
        }
        // Ziel gibt es (gerade) nicht – Schritt in Laufrichtung überspringen.
        const next = index + directionRef.current;
        if (next < 0) goTo(index + 1);
        else goTo(next);
        return;
      }
      targetRef.current = el;
      tweenRef.current = { from: holeRef.current, start: performance.now() };
      if (!holeRef.current) {
        // Erster Schritt: Spotlight sofort zeigen, nicht erst im nächsten Frame.
        const r = el.getBoundingClientRect();
        const first = { top: r.top - HOLE_PADDING, left: r.left - HOLE_PADDING, width: r.width + HOLE_PADDING * 2, height: r.height + HOLE_PADDING * 2 };
        holeRef.current = first;
        setHole(first);
        setViewport({ width: window.innerWidth, height: window.innerHeight, mobile: window.matchMedia(MOBILE_QUERY).matches });
      }
      const mobile = window.matchMedia(MOBILE_QUERY).matches;
      const popHeight =
        popoverRef.current?.offsetHeight || (mobile ? POPOVER_HEIGHT_ESTIMATE.mobile : POPOVER_HEIGHT_ESTIMATE.desktop);
      scrollTargetIntoView(el, mobile ? { reserveBottom: popHeight + 12 } : { reserveBelow: popHeight + GAP + 8 });
    };

    timer = window.setTimeout(activate, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, step, index, goTo]);

  // Spotlight jedem Frame nachführen (Scrollen, Größenänderung, Übergang).
  useEffect(() => {
    if (!open || !step) return;
    const reduced = prefersReducedMotion();
    let frame = 0;
    let requery = 0;

    const tick = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const mobile = window.matchMedia(MOBILE_QUERY).matches;
      setViewport((prev) => (prev.width === vw && prev.height === vh && prev.mobile === mobile ? prev : { width: vw, height: vh, mobile }));

      // Element kann beim Neu-Rendern ersetzt werden oder (responsiv) wechseln.
      if (!targetRef.current?.isConnected || ++requery % 30 === 0) {
        targetRef.current = findTourTarget(step.target) ?? targetRef.current;
      }
      const el = targetRef.current;
      if (el?.isConnected) {
        const r = el.getBoundingClientRect();
        let next: Rect = {
          top: r.top - HOLE_PADDING,
          left: r.left - HOLE_PADDING,
          width: r.width + HOLE_PADDING * 2,
          height: r.height + HOLE_PADDING * 2,
        };
        const { from, start } = tweenRef.current;
        if (from && !reduced) {
          const t = Math.min(1, (performance.now() - start) / TWEEN_MS);
          if (t < 1) next = lerpRect(from, next, 1 - Math.pow(1 - t, 3));
          else tweenRef.current.from = null;
        }
        if (!sameRect(holeRef.current, next)) {
          holeRef.current = next;
          setHole(next);
        }
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [open, step]);

  // Größe der Karte für die Platzierung. Die Karte wird pro Schritt neu
  // gemountet und ändert sich mit der Breite – dann neu messen.
  useLayoutEffect(() => {
    const el = popoverRef.current;
    if (el && (el.offsetWidth !== popSize.width || el.offsetHeight !== popSize.height)) {
      setPopSize({ width: el.offsetWidth, height: el.offsetHeight });
    }
  }, [open, step?.id, hasHole, viewport.width, viewport.mobile, popSize.width, popSize.height]);

  // Fokus auf die Hauptaktion jedes Schritts.
  useEffect(() => {
    if (open && hasHole) primaryRef.current?.focus({ preventScroll: true });
  }, [open, index, hasHole]);

  // Tastatur: Esc, Pfeile, Fokus in der Karte halten.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        end("skipped");
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(index + 1);
      } else if (event.key === "ArrowLeft" && index > 0) {
        event.preventDefault();
        goTo(index - 1);
      } else if (event.key === "Tab" && popoverRef.current) {
        const focusables = popoverRef.current.querySelectorAll<HTMLElement>("button:not([disabled])");
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const inside = popoverRef.current.contains(document.activeElement);
        if (event.shiftKey && (document.activeElement === first || !inside)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !inside)) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, index, goTo, end]);

  // Schritte können wegfallen, während die Tour läuft.
  useEffect(() => {
    if (open && index >= steps.length) end("completed");
  }, [open, index, steps.length, end]);

  if (!open || !step || typeof document === "undefined" || !hole) return null;

  const placement: CSSProperties = viewport.mobile ? {} : popoverStyle(hole, popSize, viewport.width, viewport.height);

  return createPortal(
    <div className="spotlight-tour">
      <svg className="spotlight-tour-overlay" width={viewport.width} height={viewport.height} aria-hidden="true">
        <path className="spotlight-tour-dim" d={overlayPath(viewport.width, viewport.height, hole)} />
        <path className="spotlight-tour-ring" d={ringPath(hole)} />
      </svg>

      <div
        ref={popoverRef}
        key={step.id}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className={`spotlight-tour-popover${viewport.mobile ? " is-sheet" : ""}`}
        style={placement}
      >
        <div className="spotlight-tour-progress" aria-hidden="true">
          <span className="spotlight-tour-dots">
            {steps.map((s, i) => (
              <span key={s.id} className={i === index ? "is-active" : i < index ? "is-done" : undefined} />
            ))}
          </span>
          <span>{labels.progress(index + 1, steps.length)}</span>
        </div>
        <h2 id={titleId}>{step.title}</h2>
        <p id={bodyId}>{step.body}</p>
        <p className="sr-only" aria-live="polite">
          {labels.progress(index + 1, steps.length)}: {step.title}
        </p>

        <div className="spotlight-tour-actions">
          <button type="button" className="spotlight-tour-skip" onClick={() => end("skipped")}>
            {labels.skip}
          </button>
          <span className="spotlight-tour-nav">
            {index > 0 && (
              <button type="button" className="spotlight-tour-back" onClick={() => goTo(index - 1)}>
                {labels.back}
              </button>
            )}
            <button ref={primaryRef} type="button" className="spotlight-tour-next" onClick={() => goTo(index + 1)}>
              {isLast ? labels.done : labels.next}
            </button>
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
