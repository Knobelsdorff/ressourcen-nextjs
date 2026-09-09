"use client";

/**
 * Verbindet StoryCard mit dem BLS-Kontext, damit immer nur eine
 * Augenbewegung gleichzeitig läuft. StoryCard selbst bleibt dadurch
 * kontextfrei und testbar.
 */

import { useBLS } from "@/components/providers/bls-provider";
import StoryCard from "./StoryCard";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof StoryCard>, "blsExpanded" | "onToggleBLS">;

export default function StoryCardConnected(props: Props) {
  const { isBLSOpen, openBLS, closeBLS } = useBLS();
  const expanded = isBLSOpen(props.story.id);

  return (
    <StoryCard
      {...props}
      blsExpanded={expanded}
      onToggleBLS={() => (expanded ? closeBLS() : openBLS(props.story.id))}
    />
  );
}
