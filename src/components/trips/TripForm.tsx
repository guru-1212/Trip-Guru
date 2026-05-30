'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createTrip, updateTrip } from '@/firebase/firestore';
import { sendTripInviteNotification } from '@/services/fcmService';
import { findUserByEmailOrPhone } from '@/firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { TripType, Trip } from '@/types/trip';
import { useAppDispatch } from '@/store';
import { updateTripThunk } from '@/features/trips/tripsThunks';
import dayjs from 'dayjs';
import { Timestamp } from 'firebase/firestore';

const tripSchema = z
  .object({
    tripName: z.string().min(2, 'Trip name required'),
    tripType: z.enum(['friends', 'family', 'office', 'bike_ride', 'trekking', 'custom']),
    destination: z.string().min(2, 'Destination required'),
    startDate: z.string().min(1, 'Start date required'),
    endDate: z.string().min(1, 'End date required'),
    expectedBudget: z.coerce.number().min(0),
    currency: z.string().min(1),
  })
  .refine((d) => new Date(d.endDate) >= new Date(d.startDate), {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

type TripFormData = z.infer<typeof tripSchema>;

interface MemberInput {
  name: string;
  email: string;
  phone: string;
}

interface TripFormProps {
  initialData?: Trip;
  onSuccess?: () => void;
}

export function TripForm({ initialData, onSuccess }: TripFormProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { uid, user } = useAuth();
  const [members, setMembers] = useState<MemberInput[]>([]);
  const [memberDraft, setMemberDraft] = useState<MemberInput>({
    name: '',
    email: '',
    phone: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!initialData;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TripFormData>({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      tripName: initialData?.tripName ?? '',
      tripType: initialData?.tripType ?? 'friends',
      destination: initialData?.destination ?? '',
      startDate: initialData?.startDate 
        ? dayjs(initialData.startDate.toDate()).format('YYYY-MM-DD') 
        : '',
      endDate: initialData?.endDate 
        ? dayjs(initialData.endDate.toDate()).format('YYYY-MM-DD') 
        : '',
      expectedBudget: initialData?.expectedBudget ?? 0,
      currency: initialData?.currency ?? 'INR',
    },
  });

  const tripType = watch('tripType');

  const addMember = () => {
    if (!memberDraft.name.trim()) return;
    setMembers([...members, { ...memberDraft }]);
    setMemberDraft({ name: '', email: '', phone: '' });
  };

  const removeMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: TripFormData) => {
    if (!uid) return;
    setSubmitting(true);
    setError('');
    try {
      if (isEditing) {
        await dispatch(updateTripThunk({
          tripId: initialData!.tripId,
          data: {
            tripName: data.tripName,
            tripType: data.tripType as TripType,
            destination: data.destination,
            startDate: Timestamp.fromDate(new Date(data.startDate)),
            endDate: Timestamp.fromDate(new Date(data.endDate)),
            expectedBudget: data.expectedBudget,
            currency: data.currency,
          }
        })).unwrap();
        onSuccess?.();
      } else {
        const tripId = await createTrip({
          tripName: data.tripName,
          tripType: data.tripType as TripType,
          destination: data.destination,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          expectedBudget: data.expectedBudget,
          currency: data.currency,
          createdBy: uid,
          ownerName: user?.name ?? 'Owner',
          ownerEmail: user?.email ?? '',
          ownerPhone: user?.phone ?? '',
          members: members.map((m) => ({
            ...m,
            name: m.name,
            email: m.email.toLowerCase(),
          })),
        });

        for (const m of members) {
          const matchedId = await findUserByEmailOrPhone(m.email, m.phone);
          if (matchedId) {
            await sendTripInviteNotification(matchedId, tripId, data.tripName);
          }
        }

        router.push(`/trips/${tripId}`);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={`space-y-6 ${isEditing ? '' : 'max-w-2xl'}`}>
      <Card className={isEditing ? 'border-0 shadow-none p-0' : ''}>
        {!isEditing && (
          <CardHeader>
            <CardTitle>Trip details</CardTitle>
          </CardHeader>
        )}
        <CardContent className={`space-y-4 ${isEditing ? 'p-0' : ''}`}>
          <div>
            <Label htmlFor="tripName">Trip name</Label>
            <Input id="tripName" {...register('tripName')} />
            {errors.tripName && (
              <p className="text-danger text-sm mt-1">{errors.tripName.message}</p>
            )}
          </div>
          <div>
            <Label>Trip type</Label>
            <Select
              value={tripType}
              onValueChange={(v) => setValue('tripType', v as TripFormData['tripType'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['friends', 'family', 'office', 'bike_ride', 'trekking', 'custom'].map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="destination">Destination</Label>
            <Input id="destination" {...register('destination')} />
            {errors.destination && (
              <p className="text-danger text-sm mt-1">{errors.destination.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start date</Label>
              <Input id="startDate" type="date" {...register('startDate')} />
            </div>
            <div>
              <Label htmlFor="endDate">End date</Label>
              <Input id="endDate" type="date" {...register('endDate')} />
              {errors.endDate && (
                <p className="text-danger text-sm mt-1">{errors.endDate.message}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="expectedBudget">Expected budget</Label>
              <Input id="expectedBudget" type="number" {...register('expectedBudget')} />
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" {...register('currency')} />
            </div>
          </div>
        </CardContent>
      </Card>

      {!isEditing && (
        <Card>
          <CardHeader>
            <CardTitle>Add members</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                placeholder="Name"
                value={memberDraft.name}
                onChange={(e) => setMemberDraft({ ...memberDraft, name: e.target.value })}
              />
              <Input
                placeholder="Email"
                type="email"
                value={memberDraft.email}
                onChange={(e) => setMemberDraft({ ...memberDraft, email: e.target.value })}
              />
              <Input
                placeholder="Phone"
                value={memberDraft.phone}
                onChange={(e) => setMemberDraft({ ...memberDraft, phone: e.target.value })}
              />
            </div>
            <Button type="button" variant="outline" onClick={addMember}>
              <Plus className="h-4 w-4 mr-2" /> Add member
            </Button>
            {members.length > 0 && (
              <ul className="space-y-2">
                {members.map((m, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded-md border p-2 text-sm"
                  >
                    <span>
                      {m.name} — {m.email || m.phone || 'No contact'}
                    </span>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeMember(i)}>
                      <Trash2 className="h-4 w-4 text-danger" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {error && <p className="text-danger text-sm">{error}</p>}
      <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
        {submitting ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Create trip')}
      </Button>
    </form>
  );
}
