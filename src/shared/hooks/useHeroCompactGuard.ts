import { useEffect, useState } from "react";

type Args = {
  tilesRef: React.RefObject<HTMLElement>;
  gap?: number;
};

export function useHeroCompactGuard({
  tilesRef,
  gap = 8,
}: Args) {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const tiles = tilesRef.current;
    if (!tiles) return;

    const getFooter = () =>
      document.querySelector<HTMLElement>(".app-shell__footer");

    let raf = 0;

    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const footer = getFooter();
        if (!footer) return;

        const tilesRect = tiles.getBoundingClientRect();
        const footerRect = footer.getBoundingClientRect();

        const tilesBottom = tilesRect.bottom;
        const footerTop = footerRect.top;

        const shouldCompact = tilesBottom > footerTop - gap;
        setCompact((prev) => (prev === shouldCompact ? prev : shouldCompact));
      });
    };

    const ro = new ResizeObserver(measure);
    ro.observe(tiles);

    const footer = getFooter();
    if (footer) {
      ro.observe(footer);
    }

    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);

    measure();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, [tilesRef, gap]);

  return compact;
}
