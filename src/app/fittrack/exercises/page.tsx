'use client';

import { useState } from 'react';
import { ImageOff, Search } from 'lucide-react';
import { PageTransition } from '@/components/workout/PageTransition';
import { ExerciseLibraryManager } from '@/components/workout/ExerciseLibraryManager';
import { useWorkoutStore } from '@/workout/WorkoutContext';
import { MUSCLE_COLORS } from '@/workout/constants';
import type { BodyPartFilter, ImageUploadFilter, MuscleGroup } from '@/workout/types';
import { cn } from '@/lib/utils';

const BODY_PART_FILTERS: { id: BodyPartFilter; label: string }[] = [
  { id: 'All', label: 'All' },
  { id: 'Chest', label: 'Chest' },
  { id: 'Back', label: 'Back' },
  { id: 'Shoulders', label: 'Shoulders' },
  { id: 'Triceps', label: 'Triceps' },
  { id: 'Biceps', label: 'Biceps' },
  { id: 'Legs', label: 'Legs' },
  { id: 'Core', label: 'Core' },
];

const IMAGE_FILTERS: { id: ImageUploadFilter; label: string; icon?: typeof ImageOff }[] = [
  { id: 'all', label: 'All images' },
  { id: 'missing', label: 'Not uploaded yet', icon: ImageOff },
];

export default function ExercisesPage() {
  const { hydrated } = useWorkoutStore();
  const [search, setSearch] = useState('');
  const [bodyPart, setBodyPart] = useState<BodyPartFilter>('All');
  const [imageFilter, setImageFilter] = useState<ImageUploadFilter>('all');

  if (!hydrated) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <PageTransition>
      <div className="space-y-6">
        <header>
          <h1 className="ft-title text-2xl font-bold">Exercise Library</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage exercises, variations, and images in one place. Changes sync everywhere automatically.
          </p>
        </header>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            className="ft-input pl-10"
            placeholder="Search exercises, muscles, or variations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
              Body part
            </p>
            <div className="flex flex-wrap gap-2">
              {BODY_PART_FILTERS.map(({ id, label }) => {
                const active = bodyPart === id;
                const color = id !== 'All' ? MUSCLE_COLORS[id] : undefined;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setBodyPart(id)}
                    className={cn(
                      'text-xs px-3 py-1.5 rounded-full border font-semibold transition-colors',
                      active
                        ? 'border-transparent text-white shadow-sm'
                        : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
                    )}
                    style={
                      active && color
                        ? { backgroundColor: color, borderColor: color }
                        : active
                          ? { backgroundColor: 'hsl(var(--primary))', borderColor: 'hsl(var(--primary))' }
                          : undefined
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
              Images
            </p>
            <div className="flex flex-wrap gap-2">
              {IMAGE_FILTERS.map(({ id, label, icon: Icon }) => {
                const active = imageFilter === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setImageFilter(id)}
                    className={cn(
                      'text-xs px-3 py-1.5 rounded-full border font-semibold inline-flex items-center gap-1.5 transition-colors',
                      active
                        ? id === 'missing'
                          ? 'bg-amber-500 border-amber-500 text-white'
                          : 'bg-primary border-primary text-white'
                        : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
                    )}
                  >
                    {Icon && <Icon className="h-3.5 w-3.5" />}
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <ExerciseLibraryManager search={search} bodyPart={bodyPart} imageFilter={imageFilter} />
      </div>
    </PageTransition>
  );
}
