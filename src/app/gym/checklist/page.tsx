'use client';

import { GymPageShell } from '@/components/gym/GymPageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useGym } from '@/hooks/useGym';
import { useAppDispatch } from '@/store';
import { updateChecklistThunk } from '@/features/gym/gymThunks';

const items = [
  { key: 'workoutDone', label: 'Workout completed' },
  { key: 'proteinGoalMet', label: 'Protein goal achieved' },
  { key: 'waterGoalMet', label: 'Water goal achieved' },
  { key: 'calorieGoalMet', label: 'Calorie goal achieved' },
  { key: 'sleepGoalMet', label: 'Sleep goal achieved' },
] as const;

export default function GymChecklistPage() {
  const { uid, dateKey, checklist } = useGym();
  const dispatch = useAppDispatch();

  return (
    <GymPageShell title="Daily Checklist">
      <Card>
        <CardHeader><CardTitle>Today ({dateKey})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {items.map((item) => {
            const active = Boolean(checklist?.[item.key]);
            return (
              <div key={item.key} className="flex items-center justify-between rounded-xl border p-3">
                <p className="font-medium">{item.label}</p>
                <Button
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  onClick={() => {
                    if (!uid) return;
                    dispatch(
                      updateChecklistThunk({
                        uid,
                        dateKey,
                        patch: { [item.key]: !active },
                      })
                    );
                  }}
                >
                  {active ? 'Done' : 'Mark done'}
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </GymPageShell>
  );
}
