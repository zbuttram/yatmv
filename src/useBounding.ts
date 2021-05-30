import { useState, useCallback, useEffect } from "react";

import events, { GLOBAL_RECALC_BOUNDING } from "./events";

export default function useBounding(
  id: string,
  { recalcInterval }: { recalcInterval?: number } = {}
): Partial<DOMRect> {
  const [rect, _setRect] = useState<Partial<DOMRect>>({});

  const setRect = useCallback(() => {
    const element = document.getElementById(id);
    if (!element) return;
    const { top, left, width, height } = element.getBoundingClientRect();
    const newRect = {
      top: top + window.scrollY,
      left: left + window.scrollX,
      width,
      height,
    };
    if (
      rect.top !== newRect.top ||
      rect.left !== newRect.left ||
      rect.width !== newRect.width ||
      rect.height !== newRect.height
    ) {
      _setRect(newRect);
    }
  }, [id, rect, _setRect]);

  useEffect(() => {
    const ro = new ResizeObserver(() => {
      setRect();
    });

    const el = document.getElementById(id);
    el && ro.observe(el);

    function delayedSetRect() {
      setTimeout(setRect);
    }

    events.on(GLOBAL_RECALC_BOUNDING, delayedSetRect);

    let interval;
    if (recalcInterval) {
      interval = setInterval(setRect, recalcInterval);
    }

    return () => {
      if (interval) clearInterval(interval);
      events.off(GLOBAL_RECALC_BOUNDING, delayedSetRect);
      ro.disconnect();
    };
  }, [id, setRect, recalcInterval]);

  return rect;
}
