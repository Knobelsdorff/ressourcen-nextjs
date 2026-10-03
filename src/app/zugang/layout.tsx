import { Metadata } from "next";
import WellnessSurface from '@/components/WellnessSurface';

export const metadata: Metadata = {
  title: "Mein Zugang – Power Story",
  description: "Melde dich an, um zu deinen persönlichen Power Storys zu gelangen.",
};

export default function ZugangLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WellnessSurface className="wellness-auth">{children}</WellnessSurface>;
}
