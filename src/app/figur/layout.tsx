import type { Metadata } from "next";
import { getText } from "@/lib/site-texts/server";
import { meta } from "@/content/texts/meta";
import "../create-story/story-flow.css";
import "./figur.css";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: await getText(meta["figur.title"]),
    description: await getText(meta["figur.description"]),
  };
}

export default function FigurLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  /*
   * Dieselbe Hülle wie /create-story: story-flow.css gestaltet die
   * Figurenkarten, wellness-theme liefert die Farb-Tokens. Die Seite ist
   * Schritt 1 des Flows in kurzer Form – sie soll auch so aussehen.
   */
  return <div className="wellness-theme story-flow">{children}</div>;
}
