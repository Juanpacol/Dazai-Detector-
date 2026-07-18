interface ShinyTextProps {
  text: string;
  className?: string;
  speed?: number;
}

export function ShinyText({ text, className = "", speed = 3 }: ShinyTextProps) {
  return (
    <span
      className={`shiny-text bg-clip-text text-transparent ${className}`}
      style={{ animationDuration: `${speed}s` }}
    >
      {text}
    </span>
  );
}
