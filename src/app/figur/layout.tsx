import type { Metadata } from "next";
import "../create-story/story-flow.css";
import "./figur.css";

export const metadata: Metadata = {
  title: "Figur wählen – Power Story",
  description: "Schau, welche Figur ein kleines inneres Ja auslöst",
};

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
