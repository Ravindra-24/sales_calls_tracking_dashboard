import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

const MOBILE_BREAKPOINT = 560;

/**
 * Wraps a card grid and adds swipeable snap-scroll behaviour with dot
 * indicators on mobile screens (≤560 px).  On wider viewports the children
 * render exactly as before — no wrapper markup is injected.
 */
export const MobileSlider = ({
  children,
  count,
  className = '',
  label,
}: {
  /** The card elements to render inside the slider. */
  children: ReactNode;
  /** Total number of cards (used to render dot indicators). */
  count: number;
  /** Extra class name forwarded to the scroll container. */
  className?: string;
  /** Accessible label for the slider region. */
  label?: string;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT,
  );

  /* ---- Respond to viewport changes ---- */
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener('change', handler);
  }, []);

  /* ---- IntersectionObserver to track active card ---- */
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !isMobile) return;

    const cards = Array.from(container.children) as HTMLElement[];
    if (cards.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = cards.indexOf(entry.target as HTMLElement);
            if (idx !== -1) setActiveIndex(idx);
          }
        }
      },
      { root: container, threshold: 0.55 },
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [isMobile, count]);

  /* ---- Scroll to card on dot tap ---- */
  const scrollTo = useCallback((index: number) => {
    const container = scrollRef.current;
    if (!container) return;
    const card = container.children[index] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, []);

  return (
    <div className="lw-slider-wrapper" aria-label={label} role={label ? 'region' : undefined}>
      <div ref={scrollRef} className={`${className} ${isMobile ? 'lw-slider-track' : ''}`}>
        {children}
      </div>
      {isMobile && count > 1 && (
        <div className="lw-slider-dots" role="tablist" aria-label="Slider navigation">
          {Array.from({ length: count }, (_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={activeIndex === i}
              aria-label={`Slide ${i + 1}`}
              className={activeIndex === i ? 'is-active' : ''}
              onClick={() => scrollTo(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
