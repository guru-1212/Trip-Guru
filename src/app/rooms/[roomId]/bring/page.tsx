'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { RoomPageShell } from '@/components/rooms/RoomPageShell';
import { RoomBringItemForm } from '@/components/rooms/RoomBringItemForm';
import { useAppSelector, useAppDispatch } from '@/store';
import { useAuth } from '@/hooks/useAuth';
import { getMemberKey, getMyMemberKey } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  deleteRoomBringItemThunk,
  toggleRoomBringItemStatusThunk,
} from '@/features/roomBringItems/roomBringItemsThunks';
import { RoomBringItem } from '@/types/roomBringItem';
import { EmptyState } from '@/components/common/EmptyState';
import {
  Check,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type FilterTab = 'all' | 'planned' | 'brought' | 'mine';

export default function RoomBringPage() {
  const params = useParams();
  const roomId = params.roomId as string;

  return (
    <RoomPageShell roomId={roomId}>
      <BringContent roomId={roomId} />
    </RoomPageShell>
  );
}

function BringContent({ roomId }: { roomId: string }) {
  const { uid } = useAuth();
  const dispatch = useAppDispatch();
  const members = useAppSelector((s) => s.rooms.members);
  const cycle = useAppSelector((s) => s.rooms.activeCycle);
  const items = useAppSelector((s) => s.roomBringItems.items);
  const room = useAppSelector((s) => s.rooms.currentRoom);
  const currency = room?.currency ?? 'INR';
  const myMemberKey = getMyMemberKey(uid, members);

  const canEdit = members.some(
    (m) =>
      m.userId === uid &&
      m.inviteStatus === 'accepted' &&
      (m.role === 'owner' || m.role === 'editor')
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RoomBringItem | null>(null);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [itemToDelete, setItemToDelete] = useState<RoomBringItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const getName = (key: string | null) => {
    if (!key) return 'Anyone';
    return members.find((m) => getMemberKey(m) === key)?.name ?? 'Unknown';
  };

  const stats = useMemo(() => {
    const planned = items.filter((i) => i.status === 'planned');
    const brought = items.filter((i) => i.status === 'brought');
    const plannedTotal = planned.reduce((s, i) => s + i.estimatedAmount, 0);
    const myAssigned = planned.filter(
      (i) => i.assignedToMemberKey === myMemberKey
    );
    return {
      plannedCount: planned.length,
      broughtCount: brought.length,
      plannedTotal,
      myAssignedCount: myAssigned.length,
    };
  }, [items, myMemberKey]);

  const filtered = useMemo(() => {
    switch (filter) {
      case 'planned':
        return items.filter((i) => i.status === 'planned');
      case 'brought':
        return items.filter((i) => i.status === 'brought');
      case 'mine':
        return items.filter((i) => i.assignedToMemberKey === myMemberKey);
      default:
        return items;
    }
  }, [items, filter, myMemberKey]);

  const handleToggle = async (itemId: string) => {
    setBusyId(itemId);
    try {
      await dispatch(toggleRoomBringItemStatusThunk(itemId)).unwrap();
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      await dispatch(deleteRoomBringItemThunk(itemToDelete.id)).unwrap();
      setItemToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const filterTabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'planned', label: 'To bring' },
    { id: 'brought', label: 'Brought' },
    { id: 'mine', label: 'My list' },
  ];

  if (!cycle) {
    return (
      <p className="text-muted-foreground text-center py-12">
        No active billing cycle. Open this room from the dashboard to load the
        current month.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h2 className="text-lg font-semibold">Things to bring</h2>
          <p className="text-sm text-muted-foreground max-w-xl">
            Plan what the room still needs — groceries, furniture, supplies — with
            estimated cost and who will bring it.
          </p>
        </div>
        {cycle && uid && canEdit && (
          <Dialog
            open={formOpen}
            onOpenChange={(open) => {
              setFormOpen(open);
              if (!open) setEditingItem(null);
            }}
          >
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingItem(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" /> Add item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? 'Edit item' : 'Add to bring list'}
                </DialogTitle>
              </DialogHeader>
              <RoomBringItemForm
                roomId={roomId}
                cycleId={cycle.id}
                members={members}
                createdBy={uid}
                initialData={editingItem ?? undefined}
                onSuccess={() => {
                  setFormOpen(false);
                  setEditingItem(null);
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-bold text-muted-foreground uppercase">
              Still to bring
            </p>
            <p className="text-2xl font-black">{stats.plannedCount}</p>
            <p className="text-xs text-muted-foreground mt-1">
              ~{currency} {stats.plannedTotal.toLocaleString()} estimated
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-bold text-muted-foreground uppercase">
              Brought
            </p>
            <p className="text-2xl font-black text-emerald-600">
              {stats.broughtCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-bold text-muted-foreground uppercase">
              Assigned to you
            </p>
            <p className="text-2xl font-black">{stats.myAssignedCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {filterTabs.map((tab) => (
          <Button
            key={tab.id}
            variant={filter === tab.id ? 'default' : 'outline'}
            size="sm"
            className="rounded-full"
            onClick={() => setFilter(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nothing on the list yet"
          description="Add items your room still needs — who brings what and how much it may cost."
        />
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          No items in this view.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <Card
              key={item.id}
              className={cn(
                item.status === 'brought' && 'opacity-75 bg-muted/20'
              )}
            >
              <CardContent className="p-4 flex justify-between items-start gap-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={cn(
                        'font-bold',
                        item.status === 'brought' && 'line-through text-muted-foreground'
                      )}
                    >
                      {item.title}
                    </p>
                    <Badge variant="outline">{item.category}</Badge>
                    <Badge
                      variant={
                        item.status === 'brought' ? 'default' : 'secondary'
                      }
                    >
                      {item.status === 'brought' ? 'Brought' : 'To bring'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {currency} {item.estimatedAmount.toLocaleString()}
                    {item.quantity ? ` · ${item.quantity}` : ''}
                    {' · '}
                    Bring: {getName(item.assignedToMemberKey)}
                  </p>
                  {item.note && (
                    <p className="text-xs text-muted-foreground">{item.note}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {canEdit && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Edit"
                        onClick={() => {
                          setEditingItem(item);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-danger"
                        title="Remove"
                        onClick={() => setItemToDelete(item)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  {canEdit && (
                    <Button
                      size="sm"
                      variant={
                        item.status === 'brought' ? 'outline' : 'default'
                      }
                      disabled={busyId === item.id}
                      onClick={() => handleToggle(item.id)}
                    >
                      {item.status === 'brought' ? (
                        <>
                          <RotateCcw className="h-3 w-3 mr-1" /> Undo
                        </>
                      ) : (
                        <>
                          <Check className="h-3 w-3 mr-1" /> Mark brought
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={!!itemToDelete}
        onOpenChange={(open) => !open && setItemToDelete(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove from list?</DialogTitle>
            <DialogDescription>
              {itemToDelete
                ? `"${itemToDelete.title}" will be removed from the bring list.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setItemToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Removing...' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
