"use client";

import { useEffect } from "react";

/**
 * Downloads lazily loaded code once the page is idle, so the first click on
 * something that needs it doesn't wait on the network. Pass a stable function.
 */
export function useIdlePreload(preload: () => void) {
  useEffect(() => {
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(preload, { timeout: 5000 });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(preload, 2000);
    return () => clearTimeout(id);
  }, [preload]);
}
