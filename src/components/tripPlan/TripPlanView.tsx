'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  MapPin,
  Heart,
  CloudRain,
  Home,
  Wallet,
  Route,
  ChevronRight,
  RotateCcw,
  Pencil,
  Eye,
} from 'lucide-react';
import { TripPlan } from '@/types/tripPlan';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TripPlanCsvImport } from './TripPlanCsvImport';
import { TripPlanEditor } from './TripPlanEditor';
import { formatCurrency } from '@/lib/utils';
import { motion } from 'framer-motion';

export function TripPlanView({
  plan,
  currency,
  saving,
  onPersist,
  onReset,
  canEdit,
}: {
  plan: TripPlan;
  currency: string;
  saving: boolean;
  onPersist: (plan: TripPlan) => Promise<void>;
  onReset: () => Promise<void>;
  canEdit: boolean;
}) {
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const budgetUsed = plan.budgetUsed ?? 0;
  const budgetPct = plan.budgetTotal
    ? Math.min(100, (budgetUsed / plan.budgetTotal) * 100)
    : 0;

  const coverSrc =
    plan.coverImageUrl ||
    plan.days[0]?.imageUrl ||
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=900';

  if (canEdit && mode === 'edit') {
    return (
      <div className="space-y-6 pb-8">
        <PlanHeader
          plan={plan}
          canEdit={canEdit}
          mode={mode}
          saving={saving}
          onModeChange={setMode}
          onPersist={onPersist}
          onReset={onReset}
        />
        <TripPlanEditor plan={plan} saving={saving} onSave={onPersist} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <PlanHeader
        plan={plan}
        canEdit={canEdit}
        mode={mode}
        saving={saving}
        onModeChange={setMode}
        onPersist={onPersist}
        onReset={onReset}
      />

      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="relative h-36 sm:h-44">
          <Image
            src={coverSrc}
            alt="Trip"
            fill
            className="object-cover"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <CardContent className="absolute bottom-0 left-0 right-0 p-4 text-white">
            <p className="text-xs font-black uppercase tracking-widest opacity-80">
              Budget progress
            </p>
            <p className="text-xl font-black">
              {formatCurrency(budgetUsed, currency)} /{' '}
              {formatCurrency(plan.budgetTotal, currency)}
            </p>
            <Progress value={budgetPct} className="h-2 mt-2 bg-white/20" />
          </CardContent>
        </div>
      </Card>

      <section className="space-y-4">
        <SectionTitle icon={Route} title="Route order" />
        {plan.routes.map((route) => (
          <Card key={route.id} className="rounded-2xl overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">{route.title}</CardTitle>
                  {route.dayRange && (
                    <Badge variant="secondary" className="mt-1">
                      {route.dayRange}
                    </Badge>
                  )}
                </div>
              </div>
              {route.subtitle && (
                <p className="text-xs text-muted-foreground font-medium mt-1">
                  {route.subtitle}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {route.stops.map((stop, i) => (
                <motion.div
                  key={stop.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex gap-3 p-3 rounded-xl bg-muted/40 border border-border/30"
                >
                  <div className="flex flex-col items-center shrink-0">
                    <span className="w-7 h-7 rounded-full bg-primary text-white text-xs font-black flex items-center justify-center">
                      {stop.order}
                    </span>
                    {i < route.stops.length - 1 && (
                      <div className="w-0.5 flex-1 bg-border min-h-[12px] mt-1" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex gap-3">
                    {stop.imageUrl && (
                      <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 hidden sm:block">
                        <Image
                          src={stop.imageUrl}
                          alt=""
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-sm">{stop.name}</p>
                      {stop.note && (
                        <p className="text-xs text-muted-foreground">{stop.note}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        <SectionTitle icon={MapPin} title="Day by day" />
        <div className="flex gap-3 overflow-x-auto pb-2 snap-x scrollbar-hide">
          {plan.days.map((day) => (
            <Card
              key={day.id}
              className="min-w-[260px] max-w-[280px] snap-start shrink-0 rounded-2xl overflow-hidden"
            >
              {day.imageUrl && (
                <div className="relative h-28 w-full">
                  <Image
                    src={day.imageUrl}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute top-2 left-2">
                    <Badge className="font-black">Day {day.dayNumber}</Badge>
                  </div>
                </div>
              )}
              <CardContent className="p-4 space-y-1">
                {!day.imageUrl && (
                  <Badge variant="outline" className="mb-1">
                    Day {day.dayNumber}
                  </Badge>
                )}
                {day.date && (
                  <p className="text-[10px] font-black uppercase text-primary tracking-widest">
                    {day.date}
                  </p>
                )}
                <p className="font-black">{day.title}</p>
                <p className="text-sm text-muted-foreground">{day.summary}</p>
                {day.activities.length > 0 && (
                  <ul className="text-xs text-muted-foreground mt-2 space-y-0.5">
                    {day.activities.map((a, i) => (
                      <li key={i} className="flex items-center gap-1">
                        <ChevronRight className="h-3 w-3" />
                        {a}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle icon={Home} title="Stay guide (₹1500 max)" />
        <Card className="rounded-2xl">
          <CardContent className="p-4 space-y-4">
            <div>
              <p className="text-xs font-black uppercase text-muted-foreground mb-2">
                Stay only in
              </p>
              <ul className="space-y-1">
                {plan.stayGuide.recommendedAreas.map((area, i) => (
                  <li key={i} className="text-sm font-bold flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                    {area}
                  </li>
                ))}
              </ul>
            </div>
            {plan.stayGuide.bookingRule && (
              <p className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 p-3 rounded-xl">
                {plan.stayGuide.bookingRule}
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              {plan.stayGuide.options.map((opt) => (
                <div
                  key={opt.id}
                  className="p-3 rounded-xl border bg-muted/30 space-y-1"
                >
                  <p className="font-black text-sm">{opt.title}</p>
                  <p className="text-xs text-primary font-bold">{opt.priceRange}</p>
                  <p className="text-xs text-muted-foreground">{opt.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <SectionTitle icon={Heart} title="Romantic & highlight moments" />
        <div className="grid gap-3 sm:grid-cols-2">
          {plan.romanticMoments.map((m) => (
            <Card key={m.id} className="rounded-2xl overflow-hidden">
              {m.imageUrl && (
                <div className="relative h-32">
                  <Image
                    src={m.imageUrl}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}
              <CardContent className="p-4">
                <p className="text-[10px] font-black uppercase text-primary tracking-widest">
                  {m.dayLabel}
                  {m.timeOfDay ? ` · ${m.timeOfDay}` : ''}
                </p>
                <p className="font-black mt-1">{m.location}</p>
                <p className="text-sm text-muted-foreground mt-1">{m.tip}</p>
                {m.bullets?.map((b, i) => (
                  <p key={i} className="text-xs mt-1">
                    • {b}
                  </p>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle icon={CloudRain} title="Monsoon backup" />
        <div className="grid gap-2">
          {plan.monsoonBackup.map((b) => (
            <Card key={b.id} className="rounded-xl">
              <CardContent className="p-4 flex gap-3">
                <Badge variant="outline" className="shrink-0 h-fit font-black">
                  {b.label}
                </Badge>
                <div>
                  <p className="font-bold text-sm">{b.title}</p>
                  <ul className="text-sm text-muted-foreground mt-1">
                    {b.items.map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle icon={Wallet} title="Daily expense tracker" />
        <Card className="rounded-2xl bg-muted/30">
          <CardContent className="p-4 space-y-3 text-sm">
            <p className="font-bold">Copy to Notes each day:</p>
            <div className="font-mono text-xs bg-background p-3 rounded-xl border whitespace-pre-wrap leading-relaxed">
              {`📅 DAY ___ (DATE)
🏠 Stay: ₹____
🏍️ Transport: ₹____
🍛 Food: B/L/D ₹____
🎟️ Entry / misc: ₹____
💰 TOTAL: ₹____
👥 Paid: You / GF / Sudhakar`}
            </div>
            <ul className="text-xs text-muted-foreground space-y-1">
              {plan.expenseTemplate.categories.map((c, i) => (
                <li key={i}>• {c}</li>
              ))}
            </ul>
            {plan.expenseTemplate.splitNote && (
              <p className="text-xs font-bold text-primary">
                {plan.expenseTemplate.splitNote}
              </p>
            )}
            <Button variant="outline" size="sm" className="rounded-xl" asChild>
              <a href={`/trips/${plan.tripId}/expenses`}>Open expenses →</a>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function PlanHeader({
  plan,
  canEdit,
  mode,
  saving,
  onModeChange,
  onPersist,
  onReset,
}: {
  plan: TripPlan;
  canEdit: boolean;
  mode: 'view' | 'edit';
  saving: boolean;
  onModeChange: (m: 'view' | 'edit') => void;
  onPersist: (plan: TripPlan) => Promise<void>;
  onReset: () => Promise<void>;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 className="text-2xl font-black tracking-tight">
          {plan.title || 'Trip plan'}
        </h2>
        <p className="text-sm text-muted-foreground font-medium">
          {mode === 'edit'
            ? 'Edit routes, days, photos & backup plans'
            : 'Routes, stays, highlights & rain backup'}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {canEdit && (
          <>
            <Button
              variant={mode === 'edit' ? 'default' : 'outline'}
              size="sm"
              className="rounded-xl"
              onClick={() => onModeChange(mode === 'edit' ? 'view' : 'edit')}
            >
              {mode === 'edit' ? (
                <>
                  <Eye className="h-4 w-4 mr-1" />
                  Preview
                </>
              ) : (
                <>
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit plan
                </>
              )}
            </Button>
            {mode === 'view' && (
              <>
                <TripPlanCsvImport
                  tripId={plan.tripId}
                  currentPlan={plan}
                  onImport={onPersist}
                  disabled={saving}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={saving}
                  onClick={onReset}
                  className="rounded-xl"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset sample
                </Button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-slate-800 dark:text-slate-200">
      <Icon className="h-4 w-4 text-primary" />
      {title}
    </h3>
  );
}
