import type { ReactNode } from "react";

interface GradientTextProps {
  children: ReactNode;
  className?: string;
  colors?: string[];
  speed?: number;
}

export function GradientText({
  children,
  className = "",
  colors = ["#8b5cf6", "#c4b5fd", "#8b5cf6"],
  speed = 6,
}: GradientTextProps) {
  return (
    <span
      className={`gradient-text inline-block bg-clip-text text-transparent ${className}`}
      style={{
        backgroundImage: `linear-gradient(90deg, ${colors.join(", ")})`,
        backgroundSize: "300% 100%",
        animationDuration: `${speed}s`,
      }}
    >
      {children}
    </span>
  );
}
