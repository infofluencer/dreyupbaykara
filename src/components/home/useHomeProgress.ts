"use client";

import { useEffect, useRef } from "react";
import { useMotionValue, type MotionValue } from "framer-motion";

export function useHomeProgress(
  target: React.RefObject<HTMLElement | null>,
): {
  progressRef: React.MutableRefObject<number>;
  scrollYProgress: MotionValue<number>;
} {
  const progressRef = useRef(0);
  const scrollYProgress = useMotionValue(0);

  useEffect(() => {
    const el = target.current;
    if (!el) return;

    let raf = 0;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const scrollable = el.offsetHeight - window.innerHeight;
      const progress =
        scrollable > 0
          ? Math.min(1, Math.max(0, -rect.top / scrollable))
          : 0;

      progressRef.current = progress;
      scrollYProgress.set(progress);
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [target, scrollYProgress]);

  return { progressRef, scrollYProgress };
}
