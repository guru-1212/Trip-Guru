'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SplitSelector } from './SplitSelector';
import { TripMember } from '@/types/member';
import { ExpenseCategory, SplitType } from '@/types/expense';
import { calculateSplit, SplitValidationError } from '@/lib/splitCalculator';
import { getMemberKey } from '@/lib/utils';
import { useAppDispatch } from '@/store';
import { addExpenseThunk } from '@/features/expenses/expensesThunks';
import { uploadReceipt } from '@/firebase/storage';

const categories: ExpenseCategory[] = [
  'Food', 'Hotel', 'Petrol', 'Toll', 'Shopping', 'Ticket', 'Emergency', 'Misc',
];

const schema = z.object({
  amount: z.coerce.number().positive('Amount must be positive'),
  category: z.enum([
    'Food', 'Hotel', 'Petrol', 'Toll', 'Shopping', 'Ticket', 'Emergency', 'Misc',
  ]),
  paidBy: z.string().min(1, 'Select who paid'),
  note: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ExpenseFormProps {
  tripId: string;
  members: TripMember[];
  createdBy: string;
  onSuccess?: () => void;
}

export function ExpenseForm({ tripId, members, createdBy, onSuccess }: ExpenseFormProps) {
  const dispatch = useAppDispatch();
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    members.map(getMemberKey)
  );
  const [unequalAmounts, setUnequalAmounts] = useState<Record<string, number>>({});
  const [percents, setPercents] = useState<Record<string, number>>({});
  const [singleDebtor, setSingleDebtor] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'Food' },
  });

  const amount = watch('amount') || 0;
  const paidBy = watch('paidBy');
  const category = watch('category');

  const onSubmit = async (data: FormData) => {
    setError('');
    setSubmitting(true);
    try {
      let splitBetween;
      if (splitType === 'equal') {
        const uidsToSplit = selectedMembers.length > 0 ? selectedMembers : members.map(getMemberKey);
        splitBetween = calculateSplit('equal', data.amount, {
          memberUids: uidsToSplit,
        });
      } else if (splitType === 'unequal') {
        splitBetween = calculateSplit('unequal', data.amount, {
          unequalEntries: Object.entries(unequalAmounts).map(([uid, amt]) => ({
            uid,
            amount: amt,
          })),
        });
      } else if (splitType === 'percent') {
        splitBetween = calculateSplit('percent', data.amount, {
          percentEntries: Object.entries(percents).map(([uid, percent]) => ({
            uid,
            percent,
          })),
        });
      } else {
        splitBetween = calculateSplit('single', data.amount, {
          payerUid: paidBy,
          singleDebtorUid: singleDebtor,
        });
      }

      const tempId = `temp_${Date.now()}`;
      let receiptURL = '';
      if (receiptFile) {
        receiptURL = await uploadReceipt(tripId, tempId, receiptFile);
      }

      await dispatch(
        addExpenseThunk({
          tripId,
          amount: data.amount,
          category: data.category,
          paidBy: data.paidBy,
          splitType,
          splitBetween,
          receiptURL,
          note: data.note ?? '',
          createdBy,
        })
      ).unwrap();

      onSuccess?.();
    } catch (e) {
      if (e instanceof SplitValidationError) {
        setError(e.message);
      } else {
        setError((e as Error).message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="amount">Amount</Label>
          <Input id="amount" type="number" step="0.01" {...register('amount')} />
          {errors.amount && (
            <p className="text-danger text-sm">{errors.amount.message}</p>
          )}
        </div>
        <div>
          <Label>Category</Label>
          <Select
            value={category}
            onValueChange={(v) => setValue('category', v as ExpenseCategory)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Paid by</Label>
        <Select value={paidBy} onValueChange={(v) => setValue('paidBy', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select member" />
          </SelectTrigger>
          <SelectContent>
            {members
              .map((m) => {
                const key = getMemberKey(m);
                return (
                  <SelectItem key={key} value={key}>
                    {m.name}
                  </SelectItem>
                );
              })}
          </SelectContent>
        </Select>
        {errors.paidBy && (
          <p className="text-danger text-sm">{errors.paidBy.message}</p>
        )}
      </div>

      <SplitSelector
        splitType={splitType}
        onSplitTypeChange={setSplitType}
        members={members}
        amount={Number(amount)}
        selectedMembers={selectedMembers}
        onSelectedMembersChange={setSelectedMembers}
        unequalAmounts={unequalAmounts}
        onUnequalChange={(uid, val) =>
          setUnequalAmounts({ ...unequalAmounts, [uid]: val })
        }
        percents={percents}
        onPercentChange={(uid, val) => setPercents({ ...percents, [uid]: val })}
        singleDebtor={singleDebtor}
        onSingleDebtorChange={setSingleDebtor}
      />

      <div>
        <Label htmlFor="receipt">Receipt (optional)</Label>
        <Input
          id="receipt"
          type="file"
          accept="image/*"
          onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <div>
        <Label htmlFor="note">Note</Label>
        <Textarea id="note" {...register('note')} />
      </div>

      {error && <p className="text-danger text-sm">{error}</p>}
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? 'Saving...' : 'Add expense'}
      </Button>
    </form>
  );
}
