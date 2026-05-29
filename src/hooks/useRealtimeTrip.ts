'use client';

import { useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { getFirebaseDb } from '@/firebase/config';
import { useAppDispatch } from '@/store';
import { setExpenses } from '@/features/expenses/expensesSlice';
import { setMembers } from '@/features/trips/tripsSlice';
import { Expense } from '@/types/expense';
import { TripMember } from '@/types/member';

export function useRealtimeTrip(tripId: string | null) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!tripId) return;

    const expensesQuery = query(
      collection(getFirebaseDb(), 'expenses'),
      where('tripId', '==', tripId)
    );

    const membersQuery = query(
      collection(getFirebaseDb(), 'tripMembers'),
      where('tripId', '==', tripId)
    );

    const unsubExpenses = onSnapshot(expensesQuery, (snapshot) => {
      const expenses: Expense[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Expense[];
      
      // Sort with null safety: treat null createdAt as the latest (now)
      expenses.sort((a, b) => {
        const timeA = a.createdAt?.toMillis() ?? Date.now();
        const timeB = b.createdAt?.toMillis() ?? Date.now();
        return timeB - timeA;
      });
      
      dispatch(setExpenses(expenses));
    });

    const unsubMembers = onSnapshot(membersQuery, (snapshot) => {
      const members: TripMember[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as TripMember[];
      dispatch(setMembers(members));
    });

    return () => {
      unsubExpenses();
      unsubMembers();
    };
  }, [tripId, dispatch]);
}
