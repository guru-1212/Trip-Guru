'use client';

import { useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { getFirebaseDb } from '@/firebase/config';
import { useAppDispatch } from '@/store';
import { setRoomExpenses } from '@/features/roomExpenses/roomExpensesSlice';
import { setMembers } from '@/features/rooms/roomsSlice';
import { RoomExpense } from '@/types/roomExpense';
import { RoomMember } from '@/types/roomMember';

export function useRealtimeRoom(
  roomId: string | null,
  cycleId: string | null
) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!roomId) return;

    const membersQuery = query(
      collection(getFirebaseDb(), 'roomMembers'),
      where('roomId', '==', roomId)
    );

    const unsubMembers = onSnapshot(membersQuery, (snapshot) => {
      const members: RoomMember[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as RoomMember[];
      dispatch(setMembers(members));
    });

    let unsubExpenses: (() => void) | undefined;

    if (cycleId) {
      const expensesQuery = query(
        collection(getFirebaseDb(), 'roomExpenses'),
        where('roomId', '==', roomId),
        where('cycleId', '==', cycleId)
      );

      unsubExpenses = onSnapshot(expensesQuery, (snapshot) => {
        const expenses: RoomExpense[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as RoomExpense[];
        expenses.sort((a, b) => {
          const timeA = a.createdAt?.toMillis() ?? Date.now();
          const timeB = b.createdAt?.toMillis() ?? Date.now();
          return timeB - timeA;
        });
        dispatch(setRoomExpenses(expenses));
      });
    }

    return () => {
      unsubMembers();
      unsubExpenses?.();
    };
  }, [roomId, cycleId, dispatch]);
}
