import { useEffect, useRef } from "react";
import { animate, useMotionValue } from "motion/react";

import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

interface CountUpProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

function format(value: number, decimals: number, prefix: string, suffix: string): string {
  return `${prefix}${value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}${suffix}`;
}

export function CountUp({ value, duration = 0.8, decimals = 0, prefix = "", suffix = "", className }: CountUpProps) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      if (spanRef.current) spanRef.current.textContent = format(value, decimals, prefix, suffix);
      return;
    }

    const controls = animate(motionValue, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        if (spanRef.current) spanRef.current.textContent = format(latest, decimals, prefix, suffix);
      },
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration, decimals, prefix, suffix, reducedMotion]);

  return (
    <span ref={spanRef} className={className}>
      {format(0, decimals, prefix, suffix)}
    </span>
  );
}
