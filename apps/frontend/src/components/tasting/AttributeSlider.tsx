'use client';

interface AttributeSliderProps {
  label: string;
  min: number;
  max: number;
  /** null — характеристика ещё не оценена. */
  value: number | null;
  onChange: (value: number) => void;
  readOnly?: boolean;
}

export default function AttributeSlider({
  label,
  min,
  max,
  value,
  onChange,
  readOnly = false,
}: AttributeSliderProps) {
  const sliderValue = value ?? min;

  return (
    <div className="mb-4">
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-gray-700">{label}</span>
        <span
          className={`font-semibold ${
            value === null ? 'text-gray-300' : 'text-wine-500'
          }`}
        >
          {value === null ? '—' : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={sliderValue}
        disabled={readOnly}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-wine-500 disabled:cursor-not-allowed disabled:opacity-60 ${
          value === null ? 'opacity-70' : ''
        }`}
      />
      <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
        {Array.from({ length: max - min + 1 }).map((_, i) => (
          <span key={i}>{min + i}</span>
        ))}
      </div>
    </div>
  );
}
