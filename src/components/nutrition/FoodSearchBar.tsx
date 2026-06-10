'use client';

import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FoodSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onClick?: () => void;
  placeholder?: string;
  className?: string;
}

export function FoodSearchBar({
  value,
  onChange,
  onFocus,
  onClick,
  placeholder = 'Search food — rice, egg, paneer, annam…',
  className,
}: FoodSearchBarProps) {
  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
      <input
        type="search"
        enterKeyHint="search"
        className="ft-input w-full pl-10 pr-4 text-base min-h-[48px] rounded-xl"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onClick={onClick}
      />
    </div>
  );
}
