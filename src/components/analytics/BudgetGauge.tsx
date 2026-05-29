'use client';

import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface BudgetGaugeProps {
  expected: number;
  spent: number;
  currency: string;
}

export function BudgetGauge({ expected, spent, currency }: BudgetGaugeProps) {
  const percent = expected > 0 ? Math.min((spent / expected) * 100, 100) : 0;
  const overBudget = spent > expected;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Budget</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between text-sm">
          <span>Spent: {formatCurrency(spent, currency)}</span>
          <span>Expected: {formatCurrency(expected, currency)}</span>
        </div>
        <Progress value={percent} className={overBudget ? '[&>div]:bg-danger' : ''} />
        <p className={`text-sm ${overBudget ? 'text-danger' : 'text-muted-foreground'}`}>
          {overBudget
            ? `Over budget by ${formatCurrency(spent - expected, currency)}`
            : `${(100 - percent).toFixed(0)}% of budget remaining`}
        </p>
      </CardContent>
    </Card>
  );
}
