/** A circular progress ring. Content is centred inside it. */
export function ProgressRing({
  value,
  size = 224,
  stroke = 12,
  label,
  children,
}: {
  /** 0 to 1 */
  value: number;
  size?: number;
  stroke?: number;
  label: string;
  children?: React.ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, value));
  return (
    <div
      role="img"
      aria-label={label}
      className="relative mx-auto grid place-items-center"
      style={{ width: size, height: size, maxWidth: "100%" }}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          className="stroke-violet-600 motion-safe:transition-[stroke-dashoffset] motion-safe:duration-700 dark:stroke-violet-400"
        />
      </svg>
      <div className="relative px-6 text-center">{children}</div>
    </div>
  );
}
