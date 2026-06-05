'use client';

import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Search, Plus, Pencil, Trash2, X } from 'lucide-react';
import { PageTransition } from '@/components/workout/PageTransition';
import { useWorkoutStore } from '@/workout/WorkoutContext';
import { EXERCISE_LIBRARY } from '@/workout/exerciseLibrary';
import { getExerciseSessionChart, getExerciseHistory } from '@/workout/analytics';
import type { CustomExercise, ExerciseCategory, LibraryExercise, MuscleGroup } from '@/workout/types';
import { getLastExerciseSession, formatWeight } from '@/workout/utils';

type FilterType = ExerciseCategory | 'All';

const FILTERS: FilterType[] = [
  'All',
  'Chest',
  'Back',
  'Shoulders',
  'Triceps',
  'Biceps',
  'Legs',
  'Core',
  'Compound',
  'Isolation',
];

export default function ExercisesPage() {
  const {
    workouts,
    prs,
    customExercises,
    profile,
    hydrated,
    addCustomExercise,
    updateCustomExercise,
    deleteCustomExercise,
  } = useWorkoutStore();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('All');
  const [selected, setSelected] = useState<LibraryExercise | CustomExercise | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CustomExercise | null>(null);

  const allExercises = useMemo(() => {
    const custom: LibraryExercise[] = customExercises.map((c) => ({
      id: c.id,
      name: c.name,
      muscle: c.muscle,
      secondary: c.secondary,
      equipment: c.equipment,
      difficulty: c.difficulty,
      variations: c.variations,
      tips: c.notes ? [c.notes] : ['Focus on controlled movement', 'Maintain proper form'],
      splitIds: [],
      category: [c.muscle, 'Isolation'],
    }));
    return [...EXERCISE_LIBRARY, ...custom];
  }, [customExercises]);

  const filtered = useMemo(() => {
    return allExercises.filter((ex) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        ex.name.toLowerCase().includes(q) ||
        ex.muscle.toLowerCase().includes(q) ||
        (ex.secondary?.toLowerCase().includes(q) ?? false);
      const matchFilter =
        filter === 'All' ||
        ex.muscle === filter ||
        ex.category.includes(filter);
      return matchSearch && matchFilter;
    });
  }, [allExercises, search, filter]);

  const isCustom = (id: string) => customExercises.some((c) => c.id === id);

  if (!hydrated) return <div className="text-[var(--wk-muted)]">Loading...</div>;

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="wk-heading text-2xl font-bold">Exercise Library</h1>
          <button type="button" onClick={() => { setShowForm(true); setEditing(null); }} className="wk-btn-primary flex items-center gap-2 text-sm">
            <Plus className="h-4 w-4" /> Add Custom Exercise
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--wk-muted)]" />
          <input
            className="wk-input pl-10"
            placeholder="Search exercises or muscle groups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium ${
                filter === f
                  ? 'bg-[var(--wk-accent)] border-[var(--wk-accent)] text-white'
                  : 'border-[var(--wk-border)] text-[var(--wk-muted)]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((ex) => {
            const last = getLastExerciseSession(workouts, ex.id);
            const pr = prs[ex.id];
            return (
              <button
                key={ex.id}
                type="button"
                onClick={() => setSelected(ex)}
                className="wk-card p-4 text-left hover:border-[var(--wk-accent)] transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{ex.name}</h3>
                  {isCustom(ex.id) && (
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => {
                          const c = customExercises.find((x) => x.id === ex.id);
                          if (c) { setEditing(c); setShowForm(true); }
                        }}
                        className="text-[var(--wk-muted)] hover:text-[var(--wk-text)]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCustomExercise(ex.id)}
                        className="text-[var(--wk-danger)]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="wk-badge wk-badge-accent">{ex.muscle}</span>
                  <span className="wk-badge wk-badge-blue">{ex.equipment}</span>
                  <span className={`wk-badge ${
                    ex.difficulty === 'Beginner' ? 'wk-badge-accent' :
                    ex.difficulty === 'Intermediate' ? 'wk-badge-warning' : 'wk-badge-danger'
                  }`}>{ex.difficulty}</span>
                </div>
                {last && (
                  <p className="text-xs text-[var(--wk-muted)] mt-2">
                    Last: {dayjs(last.date).format('MMM D')} — {formatWeight(last.weight, profile.prefs.unit)} × {last.reps}
                  </p>
                )}
                {pr && !last && (
                  <p className="text-xs text-[var(--wk-muted)] mt-2">
                    PR: {formatWeight(pr.weight, profile.prefs.unit)} × {pr.reps}
                  </p>
                )}
              </button>
            );
          })}
        </div>

        {selected && (
          <ExerciseDetailModal
            exercise={selected}
            workouts={workouts}
            prs={prs}
            unit={profile.prefs.unit}
            onClose={() => setSelected(null)}
          />
        )}

        {showForm && (
          <CustomExerciseForm
            initial={editing}
            onClose={() => { setShowForm(false); setEditing(null); }}
            onSave={(data) => {
              if (editing) updateCustomExercise(editing.id, data);
              else addCustomExercise(data);
              setShowForm(false);
              setEditing(null);
            }}
          />
        )}
      </div>
    </PageTransition>
  );
}

function ExerciseDetailModal({
  exercise,
  workouts,
  prs,
  unit,
  onClose,
}: {
  exercise: LibraryExercise | CustomExercise;
  workouts: ReturnType<typeof useWorkoutStore>['workouts'];
  prs: ReturnType<typeof useWorkoutStore>['prs'];
  unit: 'kg' | 'lbs';
  onClose: () => void;
}) {
  const chartData = getExerciseSessionChart(workouts, exercise.id, 6);
  const pr = prs[exercise.id];
  const tips = 'tips' in exercise ? exercise.tips : (exercise.notes ? [exercise.notes] : []);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="wk-card p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="wk-heading text-xl font-bold">{exercise.name}</h2>
            <span className="wk-badge wk-badge-accent mt-1">{exercise.muscle}</span>
          </div>
          <button type="button" onClick={onClose}><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="text-xs text-[var(--wk-muted)] font-medium mb-2">Variations</h4>
            <div className="flex flex-wrap gap-1">
              {exercise.variations.map((v) => (
                <span key={v} className="text-xs px-2 py-1 rounded bg-[var(--wk-surface)] border border-[var(--wk-border)]">{v}</span>
              ))}
            </div>
          </div>

          {pr && (
            <div className="p-3 rounded-lg bg-[rgba(29,158,117,0.1)] border border-[var(--wk-accent)]">
              <p className="text-sm font-semibold">🏆 Best Set Ever</p>
              <p className="text-lg font-bold">{formatWeight(pr.weight, unit)} × {pr.reps}</p>
              <p className="text-xs text-[var(--wk-muted)]">{dayjs(pr.date).format('MMM D, YYYY')} · {pr.variation}</p>
            </div>
          )}

          {chartData.length > 0 && (
            <div>
              <h4 className="text-xs text-[var(--wk-muted)] font-medium mb-2">Last 6 Sessions</h4>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData}>
                  <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#888', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#222', border: '1px solid #333' }} />
                  <Line type="monotone" dataKey="weight" stroke="#1D9E75" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div>
            <h4 className="text-xs text-[var(--wk-muted)] font-medium mb-2">Form Tips</h4>
            <ul className="space-y-1">
              {tips.map((t, i) => (
                <li key={i} className="text-sm text-[var(--wk-muted)]">• {t}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomExerciseForm({
  initial,
  onClose,
  onSave,
}: {
  initial: CustomExercise | null;
  onClose: () => void;
  onSave: (data: Omit<CustomExercise, 'id'>) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [muscle, setMuscle] = useState<MuscleGroup>(initial?.muscle ?? 'Chest');
  const [secondary, setSecondary] = useState<MuscleGroup | ''>(initial?.secondary ?? '');
  const [equipment, setEquipment] = useState(initial?.equipment ?? 'Dumbbell');
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? 'Beginner');
  const [variations, setVariations] = useState<string[]>(initial?.variations ?? ['Standard']);
  const [newVar, setNewVar] = useState('');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const muscles: MuscleGroup[] = ['Chest', 'Back', 'Shoulders', 'Triceps', 'Biceps', 'Legs', 'Core'];

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="wk-card p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="wk-heading text-xl font-bold mb-4">{initial ? 'Edit' : 'Add'} Custom Exercise</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[var(--wk-muted)]">Name</label>
            <input className="wk-input mt-1" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--wk-muted)]">Primary Muscle</label>
              <select className="wk-input mt-1" value={muscle} onChange={(e) => setMuscle(e.target.value as MuscleGroup)}>
                {muscles.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--wk-muted)]">Secondary Muscle</label>
              <select className="wk-input mt-1" value={secondary} onChange={(e) => setSecondary(e.target.value as MuscleGroup | '')}>
                <option value="">None</option>
                {muscles.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--wk-muted)]">Equipment</label>
              <input className="wk-input mt-1" value={equipment} onChange={(e) => setEquipment(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-[var(--wk-muted)]">Difficulty</label>
              <select className="wk-input mt-1" value={difficulty} onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}>
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-[var(--wk-muted)]">Variations</label>
            <div className="flex flex-wrap gap-1 mt-1">
              {variations.map((v, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded bg-[var(--wk-surface)] flex items-center gap-1">
                  {v}
                  <button type="button" onClick={() => setVariations(variations.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <input className="wk-input flex-1" placeholder="Add variation" value={newVar} onChange={(e) => setNewVar(e.target.value)} />
              <button type="button" className="wk-btn-secondary text-sm" onClick={() => { if (newVar.trim()) { setVariations([...variations, newVar.trim()]); setNewVar(''); } }}>Add</button>
            </div>
          </div>
          <div>
            <label className="text-xs text-[var(--wk-muted)]">Notes</label>
            <textarea className="wk-input mt-1 min-h-[60px]" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button type="button" className="wk-btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="wk-btn-primary flex-1"
            onClick={() => {
              if (!name.trim()) return;
              onSave({
                name: name.trim(),
                muscle,
                secondary: secondary || undefined,
                equipment,
                difficulty,
                variations: variations.length ? variations : ['Standard'],
                notes,
              });
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
