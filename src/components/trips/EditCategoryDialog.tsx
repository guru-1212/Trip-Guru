'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAppDispatch } from '@/store';
import { updateTripCategory } from '@/features/trips/tripsThunks';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const formSchema = z.object({
  category: z.string().max(30, 'Category name must be 30 characters or less.'),
});

interface EditCategoryDialogProps {
  tripId: string;
  currentCategory: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCategoryDialog({
  tripId,
  currentCategory,
  isOpen,
  onOpenChange,
}: EditCategoryDialogProps) {
  const dispatch = useAppDispatch();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<{ category: string }>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: currentCategory,
    },
  });

  const onSubmit = async (data: { category: string }) => {
    await dispatch(updateTripCategory({ tripId, category: data.category })).unwrap();
    onOpenChange(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      reset({ category: currentCategory });
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Trip Category</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div>
            <Label htmlFor="category">Category Name</Label>
            <Input
              id="category"
              placeholder="e.g., Test Trips, Family Vacation"
              {...register('category')}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Leave blank to remove from category.
            </p>
            {errors.category && (
              <p className="text-danger text-sm mt-1">{errors.category.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
