import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mein Zugang – Power Story",
  description: "Melde dich an, um zu deinen persönlichen Power Storys zu gelangen.",
};

export default function ZugangLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
