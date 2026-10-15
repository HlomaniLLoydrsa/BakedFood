import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-bold text-stone-900 mb-1">{title}</h3>
      {description && <p className="text-sm text-stone-400 max-w-xs">{description}</p>}
      {action && (
        <div className="mt-5">
          <Button onClick={action.onClick} size="sm">{action.label}</Button>
        </div>
      )}
    </div>
  );
}
