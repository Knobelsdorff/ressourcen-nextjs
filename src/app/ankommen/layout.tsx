import type { Metadata } from "next";
import "./ankommen.css";

export const metadata: Metadata = {
  title: "Ankommen – Power Story",
  description: "Eine kurze, sanfte Audio-Geschichte zur inneren Ruhe. Du musst nichts tun – nur zuhören.",
};

export default function AnkommenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // wellness-theme liefert die Farb-Tokens, die der AudioPlayer über
  // primary-*/secondary-* bereits verwendet.
  return <div className="wellness-theme ankommen-theme">{children}</div>;
}
