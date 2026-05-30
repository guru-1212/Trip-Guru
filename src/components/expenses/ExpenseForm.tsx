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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SplitSelector } from './SplitSelector';
import { TripMember } from '@/types/member';
import { DEFAULT_EXPENSE_CATEGORIES, ExpenseCategory, SplitType, Expense } from '@/types/expense';
import { calculateSplit, SplitValidationError } from '@/lib/splitCalculator';
import { getMemberKey } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/store';
import { addExpenseThunk, updateExpenseThunk } from '@/features/expenses/expensesThunks';
import { uploadReceipt } from '@/firebase/storage';
import { CategoryManagementDialog } from './CategoryManagementDialog';

const schema = z.object({
  amount: z.coerce.number().positive('Amount must be positive'),
  category: z.string().min(1, 'Category is required'),
  expenseType: z.enum(['planned', 'actual']),
  paidBy: z.string().optional(),
  note: z.string().optional(),
}).refine((data) => {
  if (data.expenseType === 'actual' && !data.paidBy) {
    return false;
  }
  return true;
}, {
  message: 'Select who paid',
  path: ['paidBy'],
});

type FormData = z.infer<typeof schema>;

interface ExpenseFormProps {
  tripId: string;
  members: TripMember[];
  createdBy: string;
  onSuccess?: () => void;
  initialData?: Partial<Expense>;
}

export function ExpenseForm({ tripId, members, createdBy, onSuccess, initialData }: ExpenseFormProps) {
  const dispatch = useAppDispatch();
  const { currentTrip } = useAppSelector((state) => state.trips);
  
  const customCategories = currentTrip?.customExpenseCategories || [];
  const allCategories = [...DEFAULT_EXPENSE_CATEGORIES, ...customCategories];

  const isEditing = !!initialData?.id;

  const [splitType, setSplitType] = useState<SplitType>(initialData?.splitType ?? 'equal');
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    initialData?.splitBetween?.map(s => s.uid) ?? members.map(getMemberKey)
  );
  const [unequalAmounts, setUnequalAmounts] = useState<Record<string, number>>(
    initialData?.splitType === 'unequal' 
      ? Object.fromEntries(initialData.splitBetween?.map(s => [s.uid, s.amount]) ?? [])
      : {}
  );
  const [percents, setPercents] = useState<Record<string, number>>(
    initialData?.splitType === 'percent'
      ? Object.fromEntries(initialData.splitBetween?.map(s => [s.uid, (s.amount / (initialData.amount || 1)) * 100]) ?? [])
      : {}
  );
  const [singleDebtor, setSingleDebtor] = useState(
    initialData?.splitType === 'single' ? initialData.splitBetween?.[0]?.uid ?? '' : ''
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
      category: (initialData?.category as any) ?? 'Food',
      amount: initialData?.amount ?? undefined,
      expenseType: initialData?.expenseType ?? 'actual',
      paidBy: initialData?.paidBy ?? '',
      note: initialData?.note ?? '',
    },
  });

  const amount = watch('amount') || 0;
  const paidBy = watch('paidBy');
  const category = watch('category');
  const expenseType = watch('expenseType');

  const onSubmit = async (data: FormData) => {
    setError('');
    setSubmitting(true);
    try {
      let splitBetween;
      if (data.expenseType === 'actual') {
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
            payerUid: data.paidBy!,
            singleDebtorUid: singleDebtor,
          });
        }
      }

      let receiptURL = initialData?.receiptURL || '';
      if (receiptFile) {
        const tempId = isEditing ? initialData!.id! : `temp_${Date.now()}`;
        receiptURL = await uploadReceipt(tripId, tempId, receiptFile);
      }

      if (isEditing) {
        await dispatch(
          updateExpenseThunk({
            expenseId: initialData!.id!,
            data: {
              amount: data.amount,
              category: data.category as any,
              expenseType: data.expenseType,
              paidBy: data.paidBy ?? '',
              splitType: data.expenseType === 'actual' ? splitType : 'equal',
              splitBetween: data.expenseType === 'actual' ? splitBetween : [],
              receiptURL,
              note: data.note ?? '',
            },
          })
        ).unwrap();
      } else {
        await dispatch(
          addExpenseThunk({
            tripId,
            amount: data.amount,
            category: data.category as any,
            expenseType: data.expenseType,
            paidBy: data.paidBy ?? '',
            splitType: data.expenseType === 'actual' ? splitType : 'equal',
            splitBetween: data.expenseType === 'actual' ? splitBetween : [],
            receiptURL,
            note: data.note ?? '',
            createdBy,
          })
        ).unwrap();
      }

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
      <Tabs 
        value={expenseType} 
        onValueChange={(v) => setValue('expenseType', v as 'planned' | 'actual')}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="actual">Actual (Real)</TabsTrigger>
          <TabsTrigger value="planned">Planned (Assumption)</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="amount">Amount</Label>
          <Input id="amount" type="number" step="0.01" {...register('amount')} />
          {errors.amount && (
            <p className="text-danger text-sm">{errors.amount.message}</p>
          )}
        </div>
        <div>
          <div className="flex justify-between items-center mb-1">
            <Label>Category</Label>
            <CategoryManagementDialog 
              tripId={tripId} 
              customCategories={customCategories} 
            />
          </div>
          <Select
            value={category}
            onValueChange={(v) => setValue('category', v as ExpenseCategory)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allCategories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && (
            <p className="text-danger text-sm">{errors.category.message}</p>
          )}
        </div>
      </div>

      {expenseType === 'actual' && (
        <>
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
        </>
      )}

      <div>
        <Label htmlFor="note">Note</Label>
        <Textarea id="note" {...register('note')} />
      </div>

      {error && <p className="text-danger text-sm">{error}</p>}
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? 'Saving...' : (isEditing ? 'Update' : (expenseType === 'planned' ? 'Add assumption' : 'Add expense'))}
      </Button>
    </form>
  );
}
