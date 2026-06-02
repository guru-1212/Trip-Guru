'use client';

import { GymPageShell } from '@/components/gym/GymPageShell';
import { EXERCISE_LIBRARY } from '@/lib/gymLibrary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function GymExercisesPage() {
  return (
    <GymPageShell title="Exercise Library">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {EXERCISE_LIBRARY.map((exercise) => (
          <Card key={exercise.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>{exercise.name}</CardTitle>
                <Badge>{exercise.difficulty}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <img src={exercise.imageUrl} alt={exercise.name} className="w-full h-40 object-cover rounded-xl" />
              <List label="Step-by-step instructions" items={exercise.instructions} />
              <List label="Target muscles" items={exercise.targetMuscles} />
              <List label="Common mistakes" items={exercise.commonMistakes} />
              <List label="Trainer tips" items={exercise.trainerTips} />
            </CardContent>
          </Card>
        ))}
      </div>
    </GymPageShell>
  );
}

function List({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="font-semibold mb-1">{label}</p>
      <ul className="list-disc pl-4 text-muted-foreground space-y-1">
        {items.map((item) => <li key={`${label}-${item}`}>{item}</li>)}
      </ul>
    </div>
  );
}
