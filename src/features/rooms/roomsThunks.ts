import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  getRoomsForUser,
  getRoom,
  getRoomMembers,
  createRoom,
  CreateRoomInput,
  ensureActiveCycle,
} from '@/firebase/firestore';
import {
  setRooms,
  setCurrentRoom,
  setMembers,
  setActiveCycle,
  setLoading,
} from './roomsSlice';
import { recordRoomAuditLog } from '@/services/roomAuditLogService';
import type { RootState } from '@/store';

export const fetchUserRooms = createAsyncThunk(
  'rooms/fetchUser',
  async (userId: string, { dispatch }) => {
    dispatch(setLoading(true));
    const rooms = await getRoomsForUser(userId);
    dispatch(setRooms(rooms));
    dispatch(setLoading(false));
    return rooms;
  }
);

export const fetchRoom = createAsyncThunk(
  'rooms/fetchOne',
  async (roomId: string, { dispatch }) => {
    dispatch(setLoading(true));
    const room = await getRoom(roomId);
    const members = await getRoomMembers(roomId);
    const cycle = await ensureActiveCycle(roomId);
    dispatch(setCurrentRoom(room));
    dispatch(setMembers(members));
    dispatch(setActiveCycle(cycle));
    dispatch(setLoading(false));
    return { room, members, cycle };
  }
);

export const createRoomThunk = createAsyncThunk(
  'rooms/create',
  async (input: CreateRoomInput, { getState }) => {
    const room = await createRoom(input);
    const state = getState() as RootState;
    const actorName = state.auth.user?.name ?? 'Someone';
    await recordRoomAuditLog({
      roomId: room.roomId,
      action: 'room.created',
      entityType: 'room',
      entityId: room.roomId,
      actorUid: input.createdBy,
      actorName,
      summary: `${actorName} created room "${room.name}"`,
      metadata: { roomName: room.name },
    });
    return room;
  }
);
