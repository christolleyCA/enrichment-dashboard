interface ProgressRingProps {
  pct: number
  size?: number
  strokeWidth?: number
  color?: string
}

export default function ProgressRing({
  pct,
  size = 120,
  strokeWidth = 10,
  color = '#3b82f6',
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clampedPct = Math.min(100, Math.max(0, pct))
  const offset = circumference - (clampedPct / 100) * circumference

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#1f2937"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700"
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-gray-100 text-xl font-bold"
        transform={`rotate(90 ${size / 2} ${size / 2})`}
      >
        {clampedPct.toFixed(1)}%
      </text>
    </svg>
  )
}
