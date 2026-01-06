import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ankommen – Power Story",
  description: "Eine kurze, sanfte Audio-Geschichte zur inneren Ruhe. Du musst nichts tun – nur zuhören.",
};

export default function AnkommenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

