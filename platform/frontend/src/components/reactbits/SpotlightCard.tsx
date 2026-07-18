import { useRef } from "react";
import type { CSSProperties, MouseEvent, ReactNode } from "react";

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
  spotlightColor?: string;
}

export function SpotlightCard({
  children,
  className = "",
  spotlightColor = "rgba(139, 92, 246, 0.18)",
}: SpotlightCardProps) {
  const divRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const div = divRef.current;
    if (!div) return;
    const rect = div.getBoundingClientRect();
    div.style.setProperty("--spotlight-x", `${e.clientX - rect.left}px`);
    div.style.setProperty("--spotlight-y", `${e.clientY - rect.top}px`);
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      className={`spotlight-card relative overflow-hidden ${className}`}
      style={{ "--spotlight-color": spotlightColor } as CSSProperties}
    >
      <div className="spotlight-card__glow pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative">{children}</div>
    </div>
  );
}
