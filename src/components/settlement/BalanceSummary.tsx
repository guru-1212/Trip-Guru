'use client';

import { TripMember } from '@/types/member';
import { Expense } from '@/types/expense';
import { calculateNetBalances } from '@/lib/settlementAlgorithm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, getMemberKey } from '@/lib/utils';

interface BalanceSummaryProps {
  expenses: Expense[];
  members: TripMember[];
  currency: string;
}

export function BalanceSummary({ expenses, members, currency }: BalanceSummaryProps) {
  const balances = calculateNetBalances(expenses, members);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Net balances</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {members
          .map((m) => {
            const key = getMemberKey(m);
            const balance = balances.get(key) ?? 0;
            return (
              <div key={key} className="flex justify-between text-sm">
                <span>{m.name}</span>
                <span
                  className={
                    balance > 0
                      ? 'text-success font-medium'
                      : balance < 0
                        ? 'text-danger font-medium'
                        : 'text-muted-foreground'
                  }
                >
                  {balance > 0 ? '+' : ''}
                  {formatCurrency(balance, currency)}
                </span>
              </div>
            );
          })}
      </CardContent>
    </Card>
  );
}
