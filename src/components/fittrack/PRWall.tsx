'use client';

import { useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import dayjs from 'dayjs';
import { Share2, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import { PRShareCard } from '@/components/fittrack/PRShareCard';
import { EXERCISE_LIBRARY } from '@/workout/exerciseLibrary';
import {
  BIG_THREE_LIFT_IDS,
  buildPRShareCardData,
  exportPRShareCard,
  waitForShareCardPaint,
  type PRShareCardData,
} from '@/workout/shareCard';
import type { PersonalRecord } from '@/workout/types';
import { estimateOneRepMax, formatWeight } from '@/workout/utils';

type PRWallProps = {
  prs: Record<string, PersonalRecord>;
  unit: 'kg' | 'lbs';
  athleteName: string;
  customExercises?: { id: string; name: string }[];
};

export function PRWall({ prs, unit, athleteName, customExercises = [] }: PRWallProps) {
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [shareCardData, setShareCardData] = useState<PRShareCardData | null>(null);
  const [sharingLiftId, setSharingLiftId] = useState<string | null>(null);
  const [sharingWall, setSharingWall] = useState(false);

  const resolveName = (id: string) =>
    EXERCISE_LIBRARY.find((e) => e.id === id)?.name ??
    customExercises.find((e) => e.id === id)?.name ??
    id;

  const bigThreeCards = useMemo(() => {
    return BIG_THREE_LIFT_IDS.map((id) => {
      const pr = prs[id];
      const name = resolveName(id);
      if (!pr) {
        return { id, name, pr: null, estimated1RMLabel: '', actualSet: '' };
      }
      const estimated1RM = estimateOneRepMax(pr.weight, pr.reps);
      return {
        id,
        name,
        pr,
        estimated1RMLabel: formatWeight(estimated1RM, unit),
        actualSet: `${formatWeight(pr.weight, unit)} × ${pr.reps}`,
      };
    });
  }, [prs, unit, customExercises]);

  const hasAnyPR = bigThreeCards.some((card) => card.pr !== null);

  const runShare = async (
    data: PRShareCardData | null,
    onStart: () => void,
    onEnd: () => void
  ) => {
    if (!data) return;
    onStart();
    flushSync(() => setShareCardData(data));
    try {
      await waitForShareCardPaint();
      if (!shareCardRef.current) {
        throw new Error('Share card not ready');
      }
      const result = await exportPRShareCard(shareCardRef.current, data);
      toast.success(result === 'shared' ? 'Story shared' : 'Story image downloaded');
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error(err);
        toast.error('Could not create share image');
      }
    } finally {
      onEnd();
      setShareCardData(null);
    }
  };

  const handleShareLift = (exerciseId: string) => {
    const data = buildPRShareCardData({
      athleteName,
      prs,
      unit,
      mode: 'single',
      exerciseId,
      customExercises,
    });
    void runShare(
      data,
      () => setSharingLiftId(exerciseId),
      () => setSharingLiftId(null)
    );
  };

  const handleShareWall = () => {
    const data = buildPRShareCardData({
      athleteName,
      prs,
      unit,
      mode: 'wall',
      customExercises,
    });
    void runShare(
      data,
      () => setSharingWall(true),
      () => setSharingWall(false)
    );
  };

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="ft-title text-lg font-semibold flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Wall of Fame
        </h2>
        <button
          type="button"
          className="ft-btn ft-btn--secondary ft-btn--sm gap-2"
          disabled={!hasAnyPR || sharingWall || sharingLiftId !== null}
          onClick={handleShareWall}
        >
          <Share2 className="h-4 w-4" />
          {sharingWall ? 'Creating…' : 'Share Wall'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {bigThreeCards.map((card) => {
          const isSharing = sharingLiftId === card.id;
          const hasPR = card.pr !== null;

          return (
            <div
              key={card.id}
              className="ft-card ft-card-padded border-l-4 border-l-yellow-500 flex flex-col"
            >
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-5 w-5 text-yellow-500 shrink-0" />
                <h3 className="font-semibold uppercase tracking-wide text-sm text-muted-foreground">
                  {card.name}
                </h3>
              </div>

              {hasPR && card.pr ? (
                <>
                  <p className="text-3xl sm:text-4xl font-black mt-2 tabular-nums">
                    {card.estimated1RMLabel}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Est. 1RM · {card.actualSet}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {dayjs(card.pr.date).format('MMM D, YYYY')} · {card.pr.variation}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground mt-3 flex-1">
                  No PR yet — hit a workout to claim this spot
                </p>
              )}

              <button
                type="button"
                className="ft-btn ft-btn--secondary ft-btn--sm gap-2 mt-4 w-full"
                disabled={!hasPR || isSharing || sharingWall}
                onClick={() => handleShareLift(card.id)}
              >
                <Share2 className="h-4 w-4" />
                {isSharing ? 'Creating…' : 'Share to Story'}
              </button>
            </div>
          );
        })}
      </div>

      {shareCardData && <PRShareCard ref={shareCardRef} data={shareCardData} />}
    </section>
  );
}
