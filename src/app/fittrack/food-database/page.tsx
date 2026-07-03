'use client';

import { useEffect, useState, useMemo } from 'react';
import { 
  Search, 
  Upload, 
  Trash2, 
  Edit2,
  AlertTriangle, 
  CheckCircle2, 
  FileJson, 
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Plus,
  Copy,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Link from 'next/link';

import { 
  getGlobalFoods, 
  uploadGlobalFoods, 
  deleteGlobalFood,
  updateGlobalFood
} from '@/firebase/firestore';
import type { FoodItem, FoodCategory, FoodTag } from '@/types/nutrition';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const CATEGORIES: FoodCategory[] = [
  'protein', 'staple', 'dairy', 'fruit', 'nut', 'snack', 'breakfast', 'dal', 'beverage', 'supplement', 'custom'
];

const DATABASE_IMPORT_PROMPT = `You are an expert nutritionist and diet planner. I need to add high-quality food data to my website's database. Please provide a JSON array of food objects.

**Required JSON Structure:**
[
  {
    "name": "Food Name",
    "category": "protein", 
    "servingLabel": "100g",
    "servingGrams": 100,
    "calories": 250,
    "proteinG": 20,
    "carbsG": 5,
    "fatG": 15,
    "fiberG": 2,
    "calciumMg": 20,
    "ironMg": 1.5,
    "magnesiumMg": 10,
    "potassiumMg": 150,
    "sodiumMg": 50,
    "tags": ["veg", "protein_rich"],
    "price": 45
  }
]

**Guidelines:**
1. Categories must be one of: protein, staple, dairy, fruit, nut, snack, breakfast, dal, beverage, supplement.
2. Tags can include: veg, egg, non_veg, protein_rich, staple, snack.
3. Standardize to 100g or 1 serving sizes.
4. Ensure all nutrient values are numbers.
5. "price" should be an estimated cost per serving in INR.

Please generate 10-15 popular items for [INSERT DIET TYPE HERE, e.g., Indian Vegetarian / Keto / High Protein].`;

export default function FoodDatabasePage() {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSmartFilter, setActiveSmartFilter] = useState<'all' | 'high-protein' | 'high-calorie' | 'low-calorie' | 'cheap'>('all');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isTextImportOpen, setIsTextImportOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  const [textInput, setTextInput] = useState('');
  const [checkResults, setCheckResults] = useState<{name: string, found: boolean, food?: FoodItem}[]>([]);
  const [importMode, setImportMode] = useState<'upload' | 'check'>('check');
  const [pendingItems, setPendingItems] = useState<FoodItem[]>([]);
  const [duplicates, setDuplicates] = useState<FoodItem[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Edit state
  const [editingFood, setEditingFood] = useState<FoodItem | null>(null);
  const [editForm, setEditForm] = useState<Partial<FoodItem>>({});

  useEffect(() => {
    loadFoods();
  }, []);

  async function loadFoods() {
    try {
      setLoading(true);
      const data = await getGlobalFoods();
      setFoods(data);
    } catch (err) {
      toast.error('Failed to load food database');
    } finally {
      setLoading(false);
    }
  }

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(DATABASE_IMPORT_PROMPT);
      toast.success('AI Prompt copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleTextImport = () => {
    if (!textInput.trim()) {
      toast.error('Please paste some text first');
      return;
    }

    if (importMode === 'upload') {
      try {
        const items = JSON.parse(textInput);
        processItems(Array.isArray(items) ? items : [items]);
        setIsTextImportOpen(false);
      } catch (err) {
        toast.error('Invalid JSON format');
      }
    } else {
      // Diet Check Mode
      const lines = textInput.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const results = lines.map(line => {
        // Simple name matching
        const name = line.split(/[-:]/)[0].trim();
        const found = foods.find(f => f.name.toLowerCase() === name.toLowerCase());
        return { name, found: !!found, food: found };
      });
      setCheckResults(results);
    }
  };

  const filteredFoods = useMemo(() => {
    const q = searchQuery.toLowerCase();
    let result = foods.filter(f => 
      f.name.toLowerCase().includes(q) || 
      f.category.toLowerCase().includes(q) ||
      f.id.toLowerCase().includes(q)
    );

    if (activeSmartFilter === 'high-protein') {
      result = result.filter(f => f.nutrients.proteinG > 15);
    } else if (activeSmartFilter === 'high-calorie') {
      result = result.filter(f => f.nutrients.calories > 350);
    } else if (activeSmartFilter === 'low-calorie') {
      result = result.filter(f => f.nutrients.calories < 100);
    } else if (activeSmartFilter === 'cheap') {
      result = result.filter(f => (f.price || 0) > 0 && (f.price || 0) < 50);
    }

    return result;
  }, [foods, searchQuery, activeSmartFilter]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        let items: any[] = [];

        if (file.name.endsWith('.json')) {
          items = JSON.parse(data as string);
        } else {
          const XLSX = await import('xlsx');
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          items = XLSX.utils.sheet_to_json(sheet);
        }

        processItems(items);
      } catch (err) {
        toast.error('Invalid file format');
      }
    };

    if (file.name.endsWith('.json')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  const processItems = (rawItems: any[]) => {
    const mapped: FoodItem[] = rawItems.map(item => ({
      id: item.id || `food_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: item.name || 'Unknown Food',
      servingLabel: item.servingLabel || '100 g',
      servingGrams: Number(item.servingGrams) || 100,
      category: (item.category as FoodCategory) || 'custom',
      tags: Array.isArray(item.tags) ? item.tags : (item.tags?.split(',').map((t: string) => t.trim()) || []),
      price: Number(item.price || 0),
      nutrients: {
        calories: Number(item.calories ?? item.nutrients?.calories ?? 0),
        proteinG: Number(item.proteinG ?? item.nutrients?.proteinG ?? 0),
        carbsG: Number(item.carbsG ?? item.nutrients?.carbsG ?? 0),
        fatG: Number(item.fatG ?? item.nutrients?.fatG ?? 0),
        fiberG: Number(item.fiberG ?? item.nutrients?.fiberG ?? 0),
        calciumMg: Number(item.calciumMg ?? item.nutrients?.calciumMg ?? 0),
        ironMg: Number(item.ironMg ?? item.nutrients?.ironMg ?? 0),
        magnesiumMg: Number(item.magnesiumMg ?? item.nutrients?.magnesiumMg ?? 0),
        potassiumMg: Number(item.potassiumMg ?? item.nutrients?.potassiumMg ?? 0),
        sodiumMg: Number(item.sodiumMg ?? item.nutrients?.sodiumMg ?? 0),
      }
    }));

    const dups = mapped.filter(item => foods.some(f => f.id === item.id || f.name.toLowerCase() === item.name.toLowerCase()));
    
    setPendingItems(mapped);
    if (dups.length > 0) {
      setDuplicates(dups);
      setIsConfirmOpen(true);
    } else {
      confirmUpload(mapped);
    }
  };

  const confirmUpload = async (items: FoodItem[]) => {
    try {
      setActionLoading(true);
      await uploadGlobalFoods(items);
      toast.success(`Successfully uploaded ${items.length} food items`);
      setIsUploadOpen(false);
      setIsConfirmOpen(false);
      loadFoods();
    } catch (err) {
      toast.error('Upload failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this food item?')) return;
    try {
      await deleteGlobalFood(id);
      toast.success('Food item deleted');
      loadFoods();
    } catch (err) {
      toast.error('Failed to delete item');
    }
  };

  const openEdit = (food: FoodItem) => {
    setEditingFood(food);
    setEditForm({ ...food });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingFood) return;
    try {
      setActionLoading(true);
      await updateGlobalFood(editingFood.id, editForm);
      toast.success('Food item updated');
      setIsEditOpen(false);
      loadFoods();
    } catch (err) {
      toast.error('Update failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <Link href="/fittrack/dashboard" className="p-2 -ml-2 hover:bg-primary/10 rounded-xl transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-3xl font-black tracking-tight">Food Database</h1>
          </div>
          <p className="text-muted-foreground font-medium pl-8">
            Manage global nutritional data and bulk-upload datasets.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setIsTextImportOpen(true)}
            variant="outline"
            className="rounded-xl flex items-center gap-2 border-border/60"
          >
            <Plus className="h-4 w-4" />
            <span>Text Import & Check</span>
          </Button>
          <Button 
            onClick={() => setIsUploadOpen(true)}
            className="ft-btn ft-btn--primary flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            <span>Bulk Upload</span>
          </Button>
        </div>
      </header>

      <section className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
            <Input 
              placeholder="Search by name, category, or ID..." 
              className="pl-10 h-12 rounded-xl bg-card border-border/60"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 rounded-xl border border-border/50 text-xs font-black uppercase tracking-widest text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span>{foods.length} Total Items</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['all', 'high-protein', 'high-calorie', 'low-calorie', 'cheap'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveSmartFilter(filter)}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                activeSmartFilter === filter 
                  ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-105" 
                  : "bg-card text-muted-foreground border-border/60 hover:border-primary/40 hover:text-primary"
              )}
            >
              {filter.replace('-', ' ')}
            </button>
          ))}
        </div>

        <div className="ft-card overflow-hidden border border-border/60 bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border/60">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Food Item</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Category</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Price</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Kcal</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Protein</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Carbs</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Fat</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                <AnimatePresence mode="popLayout">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={8} className="px-6 py-4"><div className="h-8 bg-muted/40 rounded-lg w-full"></div></td>
                      </tr>
                    ))
                  ) : filteredFoods.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground font-bold uppercase tracking-widest text-xs">
                        No food items found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredFoods.map((food) => {
                      // Visual highlight if potentially duplicate or common
                      const isDuplicate = foods.filter(f => f.name.toLowerCase() === food.name.toLowerCase()).length > 1;

                      return (
                        <motion.tr 
                          key={food.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={cn(
                            "transition-colors group",
                            isDuplicate ? "bg-warning/10 hover:bg-warning/20" : "hover:bg-muted/20"
                          )}
                        >
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-black tracking-tight">{food.name}</p>
                              <p className="text-[10px] font-mono text-muted-foreground uppercase">{food.id}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="ft-badge ft-badge--secondary text-[10px]">
                              {food.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {food.price ? (
                              <span className="font-black text-amber-600 tabular-nums text-xs">₹{food.price}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="font-black text-primary tabular-nums">{food.nutrients.calories}</span>
                          </td>
                          <td className="px-6 py-4 tabular-nums text-xs font-bold text-center">{food.nutrients.proteinG}g</td>
                          <td className="px-6 py-4 tabular-nums text-xs font-bold text-center">{food.nutrients.carbsG}g</td>
                          <td className="px-6 py-4 tabular-nums text-xs font-bold text-center">{food.nutrients.fatG}g</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                              <button 
                                onClick={() => openEdit(food)}
                                className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => handleDelete(food.id)}
                                className="p-2 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Upload Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight">Bulk Upload Foods</DialogTitle>
            <DialogDescription className="font-medium">
              Upload a JSON or Excel/CSV file with food items. Standardize your data to 100g serving sizes.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-6">
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-border/60 rounded-2xl p-10 bg-muted/20 hover:bg-muted/30 transition-colors relative group">
              <input 
                type="file" 
                accept=".json,.csv,.xlsx" 
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleFileUpload}
                disabled={actionLoading}
              />
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                <Upload className="h-8 w-8" />
              </div>
              <p className="text-sm font-black tracking-tight mb-1">Click or drag to upload</p>
              <p className="text-xs text-muted-foreground font-medium">JSON, CSV, or XLSX</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-border/60 bg-card flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest">Excel/CSV</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Column headers: name, calories, proteinG...</p>
                </div>
              </div>
              <div className="p-4 rounded-xl border border-border/60 bg-card flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <FileJson className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest">JSON</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Array of FoodItem objects</p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Food Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight">Edit Food Item</DialogTitle>
            <DialogDescription className="font-medium">
              Update nutritional values or category for this food item.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Name</label>
              <Input 
                value={editForm.name || ''} 
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                className="rounded-xl h-12 bg-muted/20 border-border/60 font-black"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Category</label>
                <select 
                  value={editForm.category}
                  onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value as FoodCategory }))}
                  className="w-full h-12 rounded-xl bg-muted/20 border border-border/60 px-3 text-sm font-bold appearance-none outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Price (INR)</label>
                <Input 
                  type="number"
                  value={editForm.price || ''} 
                  onChange={(e) => setEditForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                  className="rounded-xl h-12 bg-muted/20 border-border/60 font-black"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/40">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Calories</label>
                <Input 
                  type="number"
                  value={editForm.nutrients?.calories || 0} 
                  onChange={(e) => setEditForm(prev => ({ ...prev, nutrients: { ...prev.nutrients!, calories: Number(e.target.value) } }))}
                  className="rounded-xl h-12 bg-muted/20 border-border/60 font-black"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Protein (g)</label>
                <Input 
                  type="number"
                  value={editForm.nutrients?.proteinG || 0} 
                  onChange={(e) => setEditForm(prev => ({ ...prev, nutrients: { ...prev.nutrients!, proteinG: Number(e.target.value) } }))}
                  className="rounded-xl h-12 bg-muted/20 border-border/60 font-black"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Carbs (g)</label>
                <Input 
                  type="number"
                  value={editForm.nutrients?.carbsG || 0} 
                  onChange={(e) => setEditForm(prev => ({ ...prev, nutrients: { ...prev.nutrients!, carbsG: Number(e.target.value) } }))}
                  className="rounded-xl h-12 bg-muted/20 border-border/60 font-black"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Fat (g)</label>
                <Input 
                  type="number"
                  value={editForm.nutrients?.fatG || 0} 
                  onChange={(e) => setEditForm(prev => ({ ...prev, nutrients: { ...prev.nutrients!, fatG: Number(e.target.value) } }))}
                  className="rounded-xl h-12 bg-muted/20 border-border/60 font-black"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsEditOpen(false)} className="rounded-xl font-bold uppercase tracking-widest text-[10px]">Cancel</Button>
            <Button 
              onClick={handleUpdate} 
              disabled={actionLoading}
              className="ft-btn ft-btn--primary px-8 h-12"
            >
              {actionLoading ? 'Saving...' : 'Update Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Text Import & Check Dialog */}
      <Dialog open={isTextImportOpen} onOpenChange={setIsTextImportOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <DialogTitle className="text-2xl font-black tracking-tight">Text Import & Diet Check</DialogTitle>
                <DialogDescription className="font-medium">
                  Paste a diet plan to check against the database, or paste JSON for bulk upload.
                </DialogDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyPrompt}
                className="rounded-xl flex items-center gap-2 border-primary/20 text-primary hover:bg-primary/5 shrink-0"
              >
                <Copy className="h-3.5 w-3.5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Copy Prompt</span>
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="flex p-1 bg-muted/30 rounded-xl border border-border/50">
              <button
                onClick={() => { setImportMode('check'); setCheckResults([]); }}
                className={cn(
                  "flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all",
                  importMode === 'check' ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Diet Check
              </button>
              <button
                onClick={() => { setImportMode('upload'); setCheckResults([]); }}
                className={cn(
                  "flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all",
                  importMode === 'upload' ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Bulk JSON Upload
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                {importMode === 'check' ? 'Paste Diet Plan (one item per line)' : 'Paste JSON Array'}
              </label>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                className="w-full min-h-[200px] p-4 rounded-xl bg-muted/20 border border-border/60 focus:border-primary/50 focus:ring-0 transition-colors font-mono text-sm"
                placeholder={importMode === 'check' ? "Oats: 50g\nMilk: 200ml\nEgg: 2 pieces" : "[{\n  \"name\": \"Oats\",\n  \"calories\": 389,\n  ...\n}]"}
              />
            </div>

            {importMode === 'check' && checkResults.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-primary">Check Results</h3>
                <div className="divide-y divide-border/40 border rounded-xl bg-card overflow-hidden">
                  {checkResults.map((res, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "px-4 py-3 flex items-center justify-between text-sm transition-colors",
                        res.found ? "bg-warning/10" : "bg-card"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {res.found ? (
                          <CheckCircle2 className="h-4 w-4 text-warning" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className={cn("font-bold", res.found ? "text-amber-800" : "")}>
                          {res.name}
                        </span>
                      </div>
                      {res.found ? (
                        <div className="flex items-center gap-2">
                           <span className="text-[9px] font-black uppercase tracking-widest bg-warning/20 text-warning-foreground px-2 py-0.5 rounded-full">Available</span>
                           <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                             {res.food?.nutrients.calories} kcal · {res.food?.nutrients.proteinG}g P
                           </div>
                        </div>
                      ) : (
                        <span className="text-[10px] font-black uppercase tracking-widest text-danger bg-danger/10 px-2 py-1 rounded-full">Missing</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              onClick={handleTextImport}
              className="ft-btn ft-btn--primary w-full h-12"
            >
              {importMode === 'check' ? 'Run Diet Check' : 'Process JSON Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Duplicates */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-2xl">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-warning/10 flex items-center justify-center text-warning mb-4">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight">Duplicate Found</DialogTitle>
            <DialogDescription className="font-medium">
              We found {duplicates.length} items that already exist in your database (matching name or ID).
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
             <div className="max-h-[200px] overflow-y-auto divide-y divide-border/40 border rounded-xl bg-muted/20">
                {duplicates.map(d => (
                   <div key={d.id} className="p-3 flex justify-between items-center text-xs bg-warning/5">
                      <span className="font-black text-amber-900">{d.name}</span>
                      <span className="text-muted-foreground font-mono">{d.id}</span>
                   </div>
                ))}
             </div>
             <p className="text-[11px] text-muted-foreground italic font-medium text-center">
                Available items are highlighted in yellow.
             </p>
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => {
                const nonDups = pendingItems.filter(p => !duplicates.some(d => d.id === p.id || d.name === p.name));
                confirmUpload(nonDups);
              }}
              className="rounded-xl font-black uppercase tracking-widest text-[10px] h-11"
            >
              Skip & Upload New
            </Button>
            <Button 
              onClick={() => confirmUpload(pendingItems)}
              className="ft-btn ft-btn--primary h-11"
              disabled={actionLoading}
            >
              {actionLoading ? 'Uploading...' : 'Overwrite & Upload All'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
