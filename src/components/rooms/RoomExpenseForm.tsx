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
import { SplitSelector } from '@/components/expenses/SplitSelector';
import { RoomMember } from '@/types/roomMember';
import { ROOM_EXPENSE_CATEGORIES, RoomExpense } from '@/types/roomExpense';
import { SplitType } from '@/types/expense';
import { calculateSplit, SplitValidationError } from '@/lib/splitCalculator';
import { getMemberKey } from '@/lib/utils';
import { useAppDispatch } from '@/store';
import {
  addRoomExpenseThunk,
  updateRoomExpenseThunk,
} from '@/features/roomExpenses/roomExpensesThunks';
import { uploadRoomReceipt } from '@/firebase/storage';
import { Timestamp } from 'firebase/firestore';
import dayjs from 'dayjs';

const schema = z.object({
  title: z.string().min(1, 'Title required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  category: z.string().min(1),
  paidBy: z.string().min(1, 'Select who paid'),
  expenseDate: z.string().min(1),
  expenseTime: z.string().optional(),
  note: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function RoomExpenseForm({
  roomId,
  cycleId,
  members,
  createdBy,
  onSuccess,
  initialData,
}: {
  roomId: string;
  cycleId: string;
  members: RoomMember[];
  createdBy: string;
  onSuccess?: () => void;
  initialData?: RoomExpense;
}) {
  const dispatch = useAppDispatch();
  const isEditing = !!initialData?.id;

  const [splitType, setSplitType] = useState<SplitType>(
    initialData?.splitType ?? 'equal'
  );
  const acceptedMembers = members.filter((m) => m.inviteStatus === 'accepted');
  const defaultSplitMembers = acceptedMembers.map(getMemberKey);

  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    initialData?.splitBetween?.map((s) => s.uid) ?? defaultSplitMembers
  );
  const [unequalAmounts, setUnequalAmounts] = useState<Record<string, number>>(
    initialData?.splitType === 'unequal'
      ? Object.fromEntries(
          initialData.splitBetween?.map((s) => [s.uid, s.amount]) ?? []
        )
      : {}
  );
  const [percents, setPercents] = useState<Record<string, number>>(
    initialData?.splitType === 'percent'
      ? Object.fromEntries(
          initialData.splitBetween?.map((s) => [
            s.uid,
            (s.amount / (initialData.amount || 1)) * 100,
          ]) ?? []
        )
      : {}
  );
  const [singleDebtor, setSingleDebtor] = useState(
    initialData?.splitType === 'single'
      ? initialData.splitBetween?.[0]?.uid ?? ''
      : ''
  );
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
    defaultValues: {
      title: initialData?.title ?? '',
      amount: initialData?.amount,
      category: initialData?.category ?? 'Groceries',
      expenseDate: initialData?.expenseDate
        ? dayjs(initialData.expenseDate.toDate()).format('YYYY-MM-DD')
        : dayjs().format('YYYY-MM-DD'),
      expenseTime:
        initialData?.expenseTime ?? dayjs().format('HH:mm'),
      paidBy: initialData?.paidBy ?? '',
      note: initialData?.note ?? '',
    },
  });

  const amount = watch('amount') || 0;
  const paidBy = watch('paidBy');
  const category = watch('category');

  const onSubmit = async (data: FormData) => {
    setError('');
    setSubmitting(true);
    try {
      const uidsToSplit =
        selectedMembers.length > 0 ? selectedMembers : defaultSplitMembers;
      let splitBetween;
      if (splitType === 'equal') {
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
          payerUid: data.paidBy,
          singleDebtorUid: singleDebtor,
        });
      }

      let receiptURL = initialData?.receiptURL ?? '';
      if (receiptFile) {
        const uploadId = initialData?.id ?? `temp_${Date.now()}`;
        receiptURL = await uploadRoomReceipt(roomId, uploadId, receiptFile);
      }

      const expensePayload = {
        title: data.title,
        amount: data.amount,
        category: data.category,
        expenseDate: Timestamp.fromDate(new Date(data.expenseDate)),
        expenseTime: data.expenseTime,
        note: data.note ?? '',
        receiptURL,
        paidBy: data.paidBy,
        splitType,
        splitBetween,
      };

      if (isEditing) {
        await dispatch(
          updateRoomExpenseThunk({
            expenseId: initialData!.id,
            data: expensePayload,
          })
        ).unwrap();
      } else {
        await dispatch(
          addRoomExpenseThunk({
            roomId,
            cycleId,
            ...expensePayload,
            createdBy,
          })
        ).unwrap();
      }

      onSuccess?.();
    } catch (e) {
      setError(
        e instanceof SplitValidationError
          ? e.message
          : (e as Error).message ?? 'Failed to save expense'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label>Title</Label>
        <Input placeholder="Milk, Eggs..." {...register('title')} />
        {errors.title && (
          <p className="text-danger text-sm mt-1">{errors.title.message}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Amount</Label>
          <Input type="number" step="0.01" {...register('amount')} />
          {errors.amount && (
            <p className="text-danger text-sm mt-1">{errors.amount.message}</p>
          )}
        </div>
        <div>
          <Label>Category</Label>
          <Select value={category} onValueChange={(v) => setValue('category', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROOM_EXPENSE_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Date</Label>
          <Input type="date" {...register('expenseDate')} />
        </div>
        <div>
          <Label>Time</Label>
          <Input type="time" {...register('expenseTime')} />
        </div>
      </div>
      <div>
        <Label>Paid by</Label>
        <Select value={paidBy} onValueChange={(v) => setValue('paidBy', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select member" />
          </SelectTrigger>
          <SelectContent>
            {acceptedMembers.map((m) => (
              <SelectItem key={m.id} value={getMemberKey(m)}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.paidBy && (
          <p className="text-danger text-sm mt-1">{errors.paidBy.message}</p>
        )}
      </div>
      <SplitSelector
        members={acceptedMembers as unknown as import('@/types/member').TripMember[]}
        splitType={splitType}
        onSplitTypeChange={setSplitType}
        selectedMembers={selectedMembers}
        onSelectedMembersChange={setSelectedMembers}
        unequalAmounts={unequalAmounts}
        onUnequalChange={(uid, amt) =>
          setUnequalAmounts((prev) => ({ ...prev, [uid]: amt }))
        }
        percents={percents}
        onPercentChange={(uid, percent) =>
          setPercents((prev) => ({ ...prev, [uid]: percent }))
        }
        singleDebtor={singleDebtor}
        onSingleDebtorChange={setSingleDebtor}
        amount={amount}
      />
      <div>
        <Label>Note</Label>
        <Textarea {...register('note')} />
      </div>
      <div>
        <Label>Receipt</Label>
        <Input
          type="file"
          accept="image/*"
          onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
        />
      </div>
      {error && <p className="text-danger text-sm">{error}</p>}
      <Button type="submit" disabled={submitting}>
        {submitting ? 'Saving...' : isEditing ? 'Save changes' : 'Add expense'}
      </Button>
    </form>
  );
}
