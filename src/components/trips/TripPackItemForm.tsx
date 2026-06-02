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
import { TripMember } from '@/types/member';
import {
  TRIP_PACK_CATEGORIES,
  TripPackItem,
  TripPackItemType,
} from '@/types/tripPackItem';
import { getMemberKey } from '@/lib/utils';
import { useAppDispatch } from '@/store';
import {
  addTripPackItemThunk,
  updateTripPackItemThunk,
} from '@/features/tripPackItems/tripPackItemsThunks';

const UNASSIGNED = '__unassigned__';

const schema = z.object({
  title: z.string().min(1, 'Item name is required'),
  category: z.string().min(1),
  itemType: z.enum(['buy', 'bring']),
  quantity: z.string().optional(),
  assignedTo: z.string(),
  note: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function TripPackItemForm({
  tripId,
  members,
  createdBy,
  onSuccess,
  initialData,
}: {
  tripId: string;
  members: TripMember[];
  createdBy: string;
  onSuccess?: () => void;
  initialData?: TripPackItem;
}) {
  const dispatch = useAppDispatch();
  const isEditing = !!initialData?.id;
  const acceptedMembers = members.filter((m) => m.inviteStatus === 'accepted');

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
      category: initialData?.category ?? 'Miscellaneous',
      itemType: initialData?.itemType ?? 'bring',
      quantity: initialData?.quantity ?? '',
      assignedTo: initialData?.assignedToMemberKey ?? UNASSIGNED,
      note: initialData?.note ?? '',
    },
  });

  const category = watch('category');
  const assignedTo = watch('assignedTo');
  const itemType = watch('itemType');

  const onSubmit = async (data: FormData) => {
    setError('');
    setSubmitting(true);
    try {
      const assignedToMemberKey =
        data.assignedTo === UNASSIGNED ? null : data.assignedTo;

      const payload = {
        title: data.title.trim(),
        category: data.category,
        itemType: data.itemType as TripPackItemType,
        quantity: data.quantity?.trim() ?? '',
        note: data.note?.trim() ?? '',
        assignedToMemberKey,
      };

      if (isEditing) {
        await dispatch(
          updateTripPackItemThunk({
            itemId: initialData!.id,
            data: payload,
          })
        ).unwrap();
      } else {
        await dispatch(
          addTripPackItemThunk({
            tripId,
            ...payload,
            status: 'todo',
            source: 'custom',
            templateKey: null,
            templateItemSlug: null,
            createdBy,
          })
        ).unwrap();
      }

      onSuccess?.();
    } catch (e) {
      setError((e as Error).message ?? 'Failed to save item');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label>Item name</Label>
        <Input placeholder="Raincoat, power bank, tickets..." {...register('title')} />
        {errors.title && (
          <p className="text-danger text-sm mt-1">{errors.title.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Category</Label>
          <Select value={category} onValueChange={(v) => setValue('category', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRIP_PACK_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Type</Label>
          <Select
            value={itemType}
            onValueChange={(v) => setValue('itemType', v as TripPackItemType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="buy">Need to buy</SelectItem>
              <SelectItem value="bring">Already have — pack it</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Quantity (optional)</Label>
        <Input placeholder="1, 2 packs, large..." {...register('quantity')} />
      </div>

      <div>
        <Label>Who carries it</Label>
        <Select
          value={assignedTo}
          onValueChange={(v) => setValue('assignedTo', v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Anyone / not decided" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED}>Anyone / not decided yet</SelectItem>
            {acceptedMembers.map((m) => (
              <SelectItem key={m.id} value={getMemberKey(m)}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Note (optional)</Label>
        <Textarea placeholder="Brand, where to buy, urgency..." {...register('note')} />
      </div>

      {error && <p className="text-danger text-sm">{error}</p>}
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting
          ? 'Saving...'
          : isEditing
            ? 'Save changes'
            : 'Add to checklist'}
      </Button>
    </form>
  );
}
