import { useState, useCallback, useEffect } from "react";

import events from "./events";

export default function useBounding(id) {
  const [rect, _setRect] = useState({});

  const setRect = useCallback(() => {
    const element = document.getElementById(id);
    if (!element) return;
    const rect = element.getBoundingClientRect();
    _setRect(rect);
  }, [_setRect]);

  useEffect(() => {
    const ro = new ResizeObserver(() => {
      setRect();
    });
    ro.observe(document.getElementById(id));
    events.on("removeStream", () => {
      setTimeout(setRect);
    });
  }, []);

  return rect;
}
