import { motion } from "motion/react";
import type { ReactNode } from "react";

import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

interface AnimatedContentProps {
  children: ReactNode;
  direction?: "up" | "down" | "left" | "right";
  distance?: number;
  duration?: number;
  delay?: number;
  className?: string;
}

export function AnimatedContent({
  children,
  direction = "up",
  distance = 20,
  duration = 0.5,
  delay = 0,
  className,
}: AnimatedContentProps) {
  const reducedMotion = usePrefersReducedMotion();

  if (reducedMotion) return <div className={className}>{children}</div>;

  const sign = direction === "down" || direction === "right" ? -1 : 1;
  const offset = sign * distance;
  const initial =
    direction === "left" || direction === "right" ? { opacity: 0, x: offset } : { opacity: 0, y: offset };

  return (
    <motion.div
      className={className}
      initial={initial}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
