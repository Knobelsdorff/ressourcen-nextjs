import IdealFamilyIconFinal from "@/components/IdealFamilyIconFinal";
import JesusIconFinal from "@/components/JesusIconFinal";
import ArchangelMichaelIconFinal from "@/components/ArchangelMichaelIconFinal";
import AngelIconFinal from "@/components/AngelIconFinal";
import SuperheroIconFinal from "@/components/SuperheroIconFinal";
import { ResourceFigure } from "@/lib/types/story";

/** Illustration der Figur, sonst ihr Emoji – überall im Story-Flow gleich. */
export default function FigureIcon({ figure, size = 48, className = "" }: { figure: Pick<ResourceFigure, "id" | "emoji">; size?: number; className?: string }) {
  switch (figure.id) {
    case "ideal-family": return <IdealFamilyIconFinal size={size} className={className} />;
    case "jesus": return <JesusIconFinal size={size} className={className} />;
    case "archangel-michael": return <ArchangelMichaelIconFinal size={size} className={className} />;
    case "angel": return <AngelIconFinal size={size} className={className} />;
    case "superhero": return <SuperheroIconFinal size={size} className={className} />;
    default:
      return (
        <span className={`story-figure-emoji ${className}`} style={{ fontSize: Math.round(size * 0.72) }} aria-hidden="true">
          {figure.emoji}
        </span>
      );
  }
}
