import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  createRoomBringItem,
  deleteRoomBringItem,
  getRoomBringItems,
  updateRoomBringItem,
} from '@/firebase/firestore';
import {
  addRoomBringItem,
  removeRoomBringItem,
  setLoading,
  setRoomBringItems,
  updateRoomBringItem as updateRoomBringItemAction,
} from './roomBringItemsSlice';
import { RoomBringItem } from '@/types/roomBringItem';
import { recordRoomAuditLog } from '@/services/roomAuditLogService';
import type { RootState } from '@/store';

function getAuditActor(state: RootState) {
  return {
    uid: state.auth.firebaseUid ?? '',
    name: state.auth.user?.name ?? 'Someone',
  };
}

export const fetchRoomBringItems = createAsyncThunk(
  'roomBringItems/fetch',
  async (
    { roomId, cycleId }: { roomId: string; cycleId?: string },
    { dispatch }
  ) => {
    dispatch(setLoading(true));
    const items = await getRoomBringItems(roomId, cycleId);
    dispatch(setRoomBringItems(items));
    dispatch(setLoading(false));
    return items;
  }
);

export const addRoomBringItemThunk = createAsyncThunk(
  'roomBringItems/add',
  async (
    item: Omit<RoomBringItem, 'id' | 'createdAt' | 'broughtAt'>,
    { dispatch, getState }
  ) => {
    const id = await createRoomBringItem(item);
    dispatch(
      addRoomBringItem({
        ...item,
        id,
        broughtAt: null,
        createdAt: { toDate: () => new Date() } as RoomBringItem['createdAt'],
      })
    );

    const state = getState() as RootState;
    const actor = getAuditActor(state);
    const currency = state.rooms.currentRoom?.currency ?? 'INR';
    await recordRoomAuditLog({
      roomId: item.roomId,
      cycleId: item.cycleId,
      action: 'bring_item.created',
      entityType: 'bring_item',
      entityId: id,
      actorUid: actor.uid,
      actorName: actor.name,
      summary: `${actor.name} added "${item.title}" to the bring list (${currency} ${item.estimatedAmount.toLocaleString()})`,
      metadata: { title: item.title, amount: item.estimatedAmount },
    });

    return id;
  }
);

export const updateRoomBringItemThunk = createAsyncThunk(
  'roomBringItems/update',
  async (
    {
      itemId,
      data,
    }: {
      itemId: string;
      data: Partial<
        Pick<
          RoomBringItem,
          | 'title'
          | 'category'
          | 'estimatedAmount'
          | 'quantity'
          | 'note'
          | 'assignedToMemberKey'
          | 'status'
        >
      >;
    },
    { dispatch, getState }
  ) => {
    await updateRoomBringItem(itemId, data);
    dispatch(updateRoomBringItemAction({ id: itemId, ...data }));

    const state = getState() as RootState;
    const item = state.roomBringItems.items.find((i) => i.id === itemId);
    const actor = getAuditActor(state);
    const currency = state.rooms.currentRoom?.currency ?? 'INR';
    const title = (data.title ?? item?.title) as string;
    const amount = (data.estimatedAmount ?? item?.estimatedAmount) as number;

    await recordRoomAuditLog({
      roomId: item?.roomId ?? '',
      cycleId: item?.cycleId,
      action:
        data.status === 'brought'
          ? 'bring_item.brought'
          : 'bring_item.updated',
      entityType: 'bring_item',
      entityId: itemId,
      actorUid: actor.uid,
      actorName: actor.name,
      summary:
        data.status === 'brought'
          ? `${actor.name} marked "${title}" as brought`
          : `${actor.name} updated "${title}" on the bring list (${currency} ${amount.toLocaleString()})`,
      metadata: { title, amount },
    });
  }
);

export const toggleRoomBringItemStatusThunk = createAsyncThunk(
  'roomBringItems/toggleStatus',
  async (itemId: string, { dispatch, getState }) => {
    const state = getState() as RootState;
    const item = state.roomBringItems.items.find((i) => i.id === itemId);
    if (!item) return;
    const nextStatus = item.status === 'planned' ? 'brought' : 'planned';
    await dispatch(
      updateRoomBringItemThunk({
        itemId,
        data: { status: nextStatus },
      })
    ).unwrap();
  }
);

export const deleteRoomBringItemThunk = createAsyncThunk(
  'roomBringItems/delete',
  async (itemId: string, { dispatch, getState }) => {
    const state = getState() as RootState;
    const item = state.roomBringItems.items.find((i) => i.id === itemId);
    await deleteRoomBringItem(itemId);
    dispatch(removeRoomBringItem(itemId));

    const actor = getAuditActor(state);
    if (item) {
      await recordRoomAuditLog({
        roomId: item.roomId,
        cycleId: item.cycleId,
        action: 'bring_item.deleted',
        entityType: 'bring_item',
        entityId: itemId,
        actorUid: actor.uid,
        actorName: actor.name,
        summary: `${actor.name} removed "${item.title}" from the bring list`,
        metadata: { title: item.title },
      });
    }
  }
);
