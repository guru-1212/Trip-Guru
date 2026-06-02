'use client';

import { FormEvent, useMemo, useState } from 'react';
import { GymPageShell } from '@/components/gym/GymPageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useGym } from '@/hooks/useGym';
import { useAppDispatch } from '@/store';
import { saveGymProfile } from '@/features/gym/gymThunks';
import {
  calculateBMI,
  calculateBMR,
  calculateGoalCalories,
  calculateMacros,
  calculateMaintenanceCalories,
  calculateWaterMl,
} from '@/lib/gymCalculators';
import { foodSuggestionsForGoal } from '@/lib/gymRecommendations';
import { ActivityLevel, FitnessGoal, Gender } from '@/types/gym';

export default function GymProfilePage() {
  const { uid, profile } = useGym();
  const dispatch = useAppDispatch();
  const [form, setForm] = useState({
    age: profile?.age ?? 25,
    gender: (profile?.gender ?? 'male') as Gender,
    heightCm: profile?.heightCm ?? 170,
    currentWeightKg: profile?.currentWeightKg ?? 70,
    targetWeightKg: profile?.targetWeightKg ?? 65,
    activityLevel: (profile?.activityLevel ?? 'moderately_active') as ActivityLevel,
    fitnessGoal: (profile?.fitnessGoal ?? 'maintenance') as FitnessGoal,
  });

  const computed = useMemo(() => {
    const bmi = calculateBMI(form.currentWeightKg, form.heightCm);
    const bmr = calculateBMR(form.currentWeightKg, form.heightCm, form.age, form.gender);
    const maintenance = calculateMaintenanceCalories(bmr, form.activityLevel);
    const calories = calculateGoalCalories(maintenance, form.fitnessGoal);
    const macros = calculateMacros(calories, form.currentWeightKg, form.fitnessGoal);
    const waterMl = calculateWaterMl(form.currentWeightKg, form.activityLevel);
    return { bmi, bmr, calories, macros, waterMl };
  }, [form]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!uid) return;
    dispatch(
      saveGymProfile({
        uid,
        profile: {
          ...form,
          caloriesTarget: computed.calories,
          proteinTargetG: computed.macros.proteinG,
          carbsTargetG: computed.macros.carbsG,
          fatsTargetG: computed.macros.fatsG,
          waterTargetMl: computed.waterMl,
        },
      })
    );
  }

  return (
    <GymPageShell title="Profile & Goals">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>User Profile & Goal Setup</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <Field label="Age"><Input type="number" value={form.age} onChange={(e) => setForm((p) => ({ ...p, age: Number(e.target.value) }))} /></Field>
              <Field label="Height (cm)"><Input type="number" value={form.heightCm} onChange={(e) => setForm((p) => ({ ...p, heightCm: Number(e.target.value) }))} /></Field>
              <Field label="Current Weight (kg)"><Input type="number" value={form.currentWeightKg} onChange={(e) => setForm((p) => ({ ...p, currentWeightKg: Number(e.target.value) }))} /></Field>
              <Field label="Target Weight (kg)"><Input type="number" value={form.targetWeightKg} onChange={(e) => setForm((p) => ({ ...p, targetWeightKg: Number(e.target.value) }))} /></Field>
              <Field label="Gender">
                <Select value={form.gender} onValueChange={(value) => setForm((p) => ({ ...p, gender: value as Gender }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field label="Activity Level">
                <Select value={form.activityLevel} onValueChange={(value) => setForm((p) => ({ ...p, activityLevel: value as ActivityLevel }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sedentary">Sedentary</SelectItem><SelectItem value="lightly_active">Lightly Active</SelectItem><SelectItem value="moderately_active">Moderately Active</SelectItem><SelectItem value="very_active">Very Active</SelectItem><SelectItem value="athlete">Athlete</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Fitness Goal">
                <Select value={form.fitnessGoal} onValueChange={(value) => setForm((p) => ({ ...p, fitnessGoal: value as FitnessGoal }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weight_loss">Weight Loss</SelectItem><SelectItem value="weight_gain">Weight Gain</SelectItem><SelectItem value="muscle_gain">Muscle Gain</SelectItem><SelectItem value="strength_gain">Strength Gain</SelectItem><SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Button type="submit" className="w-full">Save Profile & Targets</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Smart Fitness Calculator</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Stat label="BMI" value={String(computed.bmi)} />
            <Stat label="BMR" value={`${computed.bmr} kcal`} />
            <Stat label="Calories Target" value={`${computed.calories} kcal`} />
            <Stat label="Protein" value={`${computed.macros.proteinG} g`} />
            <Stat label="Carbs" value={`${computed.macros.carbsG} g`} />
            <Stat label="Fats" value={`${computed.macros.fatsG} g`} />
            <Stat label="Water" value={`${computed.waterMl} ml`} />
            <div className="pt-2">
              <p className="font-semibold mb-2">Food Suggestions</p>
              <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                {foodSuggestionsForGoal(form.fitnessGoal).map((s) => <li key={s}>{s}</li>)}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </GymPageShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className="font-bold">{value}</span></div>;
}
