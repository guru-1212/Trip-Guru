'use client';

import { FormEvent, useState } from 'react';
import { GymPageShell } from '@/components/gym/GymPageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useGym } from '@/hooks/useGym';
import { useAppDispatch } from '@/store';
import { addProgressPhotoThunk } from '@/features/gym/gymThunks';

export default function GymPhotosPage() {
  const { uid, photoLogs } = useGym();
  const dispatch = useAppDispatch();
  const [form, setForm] = useState({ frontUrl: '', sideUrl: '', backUrl: '', notes: '' });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!uid) return;
    dispatch(
      addProgressPhotoThunk({
        uid,
        payload: {
          date: new Date().toISOString().slice(0, 10),
          frontUrl: form.frontUrl || undefined,
          sideUrl: form.sideUrl || undefined,
          backUrl: form.backUrl || undefined,
          notes: form.notes || undefined,
        },
      })
    );
    setForm({ frontUrl: '', sideUrl: '', backUrl: '', notes: '' });
  }

  const latestTwo = photoLogs.slice(0, 2);

  return (
    <GymPageShell title="Progress Photos">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Upload Progress Photo Set</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-3">
              <Input placeholder="Front photo URL" value={form.frontUrl} onChange={(e) => setForm((p) => ({ ...p, frontUrl: e.target.value }))} />
              <Input placeholder="Side photo URL" value={form.sideUrl} onChange={(e) => setForm((p) => ({ ...p, sideUrl: e.target.value }))} />
              <Input placeholder="Back photo URL" value={form.backUrl} onChange={(e) => setForm((p) => ({ ...p, backUrl: e.target.value }))} />
              <Textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
              <Button type="submit" className="w-full">Save Photo Set</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Compare Recent Photos</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {latestTwo.map((log) => (
              <div key={log.id} className="space-y-2">
                <p className="text-sm font-semibold">{log.date}</p>
                <div className="grid grid-cols-3 gap-2">
                  <Photo src={log.frontUrl} label="Front" />
                  <Photo src={log.sideUrl} label="Side" />
                  <Photo src={log.backUrl} label="Back" />
                </div>
              </div>
            ))}
            {latestTwo.length === 0 ? <p className="text-sm text-muted-foreground">No photos yet.</p> : null}
          </CardContent>
        </Card>
      </div>
    </GymPageShell>
  );
}

function Photo({ src, label }: { src?: string; label: string }) {
  return (
    <div className="space-y-1">
      <div className="aspect-square rounded-lg border bg-muted overflow-hidden">
        {src ? <img src={src} alt={label} className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-xs text-muted-foreground">No image</div>}
      </div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase">{label}</p>
    </div>
  );
}
