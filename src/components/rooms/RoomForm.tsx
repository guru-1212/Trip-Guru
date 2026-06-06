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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createRoomThunk } from '@/features/rooms/roomsThunks';
import { findUserByEmailOrPhone } from '@/firebase/firestore';
import { sendRoomInviteNotification } from '@/services/fcmService';
import { useAuth } from '@/hooks/useAuth';
import { useAppDispatch } from '@/store';

const schema = z.object({
  name: z.string().min(2, 'Room name required'),
  currency: z.string().min(1),
});

type FormData = z.infer<typeof schema>;

interface MemberInput {
  name: string;
  email: string;
  phone: string;
}

export function RoomForm() {
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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', currency: 'INR' },
  });

  const addMember = () => {
    if (!memberDraft.name || !memberDraft.email) return;
    setMembers([...members, { ...memberDraft }]);
    setMemberDraft({ name: '', email: '', phone: '' });
  };

  const onSubmit = async (data: FormData) => {
    if (!uid || !user) return;
    setSubmitting(true);
    setError('');
    try {
      const room = await dispatch(
        createRoomThunk({
          name: data.name,
          currency: data.currency,
          createdBy: uid,
          ownerName: user.name,
          ownerEmail: user.email,
          ownerPhone: user.phone,
          members,
        })
      ).unwrap();

      for (const m of members) {
        const matchedId = await findUserByEmailOrPhone(m.email, m.phone);
        if (matchedId) {
          await sendRoomInviteNotification(matchedId, room.roomId, data.name);
        }
      }

      router.push(`/rooms/${room.roomId}`);
    } catch (e) {
      setError((e as Error).message ?? 'Failed to create room');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-lg">
      <div>
        <Label htmlFor="name">Room / PG name</Label>
        <Input id="name" placeholder="Sunshine PG" {...register('name')} />
        {errors.name && (
          <p className="text-danger text-sm mt-1">{errors.name.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="currency">Currency</Label>
        <Input id="currency" {...register('currency')} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Roommates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <Input
              placeholder="Name"
              value={memberDraft.name}
              onChange={(e) =>
                setMemberDraft({ ...memberDraft, name: e.target.value })
              }
            />
            <Input
              placeholder="Email"
              value={memberDraft.email}
              onChange={(e) =>
                setMemberDraft({ ...memberDraft, email: e.target.value })
              }
            />
            <Input
              placeholder="Phone"
              value={memberDraft.phone}
              onChange={(e) =>
                setMemberDraft({ ...memberDraft, phone: e.target.value })
              }
            />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addMember}>
            <Plus className="h-4 w-4 mr-1" /> Add roommate
          </Button>
          {members.map((m, i) => (
            <div
              key={i}
              className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/50"
            >
              <span>
                {m.name} — {m.email}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setMembers(members.filter((_, j) => j !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {error && <p className="text-danger text-sm">{error}</p>}
      <Button type="submit" disabled={submitting}>
        {submitting ? 'Creating...' : 'Create room'}
      </Button>
    </form>
  );
}
