import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  createTripPackItem,
  createTripPackItemsBatch,
  deleteTripPackItem,
  getTripPackItems,
  updateTripPackItem,
} from '@/firebase/firestore';
import {
  addTripPackItem,
  removeTripPackItem,
  setTripPackItems,
  setTripPackItemsLoading,
  updateTripPackItem as updateTripPackItemAction,
} from './tripPackItemsSlice';
import { TripPackItem, TripPackStatus } from '@/types/tripPackItem';
import {
  getTripPackTemplatePack,
  type TripPackTemplateItem,
} from '@/lib/tripPackTemplates';
import { recordTripAuditLog } from '@/services/tripAuditLogService';
import type { RootState } from '@/store';

function getAuditActor(state: RootState) {
  return {
    uid: state.auth.firebaseUid ?? '',
    name: state.auth.user?.name ?? 'Someone',
  };
}

function canEditPackItem(item: TripPackItem, uid: string): boolean {
  return item.createdBy === uid;
}

function canUpdatePackStatus(
  item: TripPackItem,
  uid: string,
  members: RootState['trips']['members'],
  isEditor: boolean
): boolean {
  if (isEditor || item.createdBy === uid) return true;
  const assignee = members.find((m) => m.id === item.assignedToMemberKey);
  return assignee?.userId === uid;
}

function isTripEditorForTrip(
  tripId: string,
  uid: string,
  state: RootState
): boolean {
  return state.trips.members.some(
    (m) =>
      m.tripId === tripId &&
      m.userId === uid &&
      m.inviteStatus === 'accepted' &&
      (m.role === 'owner' || m.role === 'editor')
  );
}

export const fetchTripPackItems = createAsyncThunk(
  'tripPackItems/fetch',
  async (tripId: string, { dispatch }) => {
    dispatch(setTripPackItemsLoading(true));
    const items = await getTripPackItems(tripId);
    dispatch(setTripPackItems(items));
    dispatch(setTripPackItemsLoading(false));
    return items;
  }
);

export const addTripPackItemThunk = createAsyncThunk(
  'tripPackItems/add',
  async (
    item: Omit<TripPackItem, 'id' | 'createdAt' | 'packedAt'>,
    { dispatch, getState }
  ) => {
    const state = getState() as RootState;
    const uid = state.auth.firebaseUid;
    if (!uid || !isTripEditorForTrip(item.tripId, uid, state)) {
      throw new Error('Only trip editors can add packing items.');
    }
    const id = await createTripPackItem(item);
    dispatch(
      addTripPackItem({
        ...item,
        id,
        packedAt: null,
        createdAt: { toDate: () => new Date() } as TripPackItem['createdAt'],
      })
    );

    const actor = getAuditActor(state);
    await recordTripAuditLog({
      tripId: item.tripId,
      action: 'pack_item.created',
      entityType: 'pack_item',
      entityId: id,
      actorUid: actor.uid,
      actorName: actor.name,
      summary: `${actor.name} added "${item.title}" to the packing list`,
      metadata: { title: item.title },
    });

    return id;
  }
);

export const updateTripPackItemThunk = createAsyncThunk(
  'tripPackItems/update',
  async (
    {
      itemId,
      data,
    }: {
      itemId: string;
      data: Partial<
        Pick<
          TripPackItem,
          | 'title'
          | 'category'
          | 'itemType'
          | 'quantity'
          | 'note'
          | 'assignedToMemberKey'
          | 'status'
        >
      >;
    },
    { dispatch, getState }
  ) => {
    const state = getState() as RootState;
    const uid = state.auth.firebaseUid;
    const item = state.tripPackItems.items.find((i) => i.id === itemId);
    if (!item || !uid) {
      throw new Error('Item not found.');
    }

    const isEditor = isTripEditorForTrip(item.tripId, uid, state);
    const statusOnly =
      data.status !== undefined &&
      Object.keys(data).length === 1;

    if (statusOnly) {
      if (!canUpdatePackStatus(item, uid, state.trips.members, isEditor)) {
        throw new Error('You cannot update this item status.');
      }
    } else {
      if (item.source === 'template') {
        throw new Error('Suggested items cannot be edited. Remove and add a custom item instead.');
      }
      if (!canEditPackItem(item, uid)) {
        throw new Error('Only the person who added this item can edit it.');
      }
    }

    await updateTripPackItem(itemId, data);
    dispatch(updateTripPackItemAction({ id: itemId, ...data }));

    const actor = getAuditActor(state);
    const title = (data.title ?? item.title) as string;

    if (statusOnly && data.status === 'packed') {
      await recordTripAuditLog({
        tripId: item.tripId,
        action: 'pack_item.packed',
        entityType: 'pack_item',
        entityId: itemId,
        actorUid: actor.uid,
        actorName: actor.name,
        summary: `${actor.name} marked "${title}" as packed`,
        metadata: { title },
      });
    } else {
      await recordTripAuditLog({
        tripId: item.tripId,
        action: 'pack_item.updated',
        entityType: 'pack_item',
        entityId: itemId,
        actorUid: actor.uid,
        actorName: actor.name,
        summary: statusOnly
          ? `${actor.name} updated status for "${title}"`
          : `${actor.name} updated "${title}" on the packing list`,
        metadata: { title },
      });
    }
  }
);

export const advanceTripPackItemStatusThunk = createAsyncThunk(
  'tripPackItems/advanceStatus',
  async (itemId: string, { dispatch, getState }) => {
    const state = getState() as RootState;
    const item = state.tripPackItems.items.find((i) => i.id === itemId);
    if (!item) return;
    let next: TripPackStatus;
    if (item.status === 'packed') return;
    if (item.itemType === 'bring') {
      next = 'packed';
    } else if (item.status === 'todo') {
      next = 'ready';
    } else {
      next = 'packed';
    }
    await dispatch(
      updateTripPackItemThunk({ itemId, data: { status: next } })
    ).unwrap();
  }
);

export const revertTripPackItemStatusThunk = createAsyncThunk(
  'tripPackItems/revertStatus',
  async (itemId: string, { dispatch, getState }) => {
    const state = getState() as RootState;
    const item = state.tripPackItems.items.find((i) => i.id === itemId);
    if (!item || item.status === 'todo') return;
    let prev: TripPackStatus;
    if (item.status === 'packed' && item.itemType === 'bring') {
      prev = 'todo';
    } else if (item.status === 'packed') {
      prev = 'ready';
    } else {
      prev = 'todo';
    }
    await dispatch(
      updateTripPackItemThunk({ itemId, data: { status: prev } })
    ).unwrap();
  }
);

export const deleteTripPackItemThunk = createAsyncThunk(
  'tripPackItems/delete',
  async (itemId: string, { dispatch, getState }) => {
    const state = getState() as RootState;
    const uid = state.auth.firebaseUid;
    const item = state.tripPackItems.items.find((i) => i.id === itemId);
    if (!item || !uid || !canEditPackItem(item, uid)) {
      throw new Error('Only the person who added this item can remove it.');
    }
    await deleteTripPackItem(itemId);
    dispatch(removeTripPackItem(itemId));

    const actor = getAuditActor(state);
    await recordTripAuditLog({
      tripId: item.tripId,
      action: 'pack_item.deleted',
      entityType: 'pack_item',
      entityId: itemId,
      actorUid: actor.uid,
      actorName: actor.name,
      summary: `${actor.name} removed "${item.title}" from the packing list`,
      metadata: { title: item.title },
    });
  }
);

function buildTemplateItemPayload(
  tripId: string,
  packKey: string,
  template: TripPackTemplateItem,
  createdBy: string
): Omit<TripPackItem, 'id' | 'createdAt' | 'packedAt'> {
  return {
    tripId,
    title: template.title,
    category: template.category,
    itemType: template.itemType,
    status: 'todo',
    quantity: '',
    note: '',
    assignedToMemberKey: null,
    source: 'template',
    templateKey: packKey,
    templateItemSlug: template.slug,
    createdBy,
  };
}

export const applyTripPackTemplateThunk = createAsyncThunk(
  'tripPackItems/applyTemplate',
  async (
    { tripId, packKey }: { tripId: string; packKey: string },
    { dispatch, getState }
  ) => {
    const state = getState() as RootState;
    const uid = state.auth.firebaseUid;
    if (!uid || !isTripEditorForTrip(tripId, uid, state)) {
      throw new Error('Only trip editors can add suggested packs.');
    }
    const pack = getTripPackTemplatePack(packKey);
    if (!pack) throw new Error('Unknown template pack.');

    const existingSlugs = new Set(
      state.tripPackItems.items
        .filter((i) => i.tripId === tripId && i.templateKey === packKey)
        .map((i) => i.templateItemSlug)
        .filter(Boolean)
    );

    const toCreate = pack.items
      .filter((t) => !existingSlugs.has(t.slug))
      .map((t) => buildTemplateItemPayload(tripId, packKey, t, uid));

    if (toCreate.length === 0) return { added: 0 };

    const ids = await createTripPackItemsBatch(toCreate);
    toCreate.forEach((item, i) => {
      dispatch(
        addTripPackItem({
          ...item,
          id: ids[i],
          packedAt: null,
          createdAt: { toDate: () => new Date() } as TripPackItem['createdAt'],
        })
      );
    });

    const actor = getAuditActor(state);
    await recordTripAuditLog({
      tripId,
      action: 'pack_item.batch_created',
      entityType: 'pack_item',
      actorUid: actor.uid,
      actorName: actor.name,
      summary: `${actor.name} added ${toCreate.length} suggested item${toCreate.length === 1 ? '' : 's'} to the packing list`,
      metadata: { count: toCreate.length, packKey },
    });

    return { added: toCreate.length };
  }
);

export const addTripPackTemplateItemThunk = createAsyncThunk(
  'tripPackItems/addTemplateItem',
  async (
    {
      tripId,
      packKey,
      slug,
    }: { tripId: string; packKey: string; slug: string },
    { dispatch, getState }
  ) => {
    const state = getState() as RootState;
    const uid = state.auth.firebaseUid;
    if (!uid || !isTripEditorForTrip(tripId, uid, state)) {
      throw new Error('Only trip editors can add suggested items.');
    }
    const pack = getTripPackTemplatePack(packKey);
    const template = pack?.items.find((t) => t.slug === slug);
    if (!template) throw new Error('Unknown suggested item.');

    const exists = state.tripPackItems.items.some(
      (i) =>
        i.tripId === tripId &&
        i.templateKey === packKey &&
        i.templateItemSlug === slug
    );
    if (exists) return { skipped: true };

    const payload = buildTemplateItemPayload(tripId, packKey, template, uid);
    const id = await createTripPackItem(payload);
    dispatch(
      addTripPackItem({
        ...payload,
        id,
        packedAt: null,
        createdAt: { toDate: () => new Date() } as TripPackItem['createdAt'],
      })
    );

    const actor = getAuditActor(state);
    await recordTripAuditLog({
      tripId,
      action: 'pack_item.created',
      entityType: 'pack_item',
      entityId: id,
      actorUid: actor.uid,
      actorName: actor.name,
      summary: `${actor.name} added "${template.title}" to the packing list`,
      metadata: { title: template.title },
    });

    return { skipped: false, id };
  }
);
