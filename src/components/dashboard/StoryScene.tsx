/**
 * Ruhige Bildsprache fürs Dashboard: Lotus als Zeichen neben der Überschrift
 * und ein schmales Hügelband mit Lotus in jeder Story-Karte.
 *
 * Reines SVG ohne Bilddatei. Die Farben kommen aus dashboard.css
 * (--scene-back / --scene-front je nach Akzentfarbe der Karte).
 */

const PETALS = [
  "M32 5C26.5 12.5 25.5 24 32 36C38.5 24 37.5 12.5 32 5Z",
  "M32 36C24 32.5 17.5 23 16.5 13C24.5 15 30.5 22.5 32 36Z",
  "M32 36C40 32.5 46.5 23 47.5 13C39.5 15 33.5 22.5 32 36Z",
  "M32 36C22 36.5 10.5 31.5 4 22.5C14 21.5 25.5 26 32 36Z",
  "M32 36C42 36.5 53.5 31.5 60 22.5C50 21.5 38.5 26 32 36Z",
];

/** Lotus als Linienzeichen (Überschrift). */
export function LotusMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 40" className={className} aria-hidden="true" focusable="false">
      {PETALS.map((d) => (
        <path key={d} d={d} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

/** Hügelband mit leuchtendem Lotus, volle Kartenbreite. */
export default function StoryScene() {
  return (
    <div className="story-scene" aria-hidden="true">
      <svg className="story-scene-hills" viewBox="0 0 400 100" preserveAspectRatio="none" focusable="false">
        <path className="story-scene-back" d="M0 62C46 38 92 34 140 46C190 58 226 30 276 22C326 14 366 30 400 40V100H0Z" />
        <path className="story-scene-front" d="M0 80C52 62 104 58 156 68C214 79 250 56 302 52C346 49 378 58 400 64V100H0Z" />
      </svg>
      <div className="story-scene-lotus">
        <span className="story-scene-glow" />
        <svg viewBox="0 0 64 40" focusable="false">
          {PETALS.map((d) => (
            <path key={d} d={d} />
          ))}
        </svg>
      </div>
    </div>
  );
}
