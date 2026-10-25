"use client";

import { RefObject, useCallback, useEffect, useState } from "react";

/**
 * Wie im Engel-Flow: Ein Bereich scrollt nur, wenn der Platz nicht reicht –
 * ohne Balken, mit Verlauf am unteren Rand als Hinweis (data-more-below).
 * `key` neu setzen, sobald sich der Inhalt austauscht.
 */
export function useScrollFade(ref: RefObject<HTMLElement | null>, key: unknown) {
  const [moreBelow, setMoreBelow] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setMoreBelow(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [ref, update, key]);

  return moreBelow;
}
