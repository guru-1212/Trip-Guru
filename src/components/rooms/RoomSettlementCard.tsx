'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

export function RoomSettlementCard({
  fromName,
  toName,
  amount,
  currency,
  status,
  onMarkPaid,
  canMarkPaid,
}: {
  fromName: string;
  toName: string;
  amount: number;
  currency: string;
  status: string;
  onMarkPaid?: () => void;
  canMarkPaid?: boolean;
}) {
  const isPaid = status === 'paid';
  return (
    <Card className={isPaid ? 'opacity-75' : ''}>
      <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm font-bold">
          <span>{fromName}</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <span>{toName}</span>
          <span className="text-primary">
            {formatCurrency(amount, currency)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isPaid ? 'default' : 'secondary'}>{status}</Badge>
          {!isPaid && canMarkPaid && onMarkPaid && (
            <Button size="sm" variant="outline" onClick={onMarkPaid}>
              Mark paid
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
