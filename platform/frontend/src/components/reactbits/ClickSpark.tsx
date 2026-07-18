import { useRef } from "react";
import type { MouseEvent, ReactNode } from "react";

import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

interface Spark {
  x: number;
  y: number;
  angle: number;
  startTime: number;
}

interface ClickSparkProps {
  children: ReactNode;
  sparkColor?: string;
  sparkCount?: number;
  sparkRadius?: number;
  duration?: number;
  className?: string;
}

export function ClickSpark({
  children,
  sparkColor = "#8b5cf6",
  sparkCount = 8,
  sparkRadius = 18,
  duration = 400,
  className = "",
}: ClickSparkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparksRef = useRef<Spark[]>([]);
  const rafRef = useRef<number | undefined>(undefined);
  const reducedMotion = usePrefersReducedMotion();

  const ensureLoop = () => {
    if (rafRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = (now: number) => {
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      sparksRef.current = sparksRef.current.filter((spark) => now - spark.startTime < duration);

      for (const spark of sparksRef.current) {
        const t = (now - spark.startTime) / duration;
        const eased = 1 - Math.pow(1 - t, 2);
        const length = sparkRadius * eased;
        const x1 = spark.x + Math.cos(spark.angle) * length * 0.4;
        const y1 = spark.y + Math.sin(spark.angle) * length * 0.4;
        const x2 = spark.x + Math.cos(spark.angle) * length;
        const y2 = spark.y + Math.sin(spark.angle) * length;
        ctx.strokeStyle = sparkColor;
        ctx.globalAlpha = 1 - t;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      rafRef.current = sparksRef.current.length > 0 ? requestAnimationFrame(draw) : undefined;
    };
    rafRef.current = requestAnimationFrame(draw);
  };

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const now = performance.now();
    for (let i = 0; i < sparkCount; i++) {
      sparksRef.current.push({ x, y, angle: (i / sparkCount) * Math.PI * 2, startTime: now });
    }
    ensureLoop();
  };

  return (
    <div className={`relative inline-block ${className}`} onClickCapture={handleClick}>
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-10 h-full w-full" />
      {children}
    </div>
  );
}
