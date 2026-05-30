'use client';

import { motion } from 'framer-motion';
import { Receipt, Trash2, CheckCircle2, Pencil } from 'lucide-react';
import { Expense } from '@/types/expense';
import { TripMember } from '@/types/member';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, getMemberKey } from '@/lib/utils';
import dayjs from 'dayjs';

interface ExpenseCardProps {
  expense: Expense;
  members: TripMember[];
  currency: string;
  onDelete?: (id: string) => void;
  onEdit?: (expense: Expense) => void;
  onConvert?: (expense: Expense) => void;
  canDelete?: boolean;
  index?: number;
}

export function ExpenseCard({
  expense,
  members,
  currency,
  onDelete,
  onEdit,
  onConvert,
  canDelete,
  index = 0,
}: ExpenseCardProps) {
  const getName = (uid: string) =>
    members.find((m) => getMemberKey(m) === uid)?.name ?? uid;

  const isPlanned = expense.expenseType === 'planned';

  const splitSummary = !isPlanned && expense.splitBetween
    ? expense.splitBetween
        .map((s) => `${getName(s.uid)}: ${formatCurrency(s.amount, currency)}`)
        .join(' · ')
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Card className={isPlanned ? 'border-dashed border-primary/50 bg-primary/5' : ''}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg font-semibold">
                  {formatCurrency(expense.amount, currency)}
                </span>
                <Badge variant="secondary">{expense.category}</Badge>
                <Badge variant={isPlanned ? "outline" : "default"} className={isPlanned ? "border-primary text-primary" : ""}>
                  {isPlanned ? 'Planned' : 'Actual'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {isPlanned ? 'Assumption' : `Paid by ${getName(expense.paidBy!)}`} ·{' '}
                {expense.createdAt 
                  ? dayjs(expense.createdAt.toDate()).format('MMM D, YYYY')
                  : 'Just now'}
              </p>
              {!isPlanned && splitSummary && (
                <p className="text-xs text-muted-foreground mt-1 capitalize">
                  {expense.splitType} split: {splitSummary}
                </p>
              )}
              {expense.note && (
                <p className="text-sm mt-2">{expense.note}</p>
              )}
            </div>
            <div className="flex gap-1">
              {isPlanned && onConvert && (
                <Button variant="ghost" size="icon" onClick={() => onConvert(expense)} title="Mark as Real">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                </Button>
              )}
              {onEdit && (
                <Button variant="ghost" size="icon" onClick={() => onEdit(expense)} title="Edit Expense">
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
              {expense.receiptURL && (
                <a href={expense.receiptURL} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon">
                    <Receipt className="h-4 w-4" />
                  </Button>
                </a>
              )}
              {canDelete && onDelete && (
                <Button variant="ghost" size="icon" onClick={() => onDelete(expense.id)}>
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
