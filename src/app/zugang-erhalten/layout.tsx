import type { Metadata } from "next";
import { getText } from "@/lib/site-texts/server";
import { meta } from "@/content/texts/meta";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: await getText(meta["zugangErhalten.title"]),
    description: await getText(meta["zugangErhalten.description"]),
  };
}

export default function ZugangErhaltenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
