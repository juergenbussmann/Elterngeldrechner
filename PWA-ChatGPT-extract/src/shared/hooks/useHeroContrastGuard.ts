import { useEffect, useState } from "react";

type Args = {
  heroRef: React.RefObject<HTMLElement>;
  contentRef: React.RefObject<HTMLElement>;
  threshold?: number;
};

export function useHeroContrastGuard({
  heroRef,
  contentRef,
  threshold = 0.55,
}: Args) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const hero = heroRef.current;
    const content = contentRef.current;
    if (!hero || !content) return;

    let raf = 0;

    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const heroRect = hero.getBoundingClientRect();
        const contentRect = content.getBoundingClientRect();

        const heroHeight = heroRect.height || 1;
        const contentBottom = contentRect.bottom - heroRect.top;

        const shouldActivate = contentBottom > heroHeight * threshold;
        setActive((prev) => (prev === shouldActivate ? prev : shouldActivate));
      });
    };

    const ro = new ResizeObserver(measure);
    ro.observe(hero);
    ro.observe(content);

    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);

    measure();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, [heroRef, contentRef, threshold]);

  return active;
}
