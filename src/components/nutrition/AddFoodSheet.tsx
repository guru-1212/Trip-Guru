'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, X, Sparkles, Leaf, Zap, IndianRupee } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  QUICK_ADD_FOOD_IDS,
  getFoodById,
  searchFoods,
} from '@/lib/nutrition/indianFoodDatabase';
import type { FoodItem, MealSlot, NutrientsPerServing } from '@/types/nutrition';
import { MEAL_SLOT_LABELS } from '@/types/nutrition';
import { EMPTY_NUTRIENTS } from '@/types/nutrition';
import { scaleNutrients } from '@/lib/nutrition/nutritionCalculators';

type Tab = 'foods' | 'custom';
type SmartFilter = 'all' | 'high-protein' | 'low-cal' | 'veg' | 'cheap';

const PRIMARY_MEALS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const EXTRA_MEALS: MealSlot[] = ['pre_workout', 'post_workout'];
const SERVING_PRESETS = [0.5, 1, 1.5, 2, 3];

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'custom', label: 'My Foods' },
  { id: 'protein', label: 'Protein' },
  { id: 'staple', label: 'Rice/Roti' },
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'dal', label: 'Dal' },
  { id: 'fruit', label: 'Fruit' },
  { id: 'snack', label: 'Snack' },
];

const SMART_FILTERS: { id: SmartFilter; label: string; icon: any }[] = [
  { id: 'high-protein', label: 'Protein Rich', icon: Zap },
  { id: 'low-cal', label: 'Low Calorie', icon: Sparkles },
  { id: 'veg', label: 'Veg Only', icon: Leaf },
  { id: 'cheap', label: 'Budget Friendly', icon: IndianRupee },
];

interface AddFoodSheetProps {
  open: boolean;
  initialMealSlot?: MealSlot;
  initialSearchQuery?: string;
  initialFoodId?: string | null;
  initialTab?: Tab;
  customFoods?: FoodItem[];
  globalFoods?: FoodItem[];
  onClose: () => void;
  onLogFood: (food: FoodItem, mealSlot: MealSlot, servings: number) => Promise<void>;
  onLogCustom: (
    name: string,
    nutrients: NutrientsPerServing,
    mealSlot: MealSlot,
    saveTemplate: boolean,
    servings: number,
    servingLabel: string
  ) => Promise<void>;
  disabled?: boolean;
}

export function AddFoodSheet({
  open,
  initialMealSlot = 'breakfast',
  initialSearchQuery = '',
  initialFoodId = null,
  initialTab = 'foods',
  customFoods = [],
  globalFoods = [],
  onClose,
  onLogFood,
  onLogCustom,
  disabled,
}: AddFoodSheetProps) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('foods');
  const [mealSlot, setMealSlot] = useState<MealSlot>(initialMealSlot);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [smartFilter, setSmartFilter] = useState<SmartFilter>('all');
  const [servings, setServings] = useState(1);
  const [grams, setGrams] = useState<string>('');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);

  // Custom food states
  const [customName, setCustomName] = useState('');
  const [customServingLabel, setCustomServingLabel] = useState('1 piece');
  const [customCalories, setCustomCalories] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFat, setCustomFat] = useState('');
  const [customFiber, setCustomFiber] = useState('');
  const [customCalcium, setCustomCalcium] = useState('');
  const [customIron, setCustomIron] = useState('');
  const [customMagnesium, setCustomMagnesium] = useState('');
  const [customPotassium, setCustomPotassium] = useState('');
  const [customSodium, setCustomSodium] = useState('');
  const [customServings, setCustomServings] = useState(1);

  const [saveTemplate, setSaveTemplate] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showExtraMeals, setShowExtraMeals] = useState(
    EXTRA_MEALS.includes(initialMealSlot)
  );

  useEffect(() => {
    if (open) {
      setMealSlot(initialMealSlot);
      setShowExtraMeals(EXTRA_MEALS.includes(initialMealSlot));
      setServings(1);
      setQuery(initialSearchQuery);
      setCategory('all');
      setSmartFilter('all');
      setTab(initialTab ?? 'foods');
      const preselect = initialFoodId ? getFoodById(initialFoodId) ?? null : null;
      setSelectedFood(preselect);
      if (!preselect) {
        setTimeout(() => searchRef.current?.focus(), 100);
      }
    }
  }, [open, initialMealSlot, initialSearchQuery, initialFoodId]);

  const quickFoods = useMemo(
    () => QUICK_ADD_FOOD_IDS.map((id) => getFoodById(id)).filter(Boolean) as FoodItem[],
    []
  );

  const results = useMemo(() => {
    const staticResults = searchFoods(query, category === 'all' ? undefined : category);
    const customResults = customFoods.filter((f) => {
      if (category !== 'all' && category !== 'custom') return false;
      return !query || matchesQuerySimple(f.name, query);
    });
    const globalResults = globalFoods.filter((f) => {
      if (category !== 'all' && category !== f.category) return false;
      return !query || matchesQuerySimple(f.name, query);
    });

    let combined = [...customResults, ...globalResults, ...staticResults];

    // Apply Smart Filters
    if (smartFilter === 'high-protein') {
      combined = combined.filter((f) => f.nutrients.proteinG > 15);
    } else if (smartFilter === 'low-cal') {
      combined = combined.filter((f) => f.nutrients.calories < 100);
    } else if (smartFilter === 'veg') {
      combined = combined.filter((f) => f.tags.includes('veg'));
    } else if (smartFilter === 'cheap') {
      combined = combined.filter((f) => (f.price || 0) > 0 && (f.price || 0) < 50);
    }

    const seen = new Set();
    return combined.filter((f) => {
      if (seen.has(f.id)) return false;
      seen.add(f.id);
      return true;
    });
  }, [query, category, smartFilter, customFoods, globalFoods]);

  const previewNutrients = useMemo(() => {
    if (!selectedFood) return null;
    return scaleNutrients(selectedFood.nutrients, servings);
  }, [selectedFood, servings]);

  const reset = () => {
    setQuery('');
    setSelectedFood(null);
    setServings(1);
    setGrams('');
    setCustomName('');
    setCustomServingLabel('1 piece');
    setCustomCalories('');
    setCustomProtein('');
    setCustomCarbs('');
    setCustomFat('');
    setCustomFiber('');
    setCustomCalcium('');
    setCustomIron('');
    setCustomMagnesium('');
    setCustomPotassium('');
    setCustomSodium('');
    setCustomServings(1);
    setSaveTemplate(false);
    setTab('foods');
    setCategory('all');
    setSmartFilter('all');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const selectFood = (food: FoodItem) => {
    setSelectedFood(food);
    setServings(1);
    if (food.servingGrams) {
      setGrams(String(food.servingGrams));
    } else {
      setGrams('');
    }
  };

  const onGramsChange = (val: string) => {
    setGrams(val);
    const g = parseFloat(val);
    if (!isNaN(g) && selectedFood?.servingGrams) {
      setServings(g / selectedFood.servingGrams);
    }
  };

  const onServingsChange = (s: number) => {
    setServings(s);
    if (selectedFood?.servingGrams) {
      setGrams(String(Math.round(s * selectedFood.servingGrams)));
    }
  };

  const handleConfirmAdd = async () => {
    if (!selectedFood) return;
    setSubmitting(true);
    try {
      await onLogFood(selectedFood, mealSlot, servings);
      handleClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCustomSubmit = async () => {
    setSubmitting(true);
    try {
      const nutrients: NutrientsPerServing = {
        ...EMPTY_NUTRIENTS,
        calories: Number(customCalories) || 0,
        proteinG: Number(customProtein) || 0,
        carbsG: Number(customCarbs) || 0,
        fatG: Number(customFat) || 0,
        fiberG: Number(customFiber) || 0,
        calciumMg: Number(customCalcium) || 0,
        ironMg: Number(customIron) || 0,
        magnesiumMg: Number(customMagnesium) || 0,
        potassiumMg: Number(customPotassium) || 0,
        sodiumMg: Number(customSodium) || 0,
      };
      await onLogCustom(
        customName || 'Custom meal',
        nutrients,
        mealSlot,
        saveTemplate,
        customServings,
        customServingLabel
      );
      handleClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const mealSlots = showExtraMeals ? [...PRIMARY_MEALS, ...EXTRA_MEALS] : PRIMARY_MEALS;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end sm:justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
        aria-label="Close"
      />
      <div
        className={cn(
          'relative z-10 w-full sm:max-w-lg overflow-hidden rounded-t-2xl sm:rounded-2xl bg-card border border-border shadow-xl flex flex-col',
          selectedFood ? 'max-h-[92vh]' : 'max-h-[92vh] sm:max-h-[85vh]'
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <h2 className="font-semibold text-base">
            {selectedFood ? 'Set quantity' : 'Add food'}
          </h2>
          <button
            type="button"
            onClick={selectedFood ? () => setSelectedFood(null) : handleClose}
            className="p-2 -mr-2 rounded-full hover:bg-muted min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!selectedFood && (
          <>
            <div className="px-4 py-3 border-b border-border/40 shrink-0 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Meal
              </p>
              <div className="flex flex-wrap gap-2">
                {mealSlots.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setMealSlot(s)}
                    className={cn(
                      'px-3 py-2 rounded-full text-sm font-medium min-h-[40px]',
                      mealSlot === s
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/60'
                    )}
                  >
                    {MEAL_SLOT_LABELS[s]}
                  </button>
                ))}
              </div>
              {!showExtraMeals && (
                <button
                  type="button"
                  onClick={() => setShowExtraMeals(true)}
                  className="text-xs text-primary font-medium"
                >
                  + Pre/post workout
                </button>
              )}
            </div>

            <div className="px-4 pt-3 flex gap-2 shrink-0">
              {(['foods', 'custom'] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl text-sm font-medium min-h-[44px]',
                    tab === t ? 'bg-primary text-primary-foreground' : 'bg-muted/50'
                  )}
                >
                  {t === 'foods' ? 'Search foods' : 'Hostel / Custom'}
                </button>
              ))}
            </div>
          </>
        )}

        {selectedFood ? (
          <div className="px-4 py-6 space-y-6 flex-1 overflow-y-auto">
            <div className="text-center">
              <p className="text-lg font-black tracking-tight">{selectedFood.name}</p>
              <p className="text-sm text-muted-foreground font-medium">{selectedFood.servingLabel}</p>
              {previewNutrients && (
                <div className="flex items-center justify-center gap-2 mt-3">
                   <div className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-sm font-black tabular-nums">
                      {previewNutrients.calories} kcal
                   </div>
                   <div className="px-3 py-1.5 rounded-xl bg-muted text-muted-foreground text-sm font-black tabular-nums">
                      {previewNutrients.proteinG}g protein
                   </div>
                </div>
              )}
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-4">
                Adding to {MEAL_SLOT_LABELS[mealSlot]}
              </p>
            </div>

            <div className="space-y-6 max-w-xs mx-auto">
              {selectedFood.servingGrams && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                    Quantity (grams)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="decimal"
                      className="ft-input w-full h-14 text-xl font-black pr-12 text-center"
                      placeholder="Grams"
                      value={grams}
                      onChange={(e) => onGramsChange(e.target.value)}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-muted-foreground">g</span>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 block text-center">
                  Or adjust servings
                </label>
                <div className="flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => onServingsChange(Math.max(0.1, Math.round((servings - 0.1) * 10) / 10))}
                    className="h-14 w-14 rounded-2xl border-2 border-border flex items-center justify-center text-2xl font-black hover:bg-muted active:scale-90 transition-all"
                  >
                    −
                  </button>
                  <div className="flex flex-col items-center min-w-[80px]">
                    <span className="text-3xl font-black tabular-nums tracking-tighter">
                      {Math.round(servings * 10) / 10}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground -mt-1">servings</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onServingsChange(Math.round((servings + 0.1) * 10) / 10)}
                    className="h-14 w-14 rounded-2xl border-2 border-border flex items-center justify-center text-2xl font-black hover:bg-muted active:scale-90 transition-all"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 justify-center pt-2">
                {SERVING_PRESETS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onServingsChange(s)}
                    className={cn(
                      'px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all',
                      servings === s 
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105' 
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {s}×
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
            {tab === 'foods' ? (
              <>
                <div className="relative sticky top-0 bg-card z-10 pb-2 space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      ref={searchRef}
                      type="search"
                      className="ft-input w-full pl-9 text-base min-h-[48px]"
                      placeholder="Search — rice, annam, egg, paneer, dal…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                      {CATEGORIES.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setCategory(c.id)}
                          className={cn(
                            'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border min-h-[32px] transition-all',
                            category === c.id
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-border bg-muted/20 hover:border-primary/40'
                          )}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide border-t border-border/40 pt-2">
                      <button
                        type="button"
                        onClick={() => setSmartFilter('all')}
                        className={cn(
                          'shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border min-h-[28px] transition-all',
                          smartFilter === 'all'
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border text-muted-foreground bg-muted/10'
                        )}
                      >
                        All
                      </button>
                      {SMART_FILTERS.map((f) => {
                        const Icon = f.icon;
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setSmartFilter(f.id)}
                            className={cn(
                              'shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border min-h-[28px] transition-all flex items-center gap-1.5',
                              smartFilter === f.id
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border text-muted-foreground bg-muted/10 hover:border-primary/40'
                            )}
                          >
                            <Icon className="h-3 w-3" />
                            {f.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {!query && category === 'all' && smartFilter === 'all' && (
                  <div className="grid grid-cols-4 gap-2">
                    {quickFoods.map((food) => (
                      <button
                        key={food.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => selectFood(food)}
                        className="rounded-xl border border-border bg-muted/20 p-2 text-center min-h-[64px] active:bg-primary/10 transition-colors"
                      >
                        <span className="text-[11px] font-semibold leading-tight block line-clamp-2">
                          {food.name.split(' ')[0]}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {food.nutrients.calories} kcal
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {results.length === 0 ? (
                  <div className="text-center py-12 space-y-2">
                    <div className="w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center mx-auto text-muted-foreground">
                      <Search className="h-6 w-6" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">
                      {query ? 'No foods found matching your search.' : 'Try searching for rice, egg, or chicken.'}
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-1 pb-4">
                    {results.slice(0, 40).map((food) => (
                      <li key={food.id}>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => selectFood(food)}
                          className="w-full text-left px-3 py-3 rounded-xl min-h-[56px] active:bg-primary/10 flex items-center justify-between gap-3 border border-transparent hover:border-border/60 transition-all group"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm group-hover:text-primary transition-colors truncate">{food.name}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                {food.servingLabel} · {food.nutrients.proteinG}g protein
                              </span>
                              {food.tags.includes('veg') && (
                                <Leaf className="h-3 w-3 text-emerald-500 shrink-0" />
                              )}
                              {food.price && (
                                <span className="text-[10px] text-amber-600 font-black shrink-0 bg-amber-50 px-1 rounded">
                                  ₹{food.price}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-sm font-black tabular-nums text-primary block">
                              {food.nutrients.calories}
                            </span>
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground -mt-1 block">kcal</span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <div className="space-y-4 pb-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Basic Info
                  </p>
                  <input
                    className="ft-input w-full text-base min-h-[48px]"
                    placeholder="Food name (e.g. Uttapam)"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                  />
                  <input
                    className="ft-input w-full text-base min-h-[48px]"
                    placeholder="Serving size (e.g. 1 piece, 100g)"
                    value={customServingLabel}
                    onChange={(e) => setCustomServingLabel(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Nutrients (per {customServingLabel || 'serving'})
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-muted-foreground px-1">Calories (kcal)</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        className="ft-input w-full min-h-[48px] text-base"
                        placeholder="Calories"
                        value={customCalories}
                        onChange={(e) => setCustomCalories(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-muted-foreground px-1">Protein (g)</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        className="ft-input w-full min-h-[48px] text-base"
                        placeholder="Protein (g)"
                        value={customProtein}
                        onChange={(e) => setCustomProtein(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-muted-foreground px-1">Carbs (g)</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        className="ft-input w-full min-h-[48px] text-base"
                        placeholder="Carbs (g)"
                        value={customCarbs}
                        onChange={(e) => setCustomCarbs(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-muted-foreground px-1">Fat (g)</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        className="ft-input w-full min-h-[48px] text-base"
                        placeholder="Fat (g)"
                        value={customFat}
                        onChange={(e) => setCustomFat(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-muted-foreground px-1">Fiber (g)</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        className="ft-input w-full min-h-[48px] text-base"
                        placeholder="Fiber (g)"
                        value={customFiber}
                        onChange={(e) => setCustomFiber(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-muted-foreground px-1">Sodium (mg)</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        className="ft-input w-full min-h-[48px] text-base"
                        placeholder="Sodium (mg)"
                        value={customSodium}
                        onChange={(e) => setCustomSodium(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Minerals (mg)
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-muted-foreground px-1">Calcium</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        className="ft-input w-full min-h-[48px] text-base"
                        placeholder="Calcium"
                        value={customCalcium}
                        onChange={(e) => setCustomCalcium(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-muted-foreground px-1">Iron</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        className="ft-input w-full min-h-[48px] text-base"
                        placeholder="Iron"
                        value={customIron}
                        onChange={(e) => setCustomIron(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-muted-foreground px-1">Magnesium</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        className="ft-input w-full min-h-[48px] text-base"
                        placeholder="Magnesium"
                        value={customMagnesium}
                        onChange={(e) => setCustomMagnesium(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-muted-foreground px-1">Potassium</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        className="ft-input w-full min-h-[48px] text-base"
                        placeholder="Potassium"
                        value={customPotassium}
                        onChange={(e) => setCustomPotassium(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">How many {customServingLabel || 'servings'}?</p>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setCustomServings((s) => Math.max(0.5, Math.round((s - 0.5) * 2) / 2))}
                        className="h-10 w-10 rounded-full border flex items-center justify-center font-bold"
                      >
                        −
                      </button>
                      <span className="text-lg font-bold tabular-nums w-10 text-center">{customServings}</span>
                      <button
                        type="button"
                        onClick={() => setCustomServings((s) => Math.round((s + 0.5) * 2) / 2)}
                        className="h-10 w-10 rounded-full border flex items-center justify-center font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <label className="flex items-center gap-3 text-sm font-medium">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      checked={saveTemplate}
                      onChange={(e) => setSaveTemplate(e.target.checked)}
                    />
                    Save as food template for reuse
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="px-4 py-3 pb-6 border-t border-border shrink-0 bg-card">
          {selectedFood ? (
            <button
              type="button"
              disabled={disabled || submitting}
              onClick={() => void handleConfirmAdd()}
              className="ft-btn ft-btn--primary w-full min-h-[52px] text-base"
            >
              {submitting ? 'Adding…' : `Add ${servings}× to ${MEAL_SLOT_LABELS[mealSlot]}`}
            </button>
          ) : tab === 'custom' ? (
            <button
              type="button"
              disabled={disabled || submitting || !customCalories || !customName}
              onClick={() => void handleCustomSubmit()}
              className="ft-btn ft-btn--primary w-full min-h-[52px] flex items-center justify-center gap-2"
            >
              <Plus className="h-5 w-5" />
              {submitting ? 'Saving…' : `Add ${customServings}× to ${MEAL_SLOT_LABELS[mealSlot]}`}
            </button>
          ) : (
            <p className="text-xs text-center text-muted-foreground">
              Select a food, then set quantity
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function matchesQuerySimple(name: string, query: string): boolean {
  return name.toLowerCase().includes(query.trim().toLowerCase());
}
