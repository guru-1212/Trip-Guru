'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Expense, ExpenseCategory } from '@/types/expense';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { RefreshCcw } from 'lucide-react';
import { useAppDispatch } from '@/store';
import { updateTripExpectedBudget } from '@/features/trips/tripsThunks';

interface ComparisonOverviewProps {
  expenses: Expense[];
  currency: string;
  tripId: string;
  expectedBudget: number;
}

export function ComparisonOverview({ expenses, currency, tripId, expectedBudget }: ComparisonOverviewProps) {
  const dispatch = useAppDispatch();

  const stats = useMemo(() => {
    const categories = Array.from(new Set(expenses.map(e => e.category)));
    
    const data = categories.map(cat => {
      const planned = expenses
        .filter(e => e.category === cat && e.expenseType === 'planned')
        .reduce((sum, e) => sum + e.amount, 0);
      
      const actual = expenses
        .filter(e => e.category === cat && e.expenseType === 'actual')
        .reduce((sum, e) => sum + e.amount, 0);
        
      return { category: cat, planned, actual };
    }).filter(d => d.planned > 0 || d.actual > 0);

    const totalPlanned = expenses
      .filter(e => e.expenseType === 'planned')
      .reduce((sum, e) => sum + e.amount, 0);
      
    const totalActual = expenses
      .filter(e => (e.expenseType || 'actual') === 'actual')
      .reduce((sum, e) => sum + e.amount, 0);

    return { categories: data, totalPlanned, totalActual };
  }, [expenses]);

  const handleSyncBudget = () => {
    dispatch(updateTripExpectedBudget({ tripId, amount: stats.totalPlanned }));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Assumption</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalPlanned, currency)}</div>
            {stats.totalPlanned !== expectedBudget && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-2 h-8 text-xs text-primary"
                onClick={handleSyncBudget}
              >
                <RefreshCcw className="h-3 w-3 mr-1" /> Sync to Trip Budget
              </Button>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Real Spending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalActual, currency)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalPlanned > 0 
                ? `${((stats.totalActual / stats.totalPlanned) * 100).toFixed(1)}% of planned budget`
                : 'No planned budget set'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Category Breakdown (Real vs Assumption)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {stats.categories.length > 0 ? (
            stats.categories.map((cat) => {
              const percent = cat.planned > 0 ? Math.min((cat.actual / cat.planned) * 100, 100) : 0;
              const overBudget = cat.planned > 0 && cat.actual > cat.planned;
              
              return (
                <div key={cat.category} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{cat.category}</span>
                    <span>
                      <span className="font-bold">{formatCurrency(cat.actual, currency)}</span>
                      <span className="text-muted-foreground mx-1">/</span>
                      <span className="text-muted-foreground">{formatCurrency(cat.planned, currency)}</span>
                    </span>
                  </div>
                  <Progress 
                    value={percent} 
                    className={overBudget ? '[&>div]:bg-danger' : ''} 
                  />
                  {overBudget && (
                    <p className="text-[10px] text-danger font-medium">
                      Exceeded assumption by {formatCurrency(cat.actual - cat.planned, currency)}
                    </p>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-center text-muted-foreground py-4">No categories to compare yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
