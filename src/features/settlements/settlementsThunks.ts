import { createAsyncThunk } from '@reduxjs/toolkit';
import { getSettlements, markSettlementPaid } from '@/firebase/firestore';
import { computeSettlements } from '@/lib/settlementAlgorithm';
import { setSettlements, setComputed, updateSettlement, setLoading } from './settlementsSlice';
import { Expense } from '@/types/expense';
import { TripMember } from '@/types/member';

export const fetchSettlements = createAsyncThunk(
  'settlements/fetch',
  async (tripId: string, { dispatch }) => {
    dispatch(setLoading(true));
    const settlements = await getSettlements(tripId);
    dispatch(setSettlements(settlements));
    return settlements;
  }
);

export const computeSettlementsThunk = createAsyncThunk(
  'settlements/compute',
  async (
    {
      tripId,
      expenses,
      members,
    }: { tripId: string; expenses: Expense[]; members: TripMember[] },
    { dispatch }
  ) => {
    const computed = computeSettlements(expenses, members, tripId);
    dispatch(setComputed(computed));
    return computed;
  }
);

export const markPaidThunk = createAsyncThunk(
  'settlements/markPaid',
  async (settlementId: string, { dispatch, getState }) => {
    const state = getState() as {
      auth: { firebaseUid: string | null };
      settlements: { settlements: import('@/types/settlement').Settlement[] };
    };
    const paidBy = state.auth.firebaseUid ?? undefined;
    await markSettlementPaid(settlementId, paidBy);
    const existing = state.settlements.settlements.find((s) => s.id === settlementId);
    if (existing) {
      dispatch(
        updateSettlement({
          ...existing,
          status: 'paid',
          paidAt: { toDate: () => new Date() } as never,
        })
      );
    }
  }
);
