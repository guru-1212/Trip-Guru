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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        className="wk-card w-full sm:max-w-xl max-h-[90vh] overflow-hidden flex flex-col rounded-t-[32px] sm:rounded-[32px] shadow-2xl bg-background border-primary/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Deployment Catalog</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">Exercise Library & Custom Configuration</p>
          </div>
          <button type="button" onClick={onClose} className="p-3 rounded-2xl hover:bg-primary/5 transition-all text-muted-foreground">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1 no-scrollbar">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              className="wk-input pl-12 h-14 font-bold bg-slate-500/5 focus:bg-primary/[0.02]"
              placeholder="Search exercise catalog..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-3 px-2 text-xs font-black uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-primary transition-colors">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 rounded-lg accent-primary border-primary/20"
            />
            <span>Persist to {splitId.toUpperCase()} Protocol</span>
          </label>

          {!showCreate ? (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="w-full h-14 flex items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/20 text-primary font-black text-xs uppercase tracking-widest hover:bg-primary/5 hover:border-primary/40 transition-all active:scale-95 shadow-xl shadow-primary/5"
            >
              <Plus className="h-5 w-5" /> Initialize Custom Config
            </button>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-5 rounded-3xl bg-primary/[0.03] border border-primary/10 space-y-4"
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">New Protocol Node</p>
              <input
                className="wk-input font-bold bg-white/5"
                placeholder="Exercise Identity Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  className="wk-input font-bold bg-white/5 appearance-none"
                  value={newMuscle}
                  onChange={(e) => setNewMuscle(e.target.value as MuscleGroup)}
                >
                  {(['Chest', 'Back', 'Shoulders', 'Triceps', 'Biceps', 'Legs', 'Core'] as MuscleGroup[]).map((m) => (
                    <option key={m} value={m} className="bg-slate-900">{m}</option>
                  ))}
                </select>
                <input
                  className="wk-input font-bold bg-white/5"
                  placeholder="Variation Mode"
                  value={newVariation}
                  onChange={(e) => setNewVariation(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <button type="button" className="bg-slate-500/10 hover:bg-slate-500/20 text-slate-700 dark:text-slate-300 flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
                <button type="button" className="bg-primary text-white flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-primary/20 active:scale-95" onClick={handleCreate}>
                  Deploy & Save
                </button>
              </div>
            </motion.div>
          )}

          <div className="space-y-3">
            {available.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                    <X className="h-6 w-6 text-muted-foreground" />
                 </div>
                 <p className="text-muted-foreground text-xs font-black uppercase tracking-widest">
                   {search ? 'Zero catalog matches' : 'All available protocols deployed'}
                 </p>
              </div>
            ) : (
              available.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => onAdd(ex.id, remember)}
                  className="w-full flex items-center justify-between p-5 rounded-2xl bg-slate-500/5 border border-white/5 hover:border-primary/30 hover:bg-primary/[0.02] text-left transition-all group active:scale-[0.99] shadow-lg shadow-black/5"
                >
                  <div>
                    <p className="font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1.5 group-hover:text-primary transition-colors">{ex.name}</p>
                    <div className="flex items-center gap-2">
                       <span className="text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded bg-muted text-muted-foreground">{ex.muscle}</span>
                       <span className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground opacity-40">{ex.equipment}</span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-inner">
                     <Plus className="h-5 w-5" />
                  </div>
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
