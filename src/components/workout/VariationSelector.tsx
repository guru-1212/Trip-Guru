'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface VariationSelectorProps {
  value: string;
  variations: string[];
  onChange: (v: string) => void;
  onAddVariation: (v: string) => void;
  /** Optional set progress label per variation, e.g. "2/3". */
  variationProgress?: Record<string, string>;
}

export function VariationSelector({
  value,
  variations,
  onChange,
  onAddVariation,
  variationProgress,
}: VariationSelectorProps) {
  const [newVar, setNewVar] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const submitNew = () => {
    if (!newVar.trim()) return;
    onAddVariation(newVar.trim());
    onChange(newVar.trim());
    setNewVar('');
    setShowAdd(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="ft-section-title">Variation</p>
        <button
          type="button"
          onClick={() => setShowAdd(!showAdd)}
          className="text-xs font-semibold text-primary hover:underline"
        >
          {showAdd ? 'Cancel' : '+ Add new'}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {showAdd ? (
          <motion.div
            key="add"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex gap-2"
          >
            <input
              className="ft-input flex-1"
              placeholder="e.g. Incline, Sumo..."
              autoFocus
              value={newVar}
              onChange={(e) => setNewVar(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitNew()}
            />
            <button type="button" className="ft-btn ft-btn--primary ft-btn--sm shrink-0" onClick={submitNew}>
              <Plus className="h-4 w-4" />
              Add
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="chips"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-wrap gap-2"
          >
            {variations.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onChange(v)}
                className={cn('ft-chip', value === v && 'ft-chip--active')}
              >
                <span>{v}</span>
                {variationProgress?.[v] && (
                  <span className="ml-1.5 text-[10px] font-bold opacity-80 tabular-nums">
                    {variationProgress[v]}
                  </span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
