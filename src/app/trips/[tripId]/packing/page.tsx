'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { TripPageShell } from '@/components/trips/TripPageShell';
import { TripPackAddPanel } from '@/components/trips/TripPackAddPanel';
import { TripPackItemForm } from '@/components/trips/TripPackItemForm';
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
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  advanceTripPackItemStatusThunk,
  deleteTripPackItemThunk,
  revertTripPackItemStatusThunk,
} from '@/features/tripPackItems/tripPackItemsThunks';
import { TripPackItem } from '@/types/tripPackItem';
import { EmptyState } from '@/components/common/EmptyState';
import {
  computeMemberPackProgress,
  computeTripPackProgress,
  statusLabel,
} from '@/lib/tripPackProgress';
import {
  Check,
  ClipboardList,
  Pencil,
  RotateCcw,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type FilterTab =
  | 'all'
  | 'buy'
  | 'bring'
  | 'not_packed'
  | 'packed'
  | 'mine';

export default function TripPackingPage() {
  const params = useParams();
  const tripId = params.tripId as string;

  return (
    <TripPageShell tripId={tripId}>
      <PackingContent tripId={tripId} />
    </TripPageShell>
  );
}

function PackingContent({ tripId }: { tripId: string }) {
  const { uid } = useAuth();
  const dispatch = useAppDispatch();
  const members = useAppSelector((s) => s.trips.members);
  const items = useAppSelector((s) => s.tripPackItems.items);
  const myMemberKey = getMyMemberKey(uid, members);

  const canEdit = members.some(
    (m) =>
      m.userId === uid &&
      m.inviteStatus === 'accepted' &&
      (m.role === 'owner' || m.role === 'editor')
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TripPackItem | null>(null);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [memberFilter, setMemberFilter] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<TripPackItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const stats = useMemo(() => computeTripPackProgress(items), [items]);

  const acceptedMembers = useMemo(
    () => members.filter((m) => m.inviteStatus === 'accepted'),
    [members]
  );

  const getName = (key: string | null) => {
    if (!key) return 'Anyone';
    return members.find((m) => getMemberKey(m) === key)?.name ?? 'Unknown';
  };

  const filtered = useMemo(() => {
    let list = items;
    switch (filter) {
      case 'buy':
        list = list.filter((i) => i.itemType === 'buy');
        break;
      case 'bring':
        list = list.filter((i) => i.itemType === 'bring');
        break;
      case 'not_packed':
        list = list.filter((i) => i.status !== 'packed');
        break;
      case 'packed':
        list = list.filter((i) => i.status === 'packed');
        break;
      case 'mine':
        list = list.filter((i) => i.assignedToMemberKey === myMemberKey);
        break;
      default:
        break;
    }
    if (memberFilter) {
      list = list.filter((i) => i.assignedToMemberKey === memberFilter);
    }
    return list;
  }, [items, filter, myMemberKey, memberFilter]);

  const canManageItem = (item: TripPackItem) => !!uid && item.createdBy === uid;

  const canToggleStatus = (item: TripPackItem) => {
    if (!uid) return false;
    if (canEdit) return true;
    if (item.createdBy === uid) return true;
    const assignee = members.find((m) => m.id === item.assignedToMemberKey);
    return assignee?.userId === uid;
  };

  const handleAdvance = async (itemId: string) => {
    setBusyId(itemId);
    try {
      await dispatch(advanceTripPackItemStatusThunk(itemId)).unwrap();
    } finally {
      setBusyId(null);
    }
  };

  const handleRevert = async (itemId: string) => {
    setBusyId(itemId);
    try {
      await dispatch(revertTripPackItemStatusThunk(itemId)).unwrap();
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      await dispatch(deleteTripPackItemThunk(itemToDelete.id)).unwrap();
      setItemToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const advanceLabel = (item: TripPackItem) => {
    if (item.status === 'packed') return null;
    if (item.itemType === 'bring') return 'Mark packed';
    if (item.status === 'todo') return 'Mark bought';
    return 'Mark packed';
  };

  const filterTabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'buy', label: 'To buy' },
    { id: 'bring', label: 'To bring' },
    { id: 'not_packed', label: 'Not packed' },
    { id: 'packed', label: 'Packed' },
    { id: 'mine', label: 'My list' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Packing checklist
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl">
            Track what to buy, what to pack, and who carries each item. Complete
            everything before you leave.
          </p>
        </div>
        {uid && canEdit && items.length > 0 && (
          <Dialog
            open={formOpen}
            onOpenChange={(open) => {
              setFormOpen(open);
              if (!open) setEditingItem(null);
            }}
          >
            <Button
              onClick={() => {
                setEditingItem(null);
                setFormOpen(true);
              }}
            >
              Add custom item
            </Button>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? 'Edit item' : 'Add custom item'}
                </DialogTitle>
              </DialogHeader>
              <TripPackItemForm
                tripId={tripId}
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase">
              Overall ready
            </p>
            <p className="text-2xl font-black">{stats.overallPercent}%</p>
            <Progress value={stats.overallPercent} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {stats.packed} / {stats.total} packed
              {stats.remaining > 0 ? ` · ${stats.remaining} left` : ''}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1">
              <ShoppingBag className="h-3 w-3" /> To buy
            </p>
            <p className="text-2xl font-black">{stats.buyPercent}%</p>
            <Progress value={stats.buyPercent} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {stats.buyPacked} / {stats.buyTotal} packed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase">
              To bring
            </p>
            <p className="text-2xl font-black">{stats.bringPercent}%</p>
            <Progress value={stats.bringPercent} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {stats.bringPacked} / {stats.bringTotal} packed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase">
              Your assignments
            </p>
            {myMemberKey ? (
              <>
                <p className="text-2xl font-black">
                  {
                    computeMemberPackProgress(items, myMemberKey).percent
                  }
                  %
                </p>
                <p className="text-xs text-muted-foreground">
                  {
                    computeMemberPackProgress(items, myMemberKey).packed
                  }{' '}
                  /{' '}
                  {
                    computeMemberPackProgress(items, myMemberKey).assigned
                  }{' '}
                  done
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Join as member</p>
            )}
          </CardContent>
        </Card>
      </div>

      {acceptedMembers.length > 0 && items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={memberFilter === null ? 'default' : 'outline'}
            size="sm"
            className="rounded-full"
            onClick={() => setMemberFilter(null)}
          >
            Everyone
          </Button>
          {acceptedMembers.map((m) => {
            const key = getMemberKey(m);
            const mp = computeMemberPackProgress(items, key);
            return (
              <Button
                key={key}
                variant={memberFilter === key ? 'default' : 'outline'}
                size="sm"
                className="rounded-full"
                onClick={() =>
                  setMemberFilter(memberFilter === key ? null : key)
                }
              >
                {m.name.split(' ')[0]} ({mp.packed}/{mp.assigned})
              </Button>
            );
          })}
        </div>
      )}

      {uid && (
        <TripPackAddPanel
          tripId={tripId}
          members={members}
          uid={uid}
          canEdit={canEdit}
          compact={items.length > 0}
        />
      )}

      {items.length > 0 && (
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
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nothing on the checklist yet"
          description="Add common essentials, rainy-season gear, or your own custom items."
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
              className={cn(item.status === 'packed' && 'opacity-75 bg-muted/20')}
            >
              <CardContent className="p-4 flex justify-between items-start gap-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={cn(
                        'font-bold',
                        item.status === 'packed' &&
                          'line-through text-muted-foreground'
                      )}
                    >
                      {item.title}
                    </p>
                    <Badge variant="outline">{item.category}</Badge>
                    <Badge variant="secondary">
                      {item.itemType === 'buy' ? 'Buy' : 'Bring'}
                    </Badge>
                    {item.source === 'template' && (
                      <Badge variant="outline" className="text-xs">
                        Suggested
                      </Badge>
                    )}
                    <Badge
                      variant={item.status === 'packed' ? 'default' : 'secondary'}
                    >
                      {statusLabel(item)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {item.quantity ? `${item.quantity} · ` : ''}
                    Carries: {getName(item.assignedToMemberKey)}
                  </p>
                  {item.note && (
                    <p className="text-xs text-muted-foreground">{item.note}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {canManageItem(item) && item.source === 'custom' && (
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
                  {canManageItem(item) && item.source === 'template' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-danger"
                      title="Remove"
                      onClick={() => setItemToDelete(item)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  {canToggleStatus(item) && (
                    <div className="flex flex-col gap-1">
                      {item.status !== 'packed' && advanceLabel(item) && (
                        <Button
                          size="sm"
                          disabled={busyId === item.id}
                          onClick={() => handleAdvance(item.id)}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          {advanceLabel(item)}
                        </Button>
                      )}
                      {item.status !== 'todo' && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === item.id}
                          onClick={() => handleRevert(item.id)}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" /> Undo
                        </Button>
                      )}
                    </div>
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
            <DialogTitle>Remove from checklist?</DialogTitle>
            <DialogDescription>
              {itemToDelete
                ? `"${itemToDelete.title}" will be removed from the packing list.`
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
