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
import { RoomMember } from '@/types/roomMember';
import {
  ROOM_BRING_CATEGORIES,
  RoomBringItem,
  RoomBringStatus,
} from '@/types/roomBringItem';
import { getMemberKey } from '@/lib/utils';
import { useAppDispatch } from '@/store';
import {
  addRoomBringItemThunk,
  updateRoomBringItemThunk,
} from '@/features/roomBringItems/roomBringItemsThunks';

const UNASSIGNED = '__unassigned__';

const schema = z.object({
  title: z.string().min(1, 'Item name is required'),
  category: z.string().min(1),
  estimatedAmount: z.coerce.number().min(0, 'Amount cannot be negative'),
  quantity: z.string().optional(),
  assignedTo: z.string(),
  note: z.string().optional(),
  status: z.enum(['planned', 'brought']),
});

type FormData = z.infer<typeof schema>;

export function RoomBringItemForm({
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
  initialData?: RoomBringItem;
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
      category: initialData?.category ?? 'Groceries',
      estimatedAmount: initialData?.estimatedAmount ?? 0,
      quantity: initialData?.quantity ?? '',
      assignedTo: initialData?.assignedToMemberKey ?? UNASSIGNED,
      note: initialData?.note ?? '',
      status: initialData?.status ?? 'planned',
    },
  });

  const category = watch('category');
  const assignedTo = watch('assignedTo');
  const status = watch('status');

  const onSubmit = async (data: FormData) => {
    setError('');
    setSubmitting(true);
    try {
      const assignedToMemberKey =
        data.assignedTo === UNASSIGNED ? null : data.assignedTo;

      const payload = {
        title: data.title.trim(),
        category: data.category,
        estimatedAmount: data.estimatedAmount,
        quantity: data.quantity?.trim() ?? '',
        note: data.note?.trim() ?? '',
        assignedToMemberKey,
        status: data.status as RoomBringStatus,
      };

      if (isEditing) {
        await dispatch(
          updateRoomBringItemThunk({
            itemId: initialData!.id,
            data: payload,
          })
        ).unwrap();
      } else {
        await dispatch(
          addRoomBringItemThunk({
            roomId,
            cycleId,
            ...payload,
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
        <Label>What to bring</Label>
        <Input placeholder="Rice, detergent, bucket..." {...register('title')} />
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
              {ROOM_BRING_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Estimated cost</Label>
          <Input type="number" step="0.01" min={0} {...register('estimatedAmount')} />
          {errors.estimatedAmount && (
            <p className="text-danger text-sm mt-1">
              {errors.estimatedAmount.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <Label>Quantity / size (optional)</Label>
        <Input placeholder="2 kg, 1 pack, large..." {...register('quantity')} />
      </div>

      <div>
        <Label>Who will bring it</Label>
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

      {isEditing && (
        <div>
          <Label>Status</Label>
          <Select
            value={status}
            onValueChange={(v) => setValue('status', v as RoomBringStatus)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="planned">Still to bring</SelectItem>
              <SelectItem value="brought">Already brought</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label>Note (optional)</Label>
        <Textarea placeholder="Brand, shop, urgency..." {...register('note')} />
      </div>

      {error && <p className="text-danger text-sm">{error}</p>}
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting
          ? 'Saving...'
          : isEditing
            ? 'Save changes'
            : 'Add to list'}
      </Button>
    </form>
  );
}
