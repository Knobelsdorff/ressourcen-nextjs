import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Figur wählen – Power Story",
  description: "Wähle eine Figur, die sich im Moment stimmig anfühlt.",
};

export default function FigurLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}

