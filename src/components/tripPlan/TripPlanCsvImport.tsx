'use client';

import { useRef, useState } from 'react';
import { Upload, Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { TripPlan } from '@/types/tripPlan';
import { parseCsvToTripPlan, TRIP_PLAN_CSV_TEMPLATE } from '@/lib/tripPlanCsv';

export function TripPlanCsvImport({
  tripId,
  currentPlan,
  onImport,
  disabled,
}: {
  tripId: string;
  currentPlan: TripPlan | null;
  onImport: (plan: TripPlan) => Promise<void>;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  const handleFile = async (file: File) => {
    setImporting(true);
    setWarnings([]);
    try {
      const text = await file.text();
      const { plan, warnings: w } = parseCsvToTripPlan(
        text,
        tripId,
        currentPlan ?? undefined
      );
      setWarnings(w);
      await onImport(plan);
      setOpen(false);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([TRIP_PLAN_CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tripmate-plan-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="rounded-xl">
          <Upload className="h-4 w-4 mr-1" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import plan from sheet
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Export Google Sheet as CSV. Columns:{' '}
          <code className="text-xs">type, day, date, title, subtitle, detail, order, imageKeyword, routeGroup</code>
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-1" />
            Template
          </Button>
          <Button
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={importing}
          >
            {importing ? 'Importing...' : 'Choose CSV file'}
          </Button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = '';
          }}
        />
        {warnings.length > 0 && (
          <ul className="text-xs text-amber-600 dark:text-amber-400 space-y-1 mt-2">
            {warnings.map((w, i) => (
              <li key={i}>• {w}</li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
