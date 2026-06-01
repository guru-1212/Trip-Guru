'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { ArrowRight, Clock, CheckCircle2 } from 'lucide-react';
import { RoomSettlementStatus } from '@/types/roomSettlement';

export function RoomSettlementCard({
  fromName,
  toName,
  amount,
  currency,
  status,
  viewAs,
  onClaimPaid,
  onConfirmReceived,
  claiming,
  confirming,
}: {
  fromName: string;
  toName: string;
  amount: number;
  currency: string;
  status: RoomSettlementStatus | string;
  /** Whose perspective to phrase labels for */
  viewAs?: 'debtor' | 'creditor' | 'other';
  onClaimPaid?: () => void;
  onConfirmReceived?: () => void;
  claiming?: boolean;
  confirming?: boolean;
}) {
  const isPaid = status === 'paid';
  const awaiting = status === 'awaiting_confirmation';

  const statusBadge = () => {
    if (isPaid) {
      return (
        <Badge variant="default" className="gap-1">
          <CheckCircle2 className="h-3 w-3" /> Settled
        </Badge>
      );
    }
    if (awaiting) {
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" /> Awaiting confirmation
        </Badge>
      );
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  const primaryLabel = () => {
    if (viewAs === 'debtor') {
      return (
        <>
          Pay to <span className="text-primary">{toName}</span>
        </>
      );
    }
    if (viewAs === 'creditor' && awaiting) {
      return (
        <>
          <span className="text-primary">{fromName}</span> says they paid you
        </>
      );
    }
    if (viewAs === 'creditor') {
      return (
        <>
          <span className="text-primary">{fromName}</span> owes you
        </>
      );
    }
    return (
      <>
        <span>{fromName}</span>
        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
        <span>{toName}</span>
      </>
    );
  };

  return (
    <Card className={isPaid ? 'opacity-75 border-emerald-500/30' : ''}>
      <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 text-sm font-bold flex-wrap">
            {viewAs === 'other' ? (
              <span className="flex items-center gap-2">{primaryLabel()}</span>
            ) : (
              <span>{primaryLabel()}</span>
            )}
            <span className="text-primary whitespace-nowrap">
              {formatCurrency(amount, currency)}
            </span>
          </div>
          {viewAs === 'debtor' && awaiting && (
            <p className="text-xs text-muted-foreground">
              Waiting for {toName} to confirm they received your payment.
            </p>
          )}
          {viewAs === 'debtor' && !isPaid && !awaiting && (
            <p className="text-xs text-muted-foreground">
              Mark as paid after you pay {toName}. They must confirm to close this.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {statusBadge()}
          {viewAs === 'debtor' && status === 'pending' && onClaimPaid && (
            <Button
              size="sm"
              onClick={onClaimPaid}
              disabled={claiming}
            >
              {claiming ? 'Saving...' : "I've paid"}
            </Button>
          )}
          {viewAs === 'creditor' && awaiting && onConfirmReceived && (
            <Button
              size="sm"
              variant="default"
              onClick={onConfirmReceived}
              disabled={confirming}
            >
              {confirming ? 'Confirming...' : 'Confirm received'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
