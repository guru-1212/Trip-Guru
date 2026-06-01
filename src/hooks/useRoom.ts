'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchRoom } from '@/features/rooms/roomsThunks';

export function useRoom(roomId: string) {
  const dispatch = useAppDispatch();
  const room = useAppSelector((s) => s.rooms.currentRoom);
  const members = useAppSelector((s) => s.rooms.members);
  const activeCycle = useAppSelector((s) => s.rooms.activeCycle);
  const loading = useAppSelector((s) => s.rooms.loading);

  useEffect(() => {
    if (roomId) dispatch(fetchRoom(roomId));
  }, [roomId, dispatch]);

  return { room, members, activeCycle, loading };
}
