import { Loader2 } from 'lucide-react';

interface SpinnerProps { size?: number; className?: string; }

export function Spinner({ size = 20, className = '' }: SpinnerProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Loader2 size={size} className="animate-spin text-stone-300" />
    </div>
  );
}

export function PageSpinner() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Spinner size={28} />
    </div>
  );
}
