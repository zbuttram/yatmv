import { useState, useCallback, useEffect } from "react";

import events, { GLOBAL_RECALC_BOUNDING } from "./events";

export default function useBounding(id): Partial<DOMRect> {
  const [rect, _setRect] = useState<Partial<DOMRect>>({});

  const setRect = useCallback(() => {
    const element = document.getElementById(id);
    if (!element) return;
    const { top, left, width, height } = element.getBoundingClientRect();
    _setRect({
      top: top + window.scrollY,
      left: left + window.scrollX,
      width,
      height,
    });
  }, [id, _setRect]);

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
    return () => {
      events.off(GLOBAL_RECALC_BOUNDING, delayedSetRect);
      ro.disconnect();
    };
  }, [id, setRect]);

  return rect;
}
