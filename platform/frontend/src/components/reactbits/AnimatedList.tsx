import { AnimatePresence, motion } from "motion/react";
import { isValidElement } from "react";
import type { ReactNode } from "react";

import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

interface AnimatedListProps {
  children: ReactNode[];
  className?: string;
  itemClassName?: string;
}

export function AnimatedList({ children, className = "", itemClassName = "" }: AnimatedListProps) {
  const reducedMotion = usePrefersReducedMotion();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={className}>
      <AnimatePresence initial={false}>
        {children.map((child, index) => {
          const key = isValidElement(child) && child.key !== null ? child.key : index;
          return (
            <motion.div
              key={key}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className={itemClassName}
            >
              {child}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
