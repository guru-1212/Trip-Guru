'use client';

import { useMemo } from 'react';
import { useAppSelector } from '@/store';
import dayjs from 'dayjs';

export function useExpenses() {
  const { expenses, filters, loading } = useAppSelector((s) => s.expenses);

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      const type = e.expenseType || 'actual';
      if (filters.expenseType !== 'all' && type !== filters.expenseType) {
        return false;
      }
      if (filters.category !== 'all' && e.category !== filters.category) {
        return false;
      }
      if (filters.memberId !== 'all') {
        const inSplit = e.splitBetween?.some((s) => s.uid === filters.memberId);
        if (e.paidBy !== filters.memberId && !inSplit) return false;
      }
      if (filters.dateFrom) {
        if (!e.createdAt) return false;
        const from = dayjs(filters.dateFrom);
        if (dayjs(e.createdAt.toDate()).isBefore(from, 'day')) return false;
      }
      if (filters.dateTo) {
        if (!e.createdAt) return false;
        const to = dayjs(filters.dateTo);
        if (dayjs(e.createdAt.toDate()).isAfter(to, 'day')) return false;
      }
      return true;
    });
  }, [expenses, filters]);

  const totalSpent = useMemo(
    () => expenses
      .filter(e => (e.expenseType || 'actual') === 'actual')
      .reduce((s, e) => s + e.amount, 0),
    [expenses]
  );

  const totalPlanned = useMemo(
    () => expenses
      .filter(e => e.expenseType === 'planned')
      .reduce((s, e) => s + e.amount, 0),
    [expenses]
  );

  return { expenses: filtered, allExpenses: expenses, totalSpent, totalPlanned, loading, filters };
}
