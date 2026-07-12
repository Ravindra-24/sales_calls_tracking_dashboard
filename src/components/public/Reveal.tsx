import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

type RevealElement = 'article' | 'div' | 'section';

interface RevealProps {
  as?: RevealElement;
  children: ReactNode;
  className?: string;
  delay?: number;
  id?: string;
}

export const Reveal = ({
  as: Element = 'div',
  children,
  className = '',
  delay = 0,
  id,
}: RevealProps) => {
  const elementRef = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setIsVisible(true);
        observer.disconnect();
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.12 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <Element
      ref={(node) => { elementRef.current = node; }}
      id={id}
      className={`lw-reveal${isVisible ? ' is-visible' : ''}${className ? ` ${className}` : ''}`}
      style={{ '--lw-reveal-delay': `${delay}ms` } as CSSProperties}
    >
      {children}
    </Element>
  );
};
