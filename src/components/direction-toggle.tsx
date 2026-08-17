"use client";

import { useEffect, useState } from "react";

type Direction = "refined" | "snap";

const STORAGE_KEY = "bookkin:preview-direction";

/**
 * Preview-only control for the Checkpoint 7A design-direction decision.
 *
 * It renders only when NEXT_PUBLIC_BOOKKIN_SHOW_DIRECTION_TOGGLE is explicitly "true", which is
 * set on the protected preview and nowhere else, so it is gated out of anything that could
 * become production. It changes presentation only — no copy, control, focus order, or behavior
 * differs between directions, because a comparison is only meaningful if everything except the
 * visual language is held constant.
 *
 * This is a review instrument, not a product setting. It disappears once the owner locks a
 * direction, and it is deliberately not persisted to any household record.
 */
export function DirectionToggle() {
  const [direction, setDirection] = useState<Direction>("refined");
  const isEnabled = process.env.NEXT_PUBLIC_BOOKKIN_SHOW_DIRECTION_TOGGLE === "true";

  useEffect(() => {
    if (!isEnabled) return undefined;
    const timeoutId = window.setTimeout(() => {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const restored: Direction = stored === "snap" ? "snap" : "refined";
      setDirection(restored);
      document.documentElement.dataset.direction = restored;
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [isEnabled]);

  if (!isEnabled) return null;

  function choose(next: Direction) {
    setDirection(next);
    document.documentElement.dataset.direction = next;
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <div className="bk-direction-toggle">
      <span aria-hidden="true">Preview style</span>
      <div aria-label="Preview style direction" role="group">
        <button aria-pressed={direction === "refined"} onClick={() => choose("refined")} type="button">
          Refined Brighter
        </button>
        <button aria-pressed={direction === "snap"} onClick={() => choose("snap")} type="button">
          Original Bright Snap
        </button>
      </div>
    </div>
  );
}
