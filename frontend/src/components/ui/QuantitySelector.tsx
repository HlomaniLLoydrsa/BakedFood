import { Minus, Plus } from 'lucide-react';

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export function QuantitySelector({
  value,
  onChange,
  min = 0,
  max,
  disabled = false,
  size = 'md',
}: QuantitySelectorProps) {
  const btnSize = size === 'sm' ? 'w-7 h-7' : 'w-9 h-9';
  const textSize = size === 'sm' ? 'text-sm w-7' : 'text-base w-10';
  const iconSize = size === 'sm' ? 14 : 16;

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        className={`${btnSize} flex items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 active:bg-zinc-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed`}
        aria-label="Decrease quantity"
      >
        <Minus size={iconSize} />
      </button>
      <span className={`${textSize} text-center font-semibold text-zinc-900 tabular-nums`}>
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(max !== undefined ? Math.min(max, value + 1) : value + 1)}
        disabled={disabled || (max !== undefined && value >= max)}
        className={`${btnSize} flex items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 active:bg-zinc-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed`}
        aria-label="Increase quantity"
      >
        <Plus size={iconSize} />
      </button>
    </div>
  );
}
