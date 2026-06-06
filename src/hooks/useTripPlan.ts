'use client';

import { useCallback, useEffect, useState } from 'react';
import { TripPlan } from '@/types/tripPlan';
import {
  getTripPlanOrDefault,
  saveTripPlan,
  resetTripPlanToDefault,
} from '@/firebase/firestore';
import { getExpenses } from '@/firebase/firestore';
import { getTotalSpent } from '@/lib/settlementAlgorithm';
import { recordTripAuditLog } from '@/services/tripAuditLogService';
import { useAppSelector } from '@/store';

export function useTripPlan(tripId: string) {
  const actorUid = useAppSelector((s) => s.auth.firebaseUid ?? '');
  const actorName = useAppSelector((s) => s.auth.user?.name ?? 'Someone');
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTripPlanOrDefault(tripId);
      const expenses = await getExpenses(tripId);
      const spent = getTotalSpent(expenses);
      setPlan({ ...data, budgetUsed: spent });
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    load();
  }, [load]);

  const persist = async (next: TripPlan) => {
    setSaving(true);
    try {
      await saveTripPlan(next);
      setPlan(next);
      if (actorUid) {
        await recordTripAuditLog({
          tripId,
          action: 'plan.updated',
          entityType: 'plan',
          entityId: tripId,
          actorUid,
          actorName,
          summary: `${actorName} updated the trip plan`,
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const resetDefault = async () => {
    setSaving(true);
    try {
      const data = await resetTripPlanToDefault(tripId);
      const expenses = await getExpenses(tripId);
      setPlan({ ...data, budgetUsed: getTotalSpent(expenses) });
      if (actorUid) {
        await recordTripAuditLog({
          tripId,
          action: 'plan.reset',
          entityType: 'plan',
          entityId: tripId,
          actorUid,
          actorName,
          summary: `${actorName} reset the trip plan`,
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return { plan, loading, saving, persist, reload: load, resetDefault };
}
