import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Room } from '@/types/room';
import { RoomMember } from '@/types/roomMember';
import { Cycle } from '@/types/cycle';

interface RoomsState {
  rooms: Room[];
  currentRoom: Room | null;
  members: RoomMember[];
  activeCycle: Cycle | null;
  loading: boolean;
}

const initialState: RoomsState = {
  rooms: [],
  currentRoom: null,
  members: [],
  activeCycle: null,
  loading: false,
};

const roomsSlice = createSlice({
  name: 'rooms',
  initialState,
  reducers: {
    setRooms(state, action: PayloadAction<Room[]>) {
      state.rooms = action.payload;
    },
    setCurrentRoom(state, action: PayloadAction<Room | null>) {
      state.currentRoom = action.payload;
    },
    setMembers(state, action: PayloadAction<RoomMember[]>) {
      state.members = action.payload;
    },
    setActiveCycle(state, action: PayloadAction<Cycle | null>) {
      state.activeCycle = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
  },
});

export const {
  setRooms,
  setCurrentRoom,
  setMembers,
  setActiveCycle,
  setLoading,
} = roomsSlice.actions;
export default roomsSlice.reducer;
