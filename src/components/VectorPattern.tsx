type VectorPatternProps = {
  /** light: koyu çizgi (krem zemin); dark: açık çizgi (yeşil zemin) */
  tone?: "light" | "dark";
  className?: string;
  /** 0–100, varsayılan tone’a göre */
  opacity?: number;
  size?: number;
};

/**
 * public/vector_dr.webp — tıbbi ikon pattern, düşük opacity dekor.
 */
export function VectorPattern({
  tone = "light",
  className = "",
  opacity,
  size = 420,
}: VectorPatternProps) {
  const resolvedOpacity =
    opacity ?? (tone === "dark" ? 0.07 : 0.055);

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <div
        className="absolute inset-0"
        style={{
          opacity: resolvedOpacity,
          backgroundImage: "url(/vector_dr.webp)",
          backgroundRepeat: "repeat",
          backgroundSize: `${size}px`,
          backgroundPosition: "center top",
          filter: tone === "dark" ? "invert(1)" : undefined,
        }}
      />
    </div>
  );
}
