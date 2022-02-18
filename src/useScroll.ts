import { useLayoutEffect, useState } from "react";

export default function useScroll() {
  const [scroll, setScroll] = useState<number>(0);

  useLayoutEffect(() => {
    let loop = true;
    const af = requestAnimationFrame(function doLoop() {
      setScroll(window.scrollY);
      if (loop) requestAnimationFrame(doLoop);
    });

    return () => {
      cancelAnimationFrame(af);
      loop = false;
    };
  }, []);

  return scroll;
}
