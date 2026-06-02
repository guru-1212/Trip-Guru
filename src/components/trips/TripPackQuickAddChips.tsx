'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { getTripPackQuickAddItems } from '@/lib/tripPackTemplates';
import { useAppDispatch, useAppSelector } from '@/store';
import { addTripPackTemplateItemThunk } from '@/features/tripPackItems/tripPackItemsThunks';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TripPackQuickAddChips({
  tripId,
  disabled,
}: {
  tripId: string;
  disabled?: boolean;
}) {
  const dispatch = useAppDispatch();
  const items = useAppSelector((s) => s.tripPackItems.items);
  const [busySlug, setBusySlug] = useState<string | null>(null);

  const quickItems = getTripPackQuickAddItems();

  const isOnList = (packKey: string, slug: string) =>
    items.some(
      (i) =>
        i.tripId === tripId &&
        i.templateKey === packKey &&
        i.templateItemSlug === slug
    );

  const handleAdd = async (packKey: string, slug: string) => {
    if (disabled || isOnList(packKey, slug)) return;
    setBusySlug(slug);
    try {
      await dispatch(
        addTripPackTemplateItemThunk({ tripId, packKey, slug })
      ).unwrap();
    } finally {
      setBusySlug(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {quickItems.map((item) => {
        const added = isOnList(item.packKey, item.slug);
        return (
          <Button
            key={`${item.packKey}-${item.slug}`}
            type="button"
            variant={added ? 'secondary' : 'outline'}
            size="sm"
            className={cn('rounded-full', added && 'opacity-80')}
            disabled={disabled || added || busySlug === item.slug}
            onClick={() => handleAdd(item.packKey, item.slug)}
          >
            {added && <Check className="h-3 w-3 mr-1" />}
            {item.title}
          </Button>
        );
      })}
    </div>
  );
}
