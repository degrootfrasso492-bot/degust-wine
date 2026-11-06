'use client';

interface ScoreBarProps {
  label: string;
  value: number;
  max?: number;
}

export default function ScoreBar({ label, value, max = 5 }: ScoreBarProps) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-24 flex-shrink-0 text-right">
        {label}
      </span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-wine-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-wine-500 w-8 flex-shrink-0">
        {value.toFixed(1)}
      </span>
    </div>
  );
}
