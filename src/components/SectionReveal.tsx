"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const REVEAL_SELECTOR = "main section";

export function SectionReveal() {
  const pathname = usePathname();

  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR),
    );

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          entry.target.setAttribute("data-section-reveal", "visible");
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -8% 0px",
      },
    );

    for (const section of sections) {
      const isSticky = section.classList.contains("sticky");
      const isLongScrollScene = section.offsetHeight > window.innerHeight * 1.5;

      if (isSticky || isLongScrollScene) {
        section.setAttribute("data-section-reveal", "visible");
        continue;
      }

      section.setAttribute("data-section-reveal", "pending");
      observer.observe(section);
    }

    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
