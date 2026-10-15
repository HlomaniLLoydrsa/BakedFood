import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  targetDate: string;
  onExpire?: () => void;
  className?: string;
}

function padTwo(n: number): string {
  return String(n).padStart(2, '0');
}

export function CountdownTimer({ targetDate, onExpire, className = '' }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{ h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    function calc() {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ h: 0, m: 0, s: 0 });
        onExpire?.();
        return;
      }
      const totalSecs = Math.floor(diff / 1000);
      const h = Math.floor(totalSecs / 3600);
      const m = Math.floor((totalSecs % 3600) / 60);
      const s = totalSecs % 60;
      setTimeLeft({ h, m, s });
    }

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [targetDate, onExpire]);

  if (!timeLeft) return null;

  return (
    <span className={`font-mono font-semibold tabular-nums ${className}`}>
      {padTwo(timeLeft.h)}:{padTwo(timeLeft.m)}:{padTwo(timeLeft.s)}
    </span>
  );
}
