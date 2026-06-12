'use client';

import { useEffect, useState, useMemo } from 'react';
import { 
  Search, 
  Upload, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  FileJson, 
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import Link from 'next/link';

import { 
  getGlobalFoods, 
  uploadGlobalFoods, 
  deleteGlobalFood 
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

export default function FoodDatabasePage() {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingItems, setPendingItems] = useState<FoodItem[]>([]);
  const [duplicates, setDuplicates] = useState<FoodItem[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

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

  const filteredFoods = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return foods.filter(f => 
      f.name.toLowerCase().includes(q) || 
      f.category.toLowerCase().includes(q) ||
      f.id.toLowerCase().includes(q)
    );
  }, [foods, searchQuery]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        let items: any[] = [];

        if (file.name.endsWith('.json')) {
          items = JSON.parse(data as string);
        } else {
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

        <div className="ft-card overflow-hidden border border-border/60 bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border/60">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Food Item</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Category</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Serving</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Calories</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Protein</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Carbs</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fat</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-20"></th>
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
                    filteredFoods.map((food) => (
                      <motion.tr 
                        key={food.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-muted/20 transition-colors group"
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
                        <td className="px-6 py-4 text-xs font-bold text-muted-foreground">
                          {food.servingLabel} ({food.servingGrams}g)
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-black text-primary tabular-nums">{food.nutrients.calories}</span>
                        </td>
                        <td className="px-6 py-4 tabular-nums text-xs font-bold">{food.nutrients.proteinG}g</td>
                        <td className="px-6 py-4 tabular-nums text-xs font-bold">{food.nutrients.carbsG}g</td>
                        <td className="px-6 py-4 tabular-nums text-xs font-bold">{food.nutrients.fatG}g</td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => handleDelete(food.id)}
                            className="p-2 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </motion.tr>
                    ))
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
                   <div key={d.id} className="p-3 flex justify-between items-center text-xs">
                      <span className="font-black">{d.name}</span>
                      <span className="text-muted-foreground font-mono">{d.id}</span>
                   </div>
                ))}
             </div>
             <p className="text-[11px] text-muted-foreground italic font-medium">
                Overwriting will update the nutritional values for these items.
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
