import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

interface FadeContentProps {
  children: ReactNode;
  duration?: number;
  delay?: number;
  blur?: boolean;
  threshold?: number;
  className?: string;
}

export function FadeContent({
  children,
  duration = 500,
  delay = 0,
  blur = true,
  threshold = 0.1,
  className = "",
}: FadeContentProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          timeoutId = setTimeout(() => setVisible(true), delay);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, [delay, threshold, reducedMotion]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        filter: blur ? (visible ? "blur(0px)" : "blur(6px)") : undefined,
        transform: visible ? "translateY(0)" : "translateY(10px)",
        transition: `opacity ${duration}ms ease-out, filter ${duration}ms ease-out, transform ${duration}ms ease-out`,
      }}
    >
      {children}
    </div>
  );
}
