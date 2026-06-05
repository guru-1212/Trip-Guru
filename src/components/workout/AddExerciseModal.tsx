'use client';

import { useMemo, useState } from 'react';
import { Search, Plus, X } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { EXERCISE_LIBRARY, getExerciseById } from '@/workout/exerciseLibrary';
import type { CustomExercise, LibraryExercise, MuscleGroup, SplitId } from '@/workout/types';
import { libraryItemToWorkoutExercise } from '@/workout/utils';

interface AddExerciseModalProps {
  splitId: SplitId;
  currentExerciseIds: string[];
  customExercises: CustomExercise[];
  onAdd: (exerciseId: string, remember: boolean) => void;
  onCreateCustom: (data: Omit<CustomExercise, 'id'>, remember: boolean) => void;
  onClose: () => void;
}

export function AddExerciseModal({
  splitId,
  currentExerciseIds,
  customExercises,
  onAdd,
  onCreateCustom,
  onClose,
}: AddExerciseModalProps) {
  const [search, setSearch] = useState('');
  const [remember, setRemember] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMuscle, setNewMuscle] = useState<MuscleGroup>('Chest');
  const [newVariation, setNewVariation] = useState('Standard');

  const currentSet = new Set(currentExerciseIds);

  const customAsLibrary: LibraryExercise[] = customExercises.map((c) => ({
    id: c.id,
    name: c.name,
    muscle: c.muscle,
    secondary: c.secondary,
    equipment: c.equipment,
    difficulty: c.difficulty,
    variations: c.variations,
    tips: c.notes ? [c.notes] : [],
    splitIds: [],
    category: [c.muscle],
  }));

  const available = useMemo(() => {
    const all = [...EXERCISE_LIBRARY, ...customAsLibrary];
    const q = search.toLowerCase().trim();
    return all.filter((ex) => {
      if (currentSet.has(ex.id)) return false;
      if (!q) return true;
      return (
        ex.name.toLowerCase().includes(q) ||
        ex.muscle.toLowerCase().includes(q) ||
        (ex.secondary?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [search, currentSet, customAsLibrary]);

  const handleCreate = () => {
    if (!newName.trim()) {
      toast.error('Enter an exercise name');
      return;
    }
    onCreateCustom(
      {
        name: newName.trim(),
        muscle: newMuscle,
        equipment: 'Custom',
        difficulty: 'Beginner',
        variations: [newVariation.trim() || 'Standard'],
        notes: '',
      },
      remember
    );
    setNewName('');
    setNewVariation('Standard');
    setShowCreate(false);
  };

  return (
    <div className="ft-overlay !items-end sm:!items-center !p-0 sm:!p-4" style={{ zIndex: 110 }} onClick={onClose}>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        className="ft-modal ft-modal-lg !max-h-[90vh] !rounded-b-none sm:!rounded-b-xl flex flex-col !p-0 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="ft-title">Add Exercise</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Search the library or create custom</p>
          </div>
          <button type="button" onClick={onClose} className="ft-btn ft-btn--ghost ft-btn--icon">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              className="ft-input !pl-10"
              placeholder="Search exercises..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="rounded accent-primary"
            />
            Remember for this split
          </label>

          {!showCreate ? (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="ft-btn ft-btn--ghost ft-btn--block"
            >
              <Plus className="h-4 w-4" />
              Create custom exercise
            </button>
          ) : (
            <div className="ft-card ft-card-padded space-y-3 !p-4">
              <p className="text-sm font-semibold">New exercise</p>
              <input
                className="ft-input"
                placeholder="Exercise name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  className="ft-select"
                  value={newMuscle}
                  onChange={(e) => setNewMuscle(e.target.value as MuscleGroup)}
                >
                  {(['Chest', 'Back', 'Shoulders', 'Triceps', 'Biceps', 'Legs', 'Core'] as MuscleGroup[]).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <input
                  className="ft-input"
                  placeholder="Variation"
                  value={newVariation}
                  onChange={(e) => setNewVariation(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button type="button" className="ft-btn ft-btn--secondary flex-1" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
                <button type="button" className="ft-btn ft-btn--primary flex-1" onClick={handleCreate}>
                  Create
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {available.length === 0 ? (
              <div className="ft-empty">
                <p>{search ? 'No exercises found' : 'All exercises already added'}</p>
              </div>
            ) : (
              available.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => onAdd(ex.id, remember)}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:border-primary/40 text-left transition-colors"
                >
                  <div>
                    <p className="font-semibold text-sm">{ex.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{ex.muscle} · {ex.equipment}</p>
                  </div>
                  <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Plus className="h-4 w-4" />
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function resolveExerciseForWorkout(
  exerciseId: string,
  customExercises: CustomExercise[],
  defaultSets: number
) {
  const lib = getExerciseById(exerciseId);
  if (lib) return libraryItemToWorkoutExercise(lib, defaultSets);
  const custom = customExercises.find((c) => c.id === exerciseId);
  if (custom) return libraryItemToWorkoutExercise(custom, defaultSets);
  return null;
}
