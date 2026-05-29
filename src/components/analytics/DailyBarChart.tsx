'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Expense } from '@/types/expense';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import dayjs from 'dayjs';

interface DailyBarChartProps {
  expenses: Expense[];
}

export function DailyBarChart({ expenses }: DailyBarChartProps) {
  const byDate = expenses.reduce<Record<string, number>>((acc, e) => {
    const date = dayjs(e.createdAt.toDate()).format('YYYY-MM-DD');
    acc[date] = (acc[date] ?? 0) + e.amount;
    return acc;
  }, {});

  const data = Object.entries(byDate)
    .map(([date, amount]) => ({
      date: dayjs(date).format('MMM D'),
      amount,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Daily spending</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No expense data yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Daily spending</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="amount" fill="#6366F1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
