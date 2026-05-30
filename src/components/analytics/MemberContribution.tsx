'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Expense } from '@/types/expense';
import { TripMember } from '@/types/member';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getMemberKey } from '@/lib/utils';

interface MemberContributionProps {
  expenses: Expense[];
  members: TripMember[];
}

export function MemberContribution({ expenses, members }: MemberContributionProps) {
  const paid = expenses.reduce<Record<string, number>>((acc, e) => {
    if (e.paidBy) {
      acc[e.paidBy] = (acc[e.paidBy] ?? 0) + e.amount;
    }
    return acc;
  }, {});

  const data = members
    .filter((m) => m.inviteStatus === 'accepted')
    .map((m) => {
      const key = getMemberKey(m);
      return { name: m.name, amount: paid[key] ?? 0 };
    })
    .filter((d) => d.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Member contributions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No payment data yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Who spent most</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="amount" fill="#10B981" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
