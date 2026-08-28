const SIZE = {
  sm: "h-4 w-4 border-[1.5px]",
  md: "h-5 w-5 border-2",
  lg: "h-11 w-11 border-2",
} as const;

type SpinnerProps = {
  size?: keyof typeof SIZE;
  className?: string;
  label?: string;
};

/** Admin paneli için marka uyumlu yükleme göstergesi. */
export function Spinner({ size = "md", className = "", label }: SpinnerProps) {
  return (
    <span className="inline-flex items-center justify-center" role="status">
      <span
        className={`inline-block animate-spin rounded-full border-current border-t-transparent ${SIZE[size]} ${className}`}
        aria-hidden
      />
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}
