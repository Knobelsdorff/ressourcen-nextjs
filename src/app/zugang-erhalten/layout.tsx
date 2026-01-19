import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dein persönlicher Raum – Power Story",
  description: "Erhalte Zugang zu deinem persönlichen Raum, damit deine Geschichten gespeichert bleiben.",
};

export default function ZugangErhaltenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
