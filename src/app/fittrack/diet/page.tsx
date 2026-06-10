'use client';

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageTransition } from '@/components/workout/PageTransition';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { DietPageHeader } from '@/components/nutrition/DietPageHeader';
import { NutritionCalorieRing } from '@/components/nutrition/NutritionCalorieRing';
import { MacroProgressBars } from '@/components/nutrition/MacroProgressBars';
import { MicronutrientGrid } from '@/components/nutrition/MicronutrientGrid';
import { WeightProgressCard } from '@/components/nutrition/WeightProgressCard';
import { NutritionStatCards } from '@/components/nutrition/NutritionStatCards';
import { SuggestionChips } from '@/components/nutrition/SuggestionChips';
import { MealSectionCard } from '@/components/nutrition/MealSectionCard';
import { WeeklyCalorieChart } from '@/components/nutrition/WeeklyCalorieChart';
import { AddFoodSheet } from '@/components/nutrition/AddFoodSheet';
import { EditFoodEntrySheet } from '@/components/nutrition/EditFoodEntrySheet';
import { FoodSearchBar } from '@/components/nutrition/FoodSearchBar';
import { MobileDietSummary } from '@/components/nutrition/MobileDietSummary';
import { DietQuickAdd } from '@/components/nutrition/DietQuickAdd';
import { useDietTracker } from '@/hooks/useDietTracker';
import { groupEntriesByMeal } from '@/lib/nutrition/nutritionUtils';
import type { FoodSuggestion } from '@/lib/nutrition/nutritionSuggestions';
import type { FoodItem, MealSlot, NutritionLogEntry } from '@/types/nutrition';
import { MEAL_SLOT_ORDER } from '@/types/nutrition';
import { useWorkoutStore } from '@/workout/WorkoutContext';
import dayjs from 'dayjs';

const MOBILE_MEAL_ORDER: MealSlot[] = ['breakfast', 'lunch', 'snack', 'dinner'];

export default function DietPage() {
  const { bodyStats } = useWorkoutStore();
  const {
    dateKey,
    timezone,
    entries,
    totals,
    targets,
    coverage,
    suggestions,
    customFoods,
    weeklyLogs,
    streak,
    surplusAvg,
    weightProjection,
    currentWeight,
    caloriesLeft,
    proteinLeft,
    settings,
    nutritionTargets,
    loading,
    actionLoading,
    error,
    uid,
    isToday,
    goToPrevDay,
    goToNextDay,
    logFood,
    logCustomFood,
    removeEntry,
    editEntry,
  } = useDietTracker();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMealSlot, setSheetMealSlot] = useState<MealSlot>('breakfast');
  const [sheetSearchQuery, setSheetSearchQuery] = useState('');
  const [sheetFoodId, setSheetFoodId] = useState<string | null>(null);
  const [pageSearchQuery, setPageSearchQuery] = useState('');
  const [activeMealTab, setActiveMealTab] = useState<MealSlot>('breakfast');
  const [editingEntry, setEditingEntry] = useState<NutritionLogEntry | null>(null);

  const mealGroups = useMemo(() => groupEntriesByMeal(entries), [entries]);

  const monthlyDelta = useMemo(() => {
    const monthAgo = dayjs().subtract(30, 'day').format('YYYY-MM-DD');
    const old = [...bodyStats]
      .filter((s) => s.date <= monthAgo)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    if (!old) return undefined;
    return Math.round((currentWeight - old.weight) * 10) / 10;
  }, [bodyStats, currentWeight]);

  const openSheet = (opts?: { slot?: MealSlot; search?: string; foodId?: string }) => {
    const meal = opts?.slot ?? activeMealTab;
    setSheetMealSlot(meal);
    setActiveMealTab(meal);
    setSheetSearchQuery(opts?.search ?? pageSearchQuery);
    setSheetFoodId(opts?.foodId ?? null);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setSheetFoodId(null);
    setSheetSearchQuery('');
  };

  const handleLogFood = async (food: FoodItem, mealSlot: MealSlot, servings: number) => {
    if (!uid) {
      toast.error('Please sign in to log food');
      throw new Error('Not signed in');
    }
    await logFood(food, mealSlot, servings, !!food.isCustom);
    toast.success(`Added ${servings}× ${food.name}`);
  };

  const handleQuickAdd = (food: FoodItem) => {
    openSheet({ foodId: food.id });
  };

  const handleSuggestion = (s: FoodSuggestion) => {
    openSheet({ foodId: s.food.id });
  };

  const handleRemove = async (entryId: string) => {
    try {
      await removeEntry(entryId);
      toast.success('Removed');
    } catch {
      toast.error('Could not remove');
    }
  };

  const handleSaveEdit = async (
    entryId: string,
    servings: number,
    nutrients: NutritionLogEntry['nutrients']
  ) => {
    try {
      await editEntry(entryId, { servings, nutrients });
      toast.success('Updated');
    } catch {
      toast.error('Could not update');
      throw new Error('update failed');
    }
  };

  const openSearch = () => {
    openSheet({ search: pageSearchQuery });
  };

  return (
    <PageTransition>
      <div className="ft-diet-page space-y-4 md:space-y-6 max-w-6xl mx-auto pb-24 md:pb-8">
        <DietPageHeader
          dateKey={dateKey}
          timezone={timezone}
          isToday={isToday}
          onPrevDay={goToPrevDay}
          onNextDay={goToNextDay}
          onLogMeal={() => openSheet()}
        />

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoadingSpinner />
            <span>Syncing…</span>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
            {error}
          </div>
        )}

        {/* Search bar — tap opens full food picker */}
        <FoodSearchBar
          value={pageSearchQuery}
          onChange={setPageSearchQuery}
          onFocus={openSearch}
          onClick={openSearch}
        />

        <div className="lg:hidden space-y-4">
          <MobileDietSummary
            totals={totals}
            targets={targets}
            caloriesLeft={caloriesLeft}
            proteinLeft={proteinLeft}
            coverage={coverage}
          />

          <div className="space-y-2">
            <p className="text-sm font-semibold">Log food for</p>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {MOBILE_MEAL_ORDER.map((slot) => {
                const count = mealGroups[slot].length;
                const kcal = mealGroups[slot].reduce((s, e) => s + e.nutrients.calories, 0);
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setActiveMealTab(slot)}
                    className={`shrink-0 rounded-xl px-3 py-2 min-h-[48px] text-left border transition-colors ${
                      activeMealTab === slot
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-muted/20'
                    }`}
                  >
                    <span className="text-xs font-semibold block capitalize">
                      {slot === 'snack' ? 'Snacks' : slot}
                    </span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {count > 0 ? `${kcal} kcal` : 'Empty'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <DietQuickAdd onAdd={handleQuickAdd} disabled={actionLoading} />

          <MealSectionCard
            mealSlot={activeMealTab}
            entries={mealGroups[activeMealTab]}
            onAddFood={(slot) => openSheet({ slot })}
            onEditEntry={setEditingEntry}
            onRemove={(id) => void handleRemove(id)}
            disabled={actionLoading}
          />

          {suggestions.length > 0 && (
            <SuggestionChips
              suggestions={suggestions}
              onSelect={handleSuggestion}
              disabled={actionLoading}
            />
          )}

          <details className="ft-card ft-card-padded group">
            <summary className="font-semibold text-sm cursor-pointer list-none flex items-center justify-between">
              More stats & chart
              <span className="text-xs text-muted-foreground group-open:hidden">Show</span>
            </summary>
            <div className="mt-4 space-y-4 pt-4 border-t border-border/40">
              <NutritionStatCards
                caloriesLeft={caloriesLeft}
                calorieTarget={targets.calories}
                proteinLeft={proteinLeft}
                proteinTarget={targets.proteinG}
                streak={streak}
                surplusAvg={surplusAvg}
              />
              <MicronutrientGrid coverage={coverage} />
              <WeightProgressCard
                currentKg={currentWeight}
                targetKg={settings?.targetWeightKg ?? nutritionTargets?.targetWeightKg ?? 75}
                monthlyDelta={monthlyDelta}
                projectionLabel={weightProjection?.label}
              />
              <WeeklyCalorieChart
                logs={weeklyLogs}
                currentDateKey={dateKey}
                targetCalories={targets.calories}
              />
            </div>
          </details>
        </div>

        <div className="hidden lg:grid lg:grid-cols-[minmax(280px,320px)_1fr] gap-6 items-start">
          <aside className="lg:sticky lg:top-20 space-y-4">
            <div className="ft-card ft-card-padded space-y-6">
              <NutritionCalorieRing eaten={totals.calories} target={targets.calories} size={180} />
              <MacroProgressBars totals={totals} targets={targets} />
              <MicronutrientGrid coverage={coverage} />
              <WeightProgressCard
                currentKg={currentWeight}
                targetKg={settings?.targetWeightKg ?? nutritionTargets?.targetWeightKg ?? 75}
                monthlyDelta={monthlyDelta}
                projectionLabel={weightProjection?.label}
              />
            </div>
          </aside>

          <div className="space-y-5 min-w-0">
            <NutritionStatCards
              caloriesLeft={caloriesLeft}
              calorieTarget={targets.calories}
              proteinLeft={proteinLeft}
              proteinTarget={targets.proteinG}
              streak={streak}
              surplusAvg={surplusAvg}
            />
            <SuggestionChips
              suggestions={suggestions}
              onSelect={handleSuggestion}
              disabled={actionLoading}
            />
            <section className="space-y-3">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Today&apos;s meals
              </h2>
              <div className="space-y-3">
                {MEAL_SLOT_ORDER.map((slot) => (
                  <MealSectionCard
                    key={slot}
                    mealSlot={slot}
                    entries={mealGroups[slot]}
                    onAddFood={(s) => openSheet({ slot: s })}
                    onEditEntry={setEditingEntry}
                    onRemove={(id) => void handleRemove(id)}
                    disabled={actionLoading}
                  />
                ))}
              </div>
            </section>
            <WeeklyCalorieChart
              logs={weeklyLogs}
              currentDateKey={dateKey}
              targetCalories={targets.calories}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => openSheet({ slot: activeMealTab })}
          className="lg:hidden fixed bottom-20 right-4 z-40 ft-btn ft-btn--primary rounded-full h-14 w-14 shadow-lg flex items-center justify-center p-0"
          aria-label="Add food"
        >
          <Plus className="h-6 w-6" />
        </button>

        <AddFoodSheet
          open={sheetOpen}
          initialMealSlot={sheetMealSlot}
          initialSearchQuery={sheetSearchQuery}
          initialFoodId={sheetFoodId}
          customFoods={customFoods}
          onClose={closeSheet}
          onLogFood={handleLogFood}
          onLogCustom={async (name, nutrients, mealSlot, saveTemplate) => {
            if (!uid) {
              toast.error('Please sign in to log food');
              throw new Error('Not signed in');
            }
            await logCustomFood(name, nutrients, mealSlot, saveTemplate);
            toast.success(`Added ${name}`);
          }}
          disabled={actionLoading}
        />

        <EditFoodEntrySheet
          entry={editingEntry}
          open={!!editingEntry}
          onClose={() => setEditingEntry(null)}
          onSave={handleSaveEdit}
          onDelete={handleRemove}
          disabled={actionLoading}
        />
      </div>
    </PageTransition>
  );
}
