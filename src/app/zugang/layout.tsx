import type { Metadata } from "next";
import { getText } from "@/lib/site-texts/server";
import { meta } from "@/content/texts/meta";
import WellnessSurface from '@/components/WellnessSurface';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: await getText(meta["zugang.title"]),
    description: await getText(meta["zugang.description"]),
  };
}

export default function ZugangLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WellnessSurface className="wellness-auth">{children}</WellnessSurface>;
}
