'use client';

import { useState } from 'react';
import { Plus, Trash2, ShieldCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DEFAULT_EXPENSE_CATEGORIES } from '@/types/expense';
import { useAppDispatch } from '@/store';
import { addCustomCategory, removeCustomCategory } from '@/features/trips/tripsThunks';

interface CategoryManagementDialogProps {
  tripId: string;
  customCategories: string[];
}

export function CategoryManagementDialog({
  tripId,
  customCategories,
}: CategoryManagementDialogProps) {
  const dispatch = useAppDispatch();
  const [newCategory, setNewCategory] = useState('');
  const [error, setError] = useState('');

  const handleAdd = async () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;

    if (
      DEFAULT_EXPENSE_CATEGORIES.some(
        (c) => c.toLowerCase() === trimmed.toLowerCase()
      ) ||
      customCategories.some((c) => c.toLowerCase() === trimmed.toLowerCase())
    ) {
      setError('Category already exists');
      return;
    }

    try {
      await dispatch(addCustomCategory({ tripId, category: trimmed })).unwrap();
      setNewCategory('');
      setError('');
    } catch (e) {
      setError('Failed to add category');
    }
  };

  const handleRemove = async (category: string) => {
    try {
      await dispatch(removeCustomCategory({ tripId, category })).unwrap();
    } catch (e) {
      setError('Failed to remove category');
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs px-2">
          Manage
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Categories</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Add New Category</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Gear, Parking..."
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
              <Button size="icon" onClick={handleAdd}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {error && <p className="text-danger text-xs">{error}</p>}
          </div>

          <div className="space-y-3">
            <Label>Existing Categories</Label>
            
            <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2">
              <div className="space-y-2">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Default (Locked)
                </p>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_EXPENSE_CATEGORIES.map((cat) => (
                    <Badge key={cat} variant="secondary" className="flex gap-1 items-center">
                      <ShieldCheck className="h-3 w-3 text-muted-foreground" />
                      {cat}
                    </Badge>
                  ))}
                </div>
              </div>

              {customCategories.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    Custom
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {customCategories.map((cat) => (
                      <Badge key={cat} className="flex gap-2 pr-1 items-center bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                        {cat}
                        <button
                          onClick={() => handleRemove(cat)}
                          className="hover:text-danger transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
