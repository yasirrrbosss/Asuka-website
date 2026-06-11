"use client";

interface LogoProps {
  /** "dark" → use logo-dark.png on cream surfaces. "cream" → use logo-cream.png on dark surfaces. */
  variant?: "dark" | "cream";
  /** Height in pixels. Width auto-scales. */
  height?: number;
  /** Optional className for layout positioning. */
  className?: string;
  /** Click handler (e.g. nav-home navigation). */
  onClick?: () => void;
}

export function Logo({ variant = "dark", height = 28, className, onClick }: LogoProps) {
  const src = variant === "dark" ? "/images/logo-dark.png" : "/images/logo-cream.png";
  return (
    <img
      src={src}
      alt="Asuka Brewing & Space"
      onClick={onClick}
      style={{
        height,
        width: "auto",
        display: "block",
        cursor: onClick ? "pointer" : "default",
      }}
      className={className}
    />
  );
}
