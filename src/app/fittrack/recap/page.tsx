'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import {
  Sparkles,
  Download,
  Share2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CalendarDays,
} from 'lucide-react';
import { PageTransition } from '@/components/workout/PageTransition';
import { useWorkoutStore } from '@/workout/WorkoutContext';
import { RecapCard } from '@/components/fittrack/recap/RecapCard';
import { buildRecap, pickHeroPhoto, type RecapCardData, type RecapScope } from '@/workout/recapData';
import {
  captureShareCardAsPng,
  downloadShareCard,
  shareOrDownloadShareCard,
  waitForShareCardPaint,
} from '@/workout/shareCard';
import { getWeekStart, getTrackingWeekRangeLabel } from '@/workout/utils';
import { getWaterLog, getWaterLogsInRange } from '@/firebase/water.firestore';
import { getNutritionLog, getNutritionLogsInRange } from '@/firebase/nutrition.firestore';
import type { WaterLogDoc } from '@/types/water';
import type { NutritionLogDoc } from '@/types/nutrition';
import { cn } from '@/lib/utils';

const TODAY = () => dayjs().format('YYYY-MM-DD');

async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function cardFilename(card: RecapCardData, key: string): string {
  return `fittrack-${card.scope}-${card.type}-${key}.png`;
}

export default function RecapPage() {
  const { profile, workouts, prs, bodyStats, habits, weeklyGoals, progressPhotos, fittrackOwnerId, hydrated } =
    useWorkoutStore();
  const uid = fittrackOwnerId;

  const [scope, setScope] = useState<RecapScope>('day');
  const [dayKey, setDayKey] = useState<string>(TODAY);
  const [weekStartKey, setWeekStartKey] = useState<string>(() => getWeekStart());
  const scopeKey = scope === 'day' ? dayKey : weekStartKey;

  const [cards, setCards] = useState<RecapCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const offscreenRef = useRef<HTMLDivElement>(null);
  const [captureCard, setCaptureCard] = useState<RecapCardData | null>(null);

  // Build the card set for the current scope/date (fetches water/diet + hero photo).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const key = scope === 'day' ? dayKey : weekStartKey;
      const water: Record<string, WaterLogDoc> = {};
      const nutrition: Record<string, NutritionLogDoc> = {};

      if (uid) {
        try {
          if (scope === 'day') {
            const [w, n] = await Promise.all([getWaterLog(uid, key), getNutritionLog(uid, key)]);
            if (w) water[key] = w;
            if (n) nutrition[key] = n;
          } else {
            const endKey = dayjs(key).add(6, 'day').format('YYYY-MM-DD');
            const [w, n] = await Promise.all([
              getWaterLogsInRange(uid, key, endKey),
              getNutritionLogsInRange(uid, key, endKey),
            ]);
            Object.assign(water, w);
            Object.assign(nutrition, n);
          }
        } catch (err) {
          console.error('[Recap] failed to load water/diet:', err);
        }
      }

      const hero = pickHeroPhoto(progressPhotos, scope, key);
      const photoDataUrl = hero ? await toDataUrl(hero.url) : null;
      if (cancelled) return;

      const built = buildRecap({
        scope,
        dateKey: key,
        profile,
        workouts,
        prs,
        bodyStats,
        habits,
        weeklyGoals,
        progressPhotos,
        water,
        nutrition,
        photoDataUrl,
      });
      setCards(built);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [scope, dayKey, weekStartKey, uid, profile, workouts, prs, bodyStats, habits, weeklyGoals, progressPhotos]);

  const renderBlob = useCallback(async (card: RecapCardData): Promise<Blob> => {
    flushSync(() => setCaptureCard(card));
    await waitForShareCardPaint();
    const node = offscreenRef.current;
    if (!node) throw new Error('Card did not render');
    return captureShareCardAsPng(node);
  }, []);

  const shareOne = async (card: RecapCardData) => {
    setBusy('Rendering…');
    try {
      const blob = await renderBlob(card);
      await shareOrDownloadShareCard(blob, cardFilename(card, scopeKey));
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error(err);
        toast.error('Could not create image');
      }
    } finally {
      setCaptureCard(null);
      setBusy(null);
    }
  };

  const downloadOne = async (card: RecapCardData) => {
    setBusy('Rendering…');
    try {
      const blob = await renderBlob(card);
      downloadShareCard(blob, cardFilename(card, scopeKey));
      toast.success('Image downloaded');
    } catch (err) {
      console.error(err);
      toast.error('Could not create image');
    } finally {
      setCaptureCard(null);
      setBusy(null);
    }
  };

  const downloadAll = async () => {
    setBusy('Rendering…');
    try {
      for (let i = 0; i < cards.length; i++) {
        setBusy(`Rendering ${i + 1}/${cards.length}…`);
        const blob = await renderBlob(cards[i]);
        downloadShareCard(blob, cardFilename(cards[i], scopeKey));
        await new Promise((r) => setTimeout(r, 250));
      }
      toast.success(`Downloaded ${cards.length} cards`);
    } catch (err) {
      console.error(err);
      toast.error('Could not create images');
    } finally {
      setCaptureCard(null);
      setBusy(null);
    }
  };

  const shareAll = async () => {
    setBusy('Rendering…');
    try {
      const files: File[] = [];
      for (let i = 0; i < cards.length; i++) {
        setBusy(`Rendering ${i + 1}/${cards.length}…`);
        const blob = await renderBlob(cards[i]);
        files.push(new File([blob], cardFilename(cards[i], scopeKey), { type: 'image/png' }));
      }
      setCaptureCard(null);
      const nav = navigator as Navigator & {
        canShare?: (d?: ShareData) => boolean;
        share?: (d?: ShareData) => Promise<void>;
      };
      if (nav.canShare?.({ files }) && nav.share) {
        await nav.share({ files, title: 'FitTrack Recap' });
      } else {
        files.forEach((f) => downloadShareCard(f, f.name));
        toast.success('Downloaded (bulk share not supported on this device)');
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error(err);
        toast.error('Could not share images');
      }
    } finally {
      setCaptureCard(null);
      setBusy(null);
    }
  };

  const currentWeekStart = getWeekStart();
  const canGoNextWeek = weekStartKey < currentWeekStart;

  if (!hydrated) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="ft-title text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Recap
          </h1>
          <p className="ft-subtitle mt-1 text-sm">
            Auto-generated share cards for your day &amp; week — ready for Stories.
          </p>
        </div>

        {/* Controls */}
        <div className="ft-card ft-card-padded space-y-4">
          <div className="flex gap-1 rounded-xl bg-muted/50 p-1 w-full max-w-xs">
            {(['day', 'week'] as RecapScope[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScope(s)}
                className={cn(
                  'flex-1 rounded-lg px-3 py-1.5 text-xs font-black uppercase tracking-wider transition-colors',
                  scope === s ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground'
                )}
              >
                {s === 'day' ? 'Daily' : 'Weekly'}
              </button>
            ))}
          </div>

          {scope === 'day' ? (
            <label className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
              <CalendarDays className="h-4 w-4 shrink-0" />
              <input
                type="date"
                value={dayKey}
                max={TODAY()}
                onChange={(e) => setDayKey(e.target.value)}
                className="ft-input w-auto"
              />
            </label>
          ) : (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setWeekStartKey(dayjs(weekStartKey).subtract(1, 'week').format('YYYY-MM-DD'))}
                className="ft-btn ft-btn--ghost ft-btn--icon"
                aria-label="Previous week"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-bold tabular-nums min-w-[150px] text-center">
                {getTrackingWeekRangeLabel(weekStartKey)}
              </span>
              <button
                type="button"
                onClick={() => canGoNextWeek && setWeekStartKey(dayjs(weekStartKey).add(1, 'week').format('YYYY-MM-DD'))}
                disabled={!canGoNextWeek}
                className="ft-btn ft-btn--ghost ft-btn--icon disabled:opacity-40 disabled:pointer-events-none"
                aria-label="Next week"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Bulk actions */}
          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="button"
              onClick={downloadAll}
              disabled={!!busy || loading || cards.length === 0}
              className="ft-btn ft-btn--secondary disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Download all
            </button>
            <button
              type="button"
              onClick={shareAll}
              disabled={!!busy || loading || cards.length === 0}
              className="ft-btn ft-btn--primary disabled:opacity-50"
            >
              <Share2 className="h-4 w-4" />
              Share all
            </button>
            {busy && (
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
                {busy}
              </span>
            )}
          </div>
        </div>

        {/* Gallery */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Building your recap…
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {cards.map((card) => (
              <div key={card.id} className="space-y-2">
                <CardThumb data={card} />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => downloadOne(card)}
                    disabled={!!busy}
                    className="ft-btn ft-btn--secondary ft-btn--sm flex-1 disabled:opacity-50"
                    aria-label="Download"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => shareOne(card)}
                    disabled={!!busy}
                    className="ft-btn ft-btn--primary ft-btn--sm flex-1 disabled:opacity-50"
                    aria-label="Share"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Offscreen full-size capture mount (one card at a time) */}
      <div style={{ position: 'fixed', left: -99999, top: 0, zIndex: -1, pointerEvents: 'none' }} aria-hidden>
        {captureCard && <RecapCard ref={offscreenRef} data={captureCard} />}
      </div>
    </PageTransition>
  );
}

/** WYSIWYG thumbnail: scales the real 1080×1920 card to the cell width. */
function CardThumb({ data }: { data: RecapCardData }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / 1080);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={wrapRef}
      style={{ width: '100%', aspectRatio: '1080 / 1920', overflow: 'hidden' }}
      className="rounded-2xl border border-border shadow-sm"
    >
      <div style={{ width: 1080, height: 1920, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        <RecapCard data={data} />
      </div>
    </div>
  );
}
