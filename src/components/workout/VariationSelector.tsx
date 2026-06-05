'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

interface VariationSelectorProps {
  value: string;
  variations: string[];
  onChange: (v: string) => void;
  onAddVariation: (v: string) => void;
}

export function VariationSelector({ value, variations, onChange, onAddVariation }: VariationSelectorProps) {
  const [newVar, setNewVar] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="space-y-2">
      <label className="text-xs text-[var(--wk-muted)] font-medium">Variation</label>
      <select
        className="wk-input text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {variations.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
      {showAdd ? (
        <div className="flex gap-2">
          <input
            className="wk-input text-sm flex-1"
            placeholder="New variation name"
            value={newVar}
            onChange={(e) => setNewVar(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newVar.trim()) {
                onAddVariation(newVar.trim());
                onChange(newVar.trim());
                setNewVar('');
                setShowAdd(false);
              }
            }}
          />
          <button
            type="button"
            className="wk-btn-primary text-xs px-3"
            onClick={() => {
              if (newVar.trim()) {
                onAddVariation(newVar.trim());
                onChange(newVar.trim());
                setNewVar('');
                setShowAdd(false);
              }
            }}
          >
            Add
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 text-xs text-[var(--wk-accent)] hover:underline"
        >
          <Plus className="h-3 w-3" />
          Add new variation
        </button>
      )}
    </div>
  );
}
