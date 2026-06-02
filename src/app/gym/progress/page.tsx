'use client';

import { FormEvent, useMemo, useState } from 'react';
import { GymPageShell } from '@/components/gym/GymPageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useGym } from '@/hooks/useGym';
import { useAppDispatch } from '@/store';
import { addMeasurementLogThunk, addWeightLogThunk } from '@/features/gym/gymThunks';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export default function GymProgressPage() {
  const { uid, weightLogs, measurementLogs } = useGym();
  const dispatch = useAppDispatch();
  const [weight, setWeight] = useState('');
  const [measurements, setMeasurements] = useState({
    chestCm: '',
    waistCm: '',
    armsCm: '',
    shouldersCm: '',
    thighsCm: '',
    calvesCm: '',
  });
  const today = new Date().toISOString().slice(0, 10);

  function addWeight(e: FormEvent) {
    e.preventDefault();
    if (!uid || !weight) return;
    dispatch(addWeightLogThunk({ uid, date: today, weightKg: Number(weight) }));
    setWeight('');
  }

  function addMeasurements(e: FormEvent) {
    e.preventDefault();
    if (!uid) return;
    dispatch(
      addMeasurementLogThunk({
        uid,
        payload: {
          date: today,
          chestCm: Number(measurements.chestCm),
          waistCm: Number(measurements.waistCm),
          armsCm: Number(measurements.armsCm),
          shouldersCm: Number(measurements.shouldersCm),
          thighsCm: Number(measurements.thighsCm),
          calvesCm: Number(measurements.calvesCm),
        },
      })
    );
  }

  const weightChartData = useMemo(
    () =>
      [...weightLogs]
        .slice(0, 12)
        .reverse()
        .map((log) => ({ date: log.date.slice(5), weight: log.weightKg })),
    [weightLogs]
  );

  return (
    <GymPageShell title="Progress Tracking">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Weekly Weight Updates</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={addWeight} className="flex gap-2">
              <Input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Weight in kg" />
              <Button type="submit">Add</Button>
            </form>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Body Measurements</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={addMeasurements} className="grid grid-cols-2 gap-2">
              {Object.entries(measurements).map(([key, value]) => (
                <Input key={key} value={value} onChange={(e) => setMeasurements((p) => ({ ...p, [key]: e.target.value }))} placeholder={key.replace('Cm', ' (cm)')} />
              ))}
              <Button type="submit" className="col-span-2">Save Measurements</Button>
            </form>
            <div className="text-sm text-muted-foreground">
              <p>Total entries: {measurementLogs.length}</p>
              <p>Latest: {measurementLogs[0]?.date ?? 'No entries yet'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </GymPageShell>
  );
}
