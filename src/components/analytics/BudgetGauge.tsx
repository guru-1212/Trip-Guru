'use client';

import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface BudgetGaugeProps {
  expected: number;
  spent: number;
  planned: number;
  currency: string;
}

export function BudgetGauge({ expected, spent, planned, currency }: BudgetGaugeProps) {
  const percent = expected > 0 ? Math.min((spent / expected) * 100, 100) : 0;
  const plannedPercent = expected > 0 ? Math.min((planned / expected) * 100, 100) : 0;
  const overBudget = spent > expected;
  const overPlanned = planned > expected;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Budget Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-4 sm:p-6">
        <div className="space-y-2">
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="font-medium">Actual Spent</span>
            <span className="font-bold">{formatCurrency(spent, currency)} <span className="text-muted-foreground font-normal">/ {formatCurrency(expected, currency)}</span></span>
          </div>
          <Progress value={percent} className={overBudget ? '[&>div]:bg-danger' : ''} />
          <p className={`text-[10px] sm:text-[11px] ${overBudget ? 'text-danger font-medium' : 'text-muted-foreground'}`}>
            {overBudget
              ? `Exceeded budget by ${formatCurrency(spent - expected, currency)}`
              : `${(100 - percent).toFixed(0)}% of total budget remaining`}
          </p>
        </div>

        <div className="space-y-2 pt-2 border-t border-dashed">
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="font-medium text-primary">Planned (Draft)</span>
            <span className="font-bold text-primary">{formatCurrency(planned, currency)}</span>
          </div>
          <div className="relative h-2 w-full bg-secondary rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all ${overPlanned ? 'bg-orange-500' : 'bg-primary'}`} 
              style={{ width: `${plannedPercent}%` }} 
            />
          </div>
          <div className="flex justify-between items-center gap-2">
            <p className="text-[10px] sm:text-[11px] text-muted-foreground flex-1">
              {overPlanned 
                ? `⚠️ Exceeds total budget`
                : `Planning covers ${plannedPercent.toFixed(0)}% of budget`}
            </p>
            {planned > 0 && (
              <div className="flex flex-col items-end shrink-0">
                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter leading-none mb-0.5">
                  Burn Rate
                </span>
                <span className="text-[11px] sm:text-xs font-black">
                  {((spent / planned) * 100).toFixed(0)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
