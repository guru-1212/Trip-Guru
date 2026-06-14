'use client';

import { useState, useMemo } from 'react';
import { Calendar, Check, Copy, Share2, X, Info, ChevronDown } from 'lucide-react';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { NutritionLogDoc } from '@/types/nutrition';
import { formatDateLabel } from '@/lib/nutrition/nutritionUtils';
import toast from 'react-hot-toast';

dayjs.extend(isBetween);

interface ShareDietModalProps {
  open: boolean;
  onClose: () => void;
  weeklyLogs: NutritionLogDoc[];
  currentTotals: any;
  currentDateKey: string;
  targets: any;
  timezone: string;
}

type RangeOption = 'today' | 'yesterday' | 'last7' | 'last30' | 'custom';

export function ShareDietModal({
  open,
  onClose,
  weeklyLogs,
  currentTotals,
  currentDateKey,
  targets,
  timezone,
}: ShareDietModalProps) {
  const [range, setRange] = useState<RangeOption>('today');
  const [customStart, setCustomStartDate] = useState(dayjs().subtract(7, 'day').format('YYYY-MM-DD'));
  const [customEnd, setCustomEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [sharing, setSharing] = useState(false);

  const selectedData = useMemo(() => {
    const today = dayjs();
    let start = today;
    let end = today;

    if (range === 'today') {
      return {
        label: formatDateLabel(currentDateKey, timezone),
        days: [currentTotals],
        isRange: false,
      };
    }

    if (range === 'yesterday') {
      start = today.subtract(1, 'day');
      end = start;
    } else if (range === 'last7') {
      start = today.subtract(6, 'day');
      end = today;
    } else if (range === 'last30') {
      start = today.subtract(29, 'day');
      end = today;
    } else if (range === 'custom') {
      start = dayjs(customStart);
      end = dayjs(customEnd);
    }

    // weeklyLogs items have dateKey instead of date
    const filtered = weeklyLogs.filter((log: any) => {
      const d = dayjs(log.dateKey);
      return d.isBetween(start, end, 'day', '[]');
    });

    return {
      label: range === 'yesterday' 
        ? formatDateLabel(start.format('YYYY-MM-DD'), timezone)
        : range === 'today'
        ? formatDateLabel(currentDateKey, timezone)
        : `${start.format('MMM D')} - ${end.format('MMM D')}`,
      days: filtered.map(f => f.totals),
      isRange: range !== 'yesterday' && range !== 'today',
    };
  }, [range, weeklyLogs, currentTotals, currentDateKey, timezone, customStart, customEnd]);

  const generateSummary = () => {
    const { label, days, isRange } = selectedData;
    
    // Aggregate or Average
    const count = days.length;
    if (count === 0 && range !== 'today') return `No diet data found for ${label}`;

    const effectiveDays = range === 'today' ? [currentTotals] : days;
    const effectiveCount = effectiveDays.length;

    const sum = (key: string) => effectiveDays.reduce((acc, d: any) => acc + (d[key] || 0), 0);
    const avg = (key: string) => Math.round(sum(key) / (isRange ? effectiveCount : 1));

    let text = `🍏 Diet Summary: ${label}\n`;
    if (isRange) text += `(Average over ${effectiveCount} logged days)\n`;
    text += `\n`;

    text += `📊 Macros:\n`;
    text += `Calories: ${avg('calories')} kcal\n`;
    text += `Protein: ${avg('proteinG')}g\n`;
    text += `Carbs: ${avg('carbsG')}g\n`;
    text += `Fat: ${avg('fatG')}g\n`;
    text += `Fiber: ${avg('fiberG')}g\n\n`;

    text += `💊 Micronutrients:\n`;
    text += `Calcium: ${avg('calciumMg')}mg\n`;
    text += `Iron: ${avg('ironMg')}mg\n`;
    text += `Magnesium: ${avg('magnesiumMg')}mg\n`;
    text += `Potassium: ${avg('potassiumMg')}mg\n`;
    text += `Sodium: ${avg('sodiumMg')}mg\n`;
    
    const vitA = avg('vitaminAMcg');
    const vitC = avg('vitaminCMg');
    const vitD = avg('vitaminDMcg');
    const vitB12 = avg('vitaminB12Mcg');

    if (vitA || vitC || vitD || vitB12) {
      text += `\n✨ Vitamins:\n`;
      if (vitA) text += `- Vitamin A: ${vitA}mcg\n`;
      if (vitC) text += `- Vitamin C: ${vitC}mg\n`;
      if (vitD) text += `- Vitamin D: ${vitD}mcg\n`;
      if (vitB12) text += `- Vitamin B12: ${vitB12}mcg\n`;
    }

    text += `\nTracked via Trip-Guru FitTrack`;
    return text;
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const text = generateSummary();
      
      // Auto copy
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');

      if (navigator.share) {
        await navigator.share({
          title: `Diet Summary - ${selectedData.label}`,
          text: text,
        });
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        toast.error('Failed to share');
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md rounded-[32px] p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-primary p-8 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
            <Share2 className="h-6 w-6" />
          </div>
          <DialogTitle className="text-2xl font-black tracking-tight mb-2">Share Diet Progress</DialogTitle>
          <p className="text-primary-foreground/80 font-medium text-sm">
            Include macros, vitamins, and minerals in your summary.
          </p>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Select Timeframe</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'today', label: 'Today', icon: Calendar },
                { id: 'yesterday', label: 'Yesterday', icon: Calendar },
                { id: 'last7', label: 'Last 7 Days', icon: Calendar },
                { id: 'last30', label: 'Last 30 Days', icon: Calendar },
                { id: 'custom', label: 'Custom Range', icon: Calendar },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setRange(opt.id as RangeOption)}
                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all font-bold text-sm ${
                    range === opt.id 
                      ? 'border-primary bg-primary/5 text-primary shadow-sm' 
                      : 'border-muted bg-muted/20 text-muted-foreground hover:border-primary/20'
                  }`}
                >
                  <opt.icon className={`h-4 w-4 ${range === opt.id ? 'text-primary' : 'text-muted-foreground/50'}`} />
                  {opt.label}
                </button>
              ))}
            </div>

            {range === 'custom' && (
              <div className="grid grid-cols-2 gap-3 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-bold uppercase text-muted-foreground ml-1">Start Date</Label>
                  <input 
                    type="date" 
                    value={customStart}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full bg-muted/20 border-2 border-muted rounded-xl px-3 py-2 text-xs font-bold focus:border-primary outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-bold uppercase text-muted-foreground ml-1">End Date</Label>
                  <input 
                    type="date" 
                    value={customEnd}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full bg-muted/20 border-2 border-muted rounded-xl px-3 py-2 text-xs font-bold focus:border-primary outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="bg-muted/30 rounded-2xl p-5 border border-border/50">
             <div className="flex gap-3 mb-4">
                <div className="bg-primary/10 p-2 rounded-lg text-primary shrink-0 h-fit">
                   <Info className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                   <p className="text-xs font-black uppercase tracking-wider">Sharing Details</p>
                   <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                     Your summary for <span className="text-foreground font-bold">{selectedData.label}</span> includes full micronutrient data (Vitamins A, C, D, B12, Iron, Calcium, etc).
                   </p>
                </div>
             </div>
             {selectedData.days.length === 0 && range !== 'today' && (
               <p className="text-[10px] text-destructive font-bold bg-destructive/10 p-2 rounded-lg text-center">
                 No logs found in this range.
               </p>
             )}
          </div>

          <Button 
            onClick={handleShare}
            disabled={sharing || (selectedData.days.length === 0 && range !== 'today')}
            className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 gap-3"
          >
            {sharing ? 'Processing...' : (
              <>
                <Copy className="h-4 w-4" />
                Copy & Share Summary
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
