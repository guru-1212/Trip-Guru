'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTargetLogger, todayKey } from '@/hooks/useTargets';
import type { Target } from '@/workout/targets';
import { TargetSetLogger } from './TargetSetLogger';

interface QuickLogDialogProps {
  target: Target | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function QuickLogBody({ target }: { target: Target }) {
  // No sessionId: logged outside a gym session, so nothing to link it to.
  const logger = useTargetLogger(target, todayKey());

  if (!logger.livePrescription) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing scheduled for today. Rest is part of the plan.
      </p>
    );
  }

  return (
    <>
      <p className="text-sm text-muted-foreground">{logger.livePrescription.coachNote}</p>
      <TargetSetLogger target={target} logger={logger} className="mt-4" />
    </>
  );
}

export function QuickLogDialog({ target, open, onOpenChange }: QuickLogDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        {target && (
          <>
            <DialogHeader>
              <DialogTitle>{target.name}</DialogTitle>
              <DialogDescription>Log today&apos;s session.</DialogDescription>
            </DialogHeader>
            <QuickLogBody target={target} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
