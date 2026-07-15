'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { Share2, ChevronLeft, ChevronRight, Loader2, PersonStanding, Download } from 'lucide-react';
import { PageTransition } from '@/components/workout/PageTransition';
import { useWorkoutStore } from '@/workout/WorkoutContext';
import { computeBodyDistribution, bodySvgDataUrl } from '@/workout/bodyDistribution';
import { BodyShareCard, type BodyShareData } from '@/components/fittrack/recap/BodyShareCard';
import { captureCardPng, downloadShareCard, waitForShareCardPaint } from '@/workout/shareCard';
import { getWeekStart, getTrackingWeekRangeLabel } from '@/workout/utils';
import { cn } from '@/lib/utils';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

async function shareBlob(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d?: ShareData) => boolean; share?: (d?: ShareData) => Promise<void> };
  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], title: 'FitTrack — Body Distribution' });
      return;
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
    }
  }
  downloadShareCard(blob, filename);
  toast.success('Saved to your device');
}

export default function BodyDistributionPage() {
  const { workouts, customExercises, profile, hydrated } = useWorkoutStore();
  const [weekStartKey, setWeekStartKey] = useState<string>(() => getWeekStart());

  const dist = useMemo(
    () => computeBodyDistribution(weekStartKey, workouts, customExercises),
    [weekStartKey, workouts, customExercises]
  );
  const frontUrl = useMemo(() => bodySvgDataUrl('front', dist.frontIntensity), [dist]);
  const backUrl = useMemo(() => bodySvgDataUrl('back', dist.backIntensity), [dist]);

  const days = useMemo(
    () =>
      DAY_LABELS.map((label, i) => {
        const d = dayjs(weekStartKey).add(i, 'day');
        return { label, num: d.format('D'), worked: dist.daysWorked[i], today: d.isSame(dayjs(), 'day') };
      }),
    [weekStartKey, dist]
  );

  const handle = useMemo(() => {
    const clean = (profile.name || 'athlete').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return clean ? `@${clean}` : '@athlete';
  }, [profile.name]);

  const topGroups = useMemo(
    () =>
      dist.groups
        .filter((g) => g.sets > 0)
        .sort((a, b) => b.sets - a.sets)
        .slice(0, 3)
        .map((g) => g.group)
        .join(' · '),
    [dist]
  );

  const shareData = useMemo<BodyShareData>(
    () => ({
      athleteName: profile.name || 'Athlete',
      handle,
      weekRange: getTrackingWeekRangeLabel(weekStartKey),
      total: dist.total,
      topGroups,
      frontUrl,
      backUrl,
      days: days.map(({ label, num, worked }) => ({ label, num, worked })),
    }),
    [profile.name, handle, weekStartKey, dist, topGroups, frontUrl, backUrl, days]
  );

  // Pre-render the share card so Share fires within the tap gesture.
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [shareBlobData, setShareBlobData] = useState<Blob | null>(null);
  const [rendering, setRendering] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setRendering(true);
      setShareBlobData(null);
      await waitForShareCardPaint();
      const node = shareCardRef.current;
      if (!node) {
        if (!cancelled) setRendering(false);
        return;
      }
      try {
        const blob = await captureCardPng(node, '#e2e8f0', 2);
        if (!cancelled) setShareBlobData(blob);
      } catch (err) {
        console.error('[Body] render failed:', err);
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shareData]);

  const onShare = async () => {
    if (!shareBlobData) return;
    setBusy(true);
    try {
      await shareBlob(shareBlobData, `fittrack-body-${weekStartKey}.png`);
    } finally {
      setBusy(false);
    }
  };
  const onDownload = () => {
    if (!shareBlobData) return;
    downloadShareCard(shareBlobData, `fittrack-body-${weekStartKey}.png`);
    toast.success('Image downloaded');
  };

  const maxSets = Math.max(1, ...dist.groups.map((g) => g.sets));
  const currentWeekStart = getWeekStart();
  const canGoNext = weekStartKey < currentWeekStart;

  if (!hydrated) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="ft-title text-2xl font-bold flex items-center gap-2">
              <PersonStanding className="h-6 w-6 text-primary" />
              Body Distribution
            </h1>
            <p className="ft-subtitle mt-1 text-sm">Muscles trained this week — as total sets.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button type="button" onClick={onDownload} disabled={!shareBlobData || busy} className="ft-btn ft-btn--secondary ft-btn--icon disabled:opacity-50" aria-label="Download">
              {rendering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            </button>
            <button type="button" onClick={onShare} disabled={!shareBlobData || busy} className="ft-btn ft-btn--primary disabled:opacity-50">
              <Share2 className="h-4 w-4" />
              Share
            </button>
          </div>
        </div>

        {/* Week nav */}
        <div className="ft-card ft-card-padded space-y-4">
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setWeekStartKey(dayjs(weekStartKey).subtract(1, 'week').format('YYYY-MM-DD'))} className="ft-btn ft-btn--ghost ft-btn--icon" aria-label="Previous week">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-bold tabular-nums">{getTrackingWeekRangeLabel(weekStartKey)}</span>
            <button
              type="button"
              onClick={() => canGoNext && setWeekStartKey(dayjs(weekStartKey).add(1, 'week').format('YYYY-MM-DD'))}
              disabled={!canGoNext}
              className="ft-btn ft-btn--ghost ft-btn--icon disabled:opacity-40 disabled:pointer-events-none"
              aria-label="Next week"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day chips */}
          <div className="flex justify-between">
            {days.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span className="text-[11px] font-black text-muted-foreground">{d.label}</span>
                <span
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold tabular-nums',
                    d.worked ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                    d.today && !d.worked && 'ring-2 ring-primary/40'
                  )}
                >
                  {d.num}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Body figures */}
        <div className="ft-card ft-card-padded">
          {dist.total === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No sets logged this week.</p>
          ) : (
            <div className="flex justify-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={frontUrl} alt="Front muscles" className="w-[45%] max-w-[220px] h-auto" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={backUrl} alt="Back muscles" className="w-[45%] max-w-[220px] h-auto" />
            </div>
          )}
        </div>

        {/* Set-count table */}
        <section className="ft-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Muscle</span>
            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Sets</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/60">
            <span className="text-sm font-black">Total</span>
            <span className="text-sm font-black tabular-nums">{dist.total}</span>
          </div>
          {dist.groups.map((g) => (
            <div key={g.group} className="px-4 py-3 border-b border-border/60 last:border-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{g.group}</span>
                <span className="text-sm font-bold tabular-nums">{g.sets}</span>
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(g.sets / maxSets) * 100}%` }} />
              </div>
            </div>
          ))}
        </section>
      </div>

      {/* Offscreen share-card mount (pre-rendered for instant share) */}
      <div style={{ position: 'fixed', left: -99999, top: 0, zIndex: -1, pointerEvents: 'none' }} aria-hidden>
        <BodyShareCard ref={shareCardRef} data={shareData} />
      </div>
    </PageTransition>
  );
}
