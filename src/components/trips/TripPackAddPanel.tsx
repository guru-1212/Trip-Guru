'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { TRIP_PACK_TEMPLATE_PACKS } from '@/lib/tripPackTemplates';
import { TripPackQuickAddChips } from './TripPackQuickAddChips';
import { TripPackItemForm } from './TripPackItemForm';
import { TripMember } from '@/types/member';
import { useAppDispatch } from '@/store';
import { applyTripPackTemplateThunk } from '@/features/tripPackItems/tripPackItemsThunks';
import { Plus, Sparkles } from 'lucide-react';

export function TripPackAddPanel({
  tripId,
  members,
  uid,
  canEdit,
  compact,
}: {
  tripId: string;
  members: TripMember[];
  uid: string;
  canEdit: boolean;
  compact?: boolean;
}) {
  const dispatch = useAppDispatch();
  const [formOpen, setFormOpen] = useState(false);
  const [applyingPack, setApplyingPack] = useState<string | null>(null);
  const [packMessage, setPackMessage] = useState('');

  if (!canEdit) return null;

  const applyPack = async (packKey: string) => {
    setApplyingPack(packKey);
    setPackMessage('');
    try {
      const result = await dispatch(
        applyTripPackTemplateThunk({ tripId, packKey })
      ).unwrap();
      if (result.added === 0) {
        setPackMessage('All items from this pack are already on your list.');
      } else {
        setPackMessage(`Added ${result.added} item(s).`);
      }
    } catch (e) {
      setPackMessage((e as Error).message);
    } finally {
      setApplyingPack(null);
    }
  };

  return (
    <Card className="border-dashed bg-muted/20">
      <CardContent className={compact ? 'p-4 space-y-3' : 'p-5 space-y-4'}>
        {!compact && (
          <div className="flex items-start gap-2">
            <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Add items</p>
              <p className="text-xs text-muted-foreground">
                Start with suggested essentials or add your own.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {TRIP_PACK_TEMPLATE_PACKS.map((pack) => (
            <Button
              key={pack.key}
              type="button"
              variant="outline"
              size="sm"
              disabled={applyingPack !== null}
              onClick={() => applyPack(pack.key)}
            >
              {applyingPack === pack.key ? 'Adding...' : `Add ${pack.label}`}
            </Button>
          ))}
          <Dialog open={formOpen} onOpenChange={setFormOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add custom item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add custom item</DialogTitle>
              </DialogHeader>
              <TripPackItemForm
                tripId={tripId}
                members={members}
                createdBy={uid}
                onSuccess={() => setFormOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase mb-2">
            Quick add
          </p>
          <TripPackQuickAddChips tripId={tripId} />
        </div>

        {packMessage && (
          <p className="text-xs text-muted-foreground">{packMessage}</p>
        )}
      </CardContent>
    </Card>
  );
}
