'use client';

import { useAppDispatch, useAppSelector } from '@/store';
import { setFilters } from '@/features/expenses/expensesSlice';
import { ExpenseCategory, DEFAULT_EXPENSE_CATEGORIES } from '@/types/expense';
import { TripMember } from '@/types/member';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getMemberKey } from '@/lib/utils';

interface ExpenseFiltersProps {
  members: TripMember[];
}

export function ExpenseFilters({ members }: ExpenseFiltersProps) {
  const dispatch = useAppDispatch();
  const filters = useAppSelector((s) => s.expenses.filters);
  const { currentTrip } = useAppSelector((s) => s.trips);

  const customCategories = currentTrip?.customExpenseCategories || [];
  const allCategories = ['all', ...DEFAULT_EXPENSE_CATEGORIES, ...customCategories];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 p-4 rounded-lg border border-border bg-muted/30">
      <div>
        <Label>Category</Label>
        <Select
          value={filters.category}
          onValueChange={(v) =>
            dispatch(setFilters({ category: v as ExpenseCategory | 'all' }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {allCategories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Member</Label>
        <Select
          value={filters.memberId}
          onValueChange={(v) => dispatch(setFilters({ memberId: v }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {members.map((m) => {
              const key = getMemberKey(m);
              return (
                <SelectItem key={key} value={key}>
                  {m.name}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>From</Label>
        <Input
          type="date"
          value={filters.dateFrom ?? ''}
          onChange={(e) =>
            dispatch(setFilters({ dateFrom: e.target.value || null }))
          }
        />
      </div>
      <div>
        <Label>To</Label>
        <Input
          type="date"
          value={filters.dateTo ?? ''}
          onChange={(e) =>
            dispatch(setFilters({ dateTo: e.target.value || null }))
          }
        />
      </div>
    </div>
  );
}
