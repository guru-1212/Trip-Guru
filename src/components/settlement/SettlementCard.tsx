'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { Settlement } from '@/types/settlement';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

interface SettlementCardProps {
  settlement: Settlement;
  fromName: string;
  toName: string;
  currency: string;
  onMarkPaid?: () => void;
  canMarkPaid?: boolean;
  index?: number;
}

export function SettlementCard({
  settlement,
  fromName,
  toName,
  currency,
  onMarkPaid,
  canMarkPaid,
  index = 0,
}: SettlementCardProps) {
  const isPaid = settlement.status === 'paid';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className={isPaid ? 'opacity-75' : ''}>
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap text-sm sm:text-base">
            <span className="font-medium">{fromName}</span>
            <span className="text-muted-foreground">owes</span>
            <span className="font-medium">{toName}</span>
            <ArrowRight className="h-4 w-4 text-primary hidden sm:block" />
            <span className="font-bold text-primary">
              {formatCurrency(settlement.amount, currency)}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={isPaid ? 'success' : 'warning'}>
              {settlement.status}
            </Badge>
            {!isPaid && canMarkPaid && onMarkPaid && (
              <Button size="sm" variant="success" onClick={onMarkPaid}>
                <Check className="h-4 w-4 mr-1" /> Paid
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
