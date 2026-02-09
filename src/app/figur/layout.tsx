import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Figur wählen – Power Story",
  description: "Schau, welche Figur ein kleines inneres Ja auslöst",
};

export default function FigurLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}

