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
  async (input: CreateRoomInput) => {
    return createRoom(input);
  }
);
