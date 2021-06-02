import { useState, useCallback, useLayoutEffect } from "react";

export default function useBounding(id: string): Partial<DOMRect> {
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

  useLayoutEffect(() => {
    let loop = true;
    const af = requestAnimationFrame(function doLoop() {
      setRect();
      if (loop) requestAnimationFrame(doLoop);
    });

    return () => {
      cancelAnimationFrame(af);
      loop = false;
    };
  }, [id, setRect]);

  return rect;
}
