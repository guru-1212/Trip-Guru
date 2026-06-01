'use client';

import { useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { getFirebaseDb } from '@/firebase/config';
import { useAppDispatch } from '@/store';
import { setRoomExpenses } from '@/features/roomExpenses/roomExpensesSlice';
import { setRoomBringItems } from '@/features/roomBringItems/roomBringItemsSlice';
import { setMembers } from '@/features/rooms/roomsSlice';
import { RoomExpense } from '@/types/roomExpense';
import { RoomBringItem } from '@/types/roomBringItem';
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
    let unsubBringItems: (() => void) | undefined;

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

      const bringQuery = query(
        collection(getFirebaseDb(), 'roomBringItems'),
        where('roomId', '==', roomId),
        where('cycleId', '==', cycleId)
      );

      unsubBringItems = onSnapshot(bringQuery, (snapshot) => {
        const items: RoomBringItem[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as RoomBringItem[];
        items.sort((a, b) => {
          if (a.status !== b.status) {
            return a.status === 'planned' ? -1 : 1;
          }
          const timeA = a.createdAt?.toMillis() ?? Date.now();
          const timeB = b.createdAt?.toMillis() ?? Date.now();
          return timeB - timeA;
        });
        dispatch(setRoomBringItems(items));
      });
    }

    return () => {
      unsubMembers();
      unsubExpenses?.();
      unsubBringItems?.();
    };
  }, [roomId, cycleId, dispatch]);
}
