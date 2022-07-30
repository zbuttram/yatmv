import { useState, useLayoutEffect } from "react";

function setRect(
  id: string,
  rect: Partial<DOMRect>,
  _setRect: (value: Partial<DOMRect>) => void
) {
  const element = document.getElementById(id);
  if (!element) return;
  const { top, left, right, bottom, width, height } =
    element.getBoundingClientRect();
  const newRect = {
    top: top + window.scrollY,
    left: left + window.scrollX,
    right,
    bottom,
    width,
    height,
  };
  if (
    rect.top !== newRect.top ||
    rect.left !== newRect.left ||
    rect.right !== newRect.right ||
    rect.bottom !== newRect.bottom ||
    rect.width !== newRect.width ||
    rect.height !== newRect.height
  ) {
    _setRect(newRect);
  }
}

export default function useBounding(id: string): Partial<DOMRect> {
  const [rect, _setRect] = useState<Partial<DOMRect>>({});

  useLayoutEffect(() => {
    let loop = true;
    const af = requestAnimationFrame(function doLoop() {
      setRect(id, rect, _setRect);
      if (loop) requestAnimationFrame(doLoop);
    });

    return () => {
      cancelAnimationFrame(af);
      loop = false;
    };
  }, [id, rect]);

  return rect;
}
