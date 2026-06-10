'use client';

import { useState } from 'react';
import { Dumbbell, Flame, ImageOff, Search, Wind } from 'lucide-react';
import { PageTransition } from '@/components/workout/PageTransition';
import { ExerciseLibraryManager } from '@/components/workout/ExerciseLibraryManager';
import { MobilityLibraryManager } from '@/components/workout/MobilityLibraryManager';
import { useWorkoutStore } from '@/workout/WorkoutContext';
import { MUSCLE_COLORS } from '@/workout/constants';
import type { BodyPartFilter, ImageUploadFilter } from '@/workout/types';
import { cn } from '@/lib/utils';

type LibraryTab = 'workouts' | 'warmup' | 'stretch';

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

const LIBRARY_TABS: { id: LibraryTab; label: string; icon: typeof Dumbbell }[] = [
  { id: 'workouts', label: 'Workouts', icon: Dumbbell },
  { id: 'warmup', label: 'Warm-up', icon: Flame },
  { id: 'stretch', label: 'Stretching', icon: Wind },
];

export default function ExercisesPage() {
  const { hydrated } = useWorkoutStore();
  const [libraryTab, setLibraryTab] = useState<LibraryTab>('workouts');
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
            Manage workout exercises, warm-up moves, stretching, and images in one place. Changes sync everywhere
            automatically.
          </p>
        </header>

        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
            Library
          </p>
          <div className="flex flex-wrap gap-2">
            {LIBRARY_TABS.map(({ id, label, icon: Icon }) => {
              const active = libraryTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setLibraryTab(id)}
                  className={cn(
                    'text-xs px-3 py-1.5 rounded-full border font-semibold inline-flex items-center gap-1.5 transition-colors',
                    active
                      ? id === 'warmup'
                        ? 'bg-orange-500 border-orange-500 text-white'
                        : id === 'stretch'
                          ? 'bg-teal-500 border-teal-500 text-white'
                          : 'bg-primary border-primary text-white'
                      : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            className="ft-input pl-10"
            placeholder={
              libraryTab === 'workouts'
                ? 'Search exercises, muscles, or variations...'
                : libraryTab === 'warmup'
                  ? 'Search warm-up moves, muscles, or splits...'
                  : 'Search stretches, muscles, or splits...'
            }
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

        {libraryTab === 'workouts' ? (
          <ExerciseLibraryManager search={search} bodyPart={bodyPart} imageFilter={imageFilter} />
        ) : (
          <MobilityLibraryManager
            mobilityType={libraryTab === 'warmup' ? 'warmup' : 'stretch'}
            search={search}
            bodyPart={bodyPart}
            imageFilter={imageFilter}
          />
        )}
      </div>
    </PageTransition>
  );
}
