'use client';

import { RoomAuditLog } from '@/types/roomAuditLog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import dayjs from 'dayjs';
import {
  CreditCard,
  HandCoins,
  History,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  Home,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const actionConfig: Record<
  RoomAuditLog['action'],
  { label: string; icon: LucideIcon; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  'room.created': { label: 'Room', icon: Home, variant: 'default' },
  'expense.created': { label: 'Expense', icon: Plus, variant: 'default' },
  'expense.updated': { label: 'Expense', icon: Pencil, variant: 'secondary' },
  'expense.deleted': { label: 'Expense', icon: Trash2, variant: 'destructive' },
  'member.invited': { label: 'Member', icon: UserPlus, variant: 'default' },
  'member.removed': { label: 'Member', icon: Trash2, variant: 'destructive' },
  'settlement.saved': { label: 'Settlement', icon: HandCoins, variant: 'secondary' },
  'settlement.marked_paid': { label: 'Settlement', icon: HandCoins, variant: 'default' },
  'settlement.payment_claimed': { label: 'Settlement', icon: HandCoins, variant: 'secondary' },
  'settlement.payment_confirmed': { label: 'Settlement', icon: HandCoins, variant: 'default' },
  'rent.initialized': { label: 'Rent', icon: CreditCard, variant: 'default' },
  'rent.paid': { label: 'Rent', icon: CreditCard, variant: 'default' },
  'rent.amount_updated': { label: 'Rent', icon: Pencil, variant: 'secondary' },
  'cycle.closed': { label: 'Cycle', icon: History, variant: 'outline' },
};

export function RoomAuditTimeline({ logs }: { logs: RoomAuditLog[] }) {
  if (logs.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        No activity recorded yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => {
        const config = actionConfig[log.action] ?? {
          label: 'Activity',
          icon: History,
          variant: 'outline' as const,
        };
        const Icon = config.icon;
        const createdAt = log.createdAt?.toDate?.();

        return (
          <Card key={log.id}>
            <CardContent className="p-4 flex gap-3 items-start">
              <div className="mt-0.5 rounded-lg bg-muted p-2 shrink-0">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={config.variant}>{config.label}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {createdAt
                      ? dayjs(createdAt).format('D MMM YYYY, h:mm A')
                      : 'Just now'}
                  </span>
                </div>
                <p className="text-sm font-medium leading-snug">{log.summary}</p>
                <p className="text-xs text-muted-foreground">By {log.actorName}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
