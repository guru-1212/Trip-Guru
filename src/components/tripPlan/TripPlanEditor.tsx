'use client';

import { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import {
  TripPlan,
  TripPlanBackupOption,
  TripPlanDay,
  TripPlanMoment,
  TripPlanRoute,
  TripPlanRouteStop,
  TripPlanStayOption,
} from '@/types/tripPlan';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TripPlanImageField } from './TripPlanImageField';
import { linesToList, listToLines, newPlanId } from '@/lib/tripPlanUtils';

export function TripPlanEditor({
  plan,
  saving,
  onSave,
}: {
  plan: TripPlan;
  saving: boolean;
  onSave: (plan: TripPlan) => Promise<void>;
}) {
  const [draft, setDraft] = useState<TripPlan>(plan);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(plan);
    setDirty(false);
  }, [plan]);

  const patch = (next: TripPlan) => {
    setDraft(next);
    setDirty(true);
  };

  const handleSave = async () => {
    await onSave(draft);
    setDirty(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-primary/5 border border-primary/20">
        <p className="text-sm font-medium text-muted-foreground">
          {dirty ? 'Unsaved changes' : 'All changes saved'}
        </p>
        <Button
          size="sm"
          className="rounded-xl font-black uppercase tracking-widest text-[10px]"
          disabled={saving || !dirty}
          onClick={handleSave}
        >
          <Save className="h-4 w-4 mr-1" />
          {saving ? 'Saving…' : 'Save plan'}
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1 rounded-2xl">
          <TabsTrigger value="overview" className="rounded-xl text-xs font-bold">
            Overview
          </TabsTrigger>
          <TabsTrigger value="routes" className="rounded-xl text-xs font-bold">
            Routes
          </TabsTrigger>
          <TabsTrigger value="days" className="rounded-xl text-xs font-bold">
            Days
          </TabsTrigger>
          <TabsTrigger value="stay" className="rounded-xl text-xs font-bold">
            Stay
          </TabsTrigger>
          <TabsTrigger value="moments" className="rounded-xl text-xs font-bold">
            Moments
          </TabsTrigger>
          <TabsTrigger value="more" className="rounded-xl text-xs font-bold">
            Backup & notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-0">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg">Plan overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Plan title">
                <Input
                  value={draft.title ?? ''}
                  onChange={(e) =>
                    patch({ ...draft, title: e.target.value })
                  }
                  className="rounded-xl"
                />
              </Field>
              <Field label="Budget total (₹)">
                <Input
                  type="number"
                  min={0}
                  value={draft.budgetTotal}
                  onChange={(e) =>
                    patch({
                      ...draft,
                      budgetTotal: Number(e.target.value) || 0,
                    })
                  }
                  className="rounded-xl"
                />
              </Field>
              <TripPlanImageField
                tripId={draft.tripId}
                storageKey="cover"
                label="Cover banner image"
                imageUrl={draft.coverImageUrl}
                imageKeyword="nature"
                onChange={(coverImageUrl) =>
                  patch({ ...draft, coverImageUrl })
                }
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="routes" className="space-y-4 mt-0">
          {draft.routes.map((route, ri) => (
            <Card key={route.id} className="rounded-2xl">
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <CardTitle className="text-base">Route {ri + 1}</CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive shrink-0"
                  onClick={() =>
                    patch({
                      ...draft,
                      routes: draft.routes.filter((r) => r.id !== route.id),
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field label="Title">
                  <Input
                    value={route.title}
                    onChange={(e) => {
                      const routes = [...draft.routes];
                      routes[ri] = { ...route, title: e.target.value };
                      patch({ ...draft, routes });
                    }}
                    className="rounded-xl"
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Subtitle">
                    <Input
                      value={route.subtitle ?? ''}
                      onChange={(e) => {
                        const routes = [...draft.routes];
                        routes[ri] = { ...route, subtitle: e.target.value };
                        patch({ ...draft, routes });
                      }}
                      className="rounded-xl"
                    />
                  </Field>
                  <Field label="Day range">
                    <Input
                      value={route.dayRange ?? ''}
                      onChange={(e) => {
                        const routes = [...draft.routes];
                        routes[ri] = { ...route, dayRange: e.target.value };
                        patch({ ...draft, routes });
                      }}
                      className="rounded-xl"
                    />
                  </Field>
                </div>

                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Stops (in order)
                </p>
                {route.stops.map((stop, si) => (
                  <div
                    key={stop.id}
                    className="p-3 rounded-xl border bg-muted/20 space-y-3"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold">Stop #{stop.order}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-destructive"
                        onClick={() => {
                          const routes = [...draft.routes];
                          routes[ri] = {
                            ...route,
                            stops: route.stops.filter((s) => s.id !== stop.id),
                          };
                          patch({ ...draft, routes });
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Name">
                        <Input
                          value={stop.name}
                          onChange={(e) =>
                            updateStop(draft, patch, ri, si, {
                              name: e.target.value,
                            })
                          }
                          className="rounded-xl"
                        />
                      </Field>
                      <Field label="Order">
                        <Input
                          type="number"
                          min={1}
                          value={stop.order}
                          onChange={(e) =>
                            updateStop(draft, patch, ri, si, {
                              order: Number(e.target.value) || 1,
                            })
                          }
                          className="rounded-xl"
                        />
                      </Field>
                    </div>
                    <Field label="Note">
                      <Input
                        value={stop.note ?? ''}
                        onChange={(e) =>
                          updateStop(draft, patch, ri, si, {
                            note: e.target.value,
                          })
                        }
                        className="rounded-xl"
                      />
                    </Field>
                    <Field label="Image keyword (stock fallback)">
                      <Input
                        value={stop.imageKeyword ?? ''}
                        onChange={(e) =>
                          updateStop(draft, patch, ri, si, {
                            imageKeyword: e.target.value,
                          })
                        }
                        className="rounded-xl"
                      />
                    </Field>
                    <TripPlanImageField
                      tripId={draft.tripId}
                      storageKey={`stops/${stop.id}`}
                      label="Stop photo"
                      imageUrl={stop.imageUrl}
                      imageKeyword={stop.imageKeyword}
                      compact
                      onChange={(imageUrl) =>
                        updateStop(draft, patch, ri, si, { imageUrl })
                      }
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => {
                    const routes = [...draft.routes];
                    const order =
                      route.stops.length > 0
                        ? Math.max(...route.stops.map((s) => s.order)) + 1
                        : 1;
                    const newStop: TripPlanRouteStop = {
                      id: newPlanId('stop'),
                      name: 'New stop',
                      order,
                    };
                    routes[ri] = {
                      ...route,
                      stops: [...route.stops, newStop],
                    };
                    patch({ ...draft, routes });
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add stop
                </Button>
              </CardContent>
            </Card>
          ))}
          <Button
            type="button"
            variant="outline"
            className="rounded-xl w-full"
            onClick={() => {
              const newRoute: TripPlanRoute = {
                id: newPlanId('route'),
                title: 'New route',
                stops: [],
              };
              patch({ ...draft, routes: [...draft.routes, newRoute] });
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add route
          </Button>
        </TabsContent>

        <TabsContent value="days" className="space-y-4 mt-0">
          {draft.days.map((day, di) => (
            <Card key={day.id} className="rounded-2xl">
              <CardHeader className="flex flex-row items-start justify-between">
                <CardTitle className="text-base">Day {day.dayNumber}</CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() =>
                    patch({
                      ...draft,
                      days: draft.days.filter((d) => d.id !== day.id),
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Day #">
                    <Input
                      type="number"
                      min={1}
                      value={day.dayNumber}
                      onChange={(e) => updateDay(draft, patch, di, {
                        dayNumber: Number(e.target.value) || 1,
                      })}
                      className="rounded-xl"
                    />
                  </Field>
                  <Field label="Date label">
                    <Input
                      value={day.date ?? ''}
                      onChange={(e) =>
                        updateDay(draft, patch, di, { date: e.target.value })
                      }
                      className="rounded-xl"
                    />
                  </Field>
                  <Field label="Image keyword">
                    <Input
                      value={day.imageKeyword ?? ''}
                      onChange={(e) =>
                        updateDay(draft, patch, di, {
                          imageKeyword: e.target.value,
                        })
                      }
                      className="rounded-xl"
                    />
                  </Field>
                </div>
                <Field label="Title">
                  <Input
                    value={day.title}
                    onChange={(e) =>
                      updateDay(draft, patch, di, { title: e.target.value })
                    }
                    className="rounded-xl"
                  />
                </Field>
                <Field label="Summary">
                  <Textarea
                    value={day.summary}
                    onChange={(e) =>
                      updateDay(draft, patch, di, { summary: e.target.value })
                    }
                    className="rounded-xl"
                  />
                </Field>
                <Field label="Activities (one per line)">
                  <Textarea
                    value={listToLines(day.activities)}
                    onChange={(e) =>
                      updateDay(draft, patch, di, {
                        activities: linesToList(e.target.value),
                      })
                    }
                    className="rounded-xl font-mono text-sm"
                    rows={3}
                  />
                </Field>
                <TripPlanImageField
                  tripId={draft.tripId}
                  storageKey={`days/${day.id}`}
                  label="Day card image"
                  imageUrl={day.imageUrl}
                  imageKeyword={day.imageKeyword}
                  onChange={(imageUrl) =>
                    updateDay(draft, patch, di, { imageUrl })
                  }
                />
              </CardContent>
            </Card>
          ))}
          <Button
            type="button"
            variant="outline"
            className="rounded-xl w-full"
            onClick={() => {
              const n =
                draft.days.length > 0
                  ? Math.max(...draft.days.map((d) => d.dayNumber)) + 1
                  : 1;
              const newDay: TripPlanDay = {
                id: newPlanId('day'),
                dayNumber: n,
                title: `Day ${n}`,
                summary: '',
                activities: [],
              };
              patch({ ...draft, days: [...draft.days, newDay] });
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add day
          </Button>
        </TabsContent>

        <TabsContent value="stay" className="space-y-4 mt-0">
          <Card className="rounded-2xl">
            <CardContent className="p-4 space-y-4">
              <Field label="Recommended areas (one per line)">
                <Textarea
                  value={listToLines(draft.stayGuide.recommendedAreas)}
                  onChange={(e) =>
                    patch({
                      ...draft,
                      stayGuide: {
                        ...draft.stayGuide,
                        recommendedAreas: linesToList(e.target.value),
                      },
                    })
                  }
                  className="rounded-xl"
                  rows={4}
                />
              </Field>
              <Field label="Booking rule">
                <Textarea
                  value={draft.stayGuide.bookingRule ?? ''}
                  onChange={(e) =>
                    patch({
                      ...draft,
                      stayGuide: {
                        ...draft.stayGuide,
                        bookingRule: e.target.value,
                      },
                    })
                  }
                  className="rounded-xl"
                  rows={2}
                />
              </Field>
            </CardContent>
          </Card>

          {draft.stayGuide.options.map((opt, oi) => (
            <Card key={opt.id} className="rounded-2xl">
              <CardHeader className="flex flex-row justify-between">
                <CardTitle className="text-sm">Stay option</CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() =>
                    patch({
                      ...draft,
                      stayGuide: {
                        ...draft.stayGuide,
                        options: draft.stayGuide.options.filter(
                          (o) => o.id !== opt.id
                        ),
                      },
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <Field label="Title">
                  <Input
                    value={opt.title}
                    onChange={(e) => updateStayOpt(draft, patch, oi, {
                      title: e.target.value,
                    })}
                    className="rounded-xl"
                  />
                </Field>
                <Field label="Price range">
                  <Input
                    value={opt.priceRange}
                    onChange={(e) =>
                      updateStayOpt(draft, patch, oi, {
                        priceRange: e.target.value,
                      })
                    }
                    className="rounded-xl"
                  />
                </Field>
                <Field label="Description">
                  <Textarea
                    value={opt.description}
                    onChange={(e) =>
                      updateStayOpt(draft, patch, oi, {
                        description: e.target.value,
                      })
                    }
                    className="rounded-xl"
                    rows={2}
                  />
                </Field>
              </CardContent>
            </Card>
          ))}
          <Button
            type="button"
            variant="outline"
            className="rounded-xl w-full"
            onClick={() => {
              const opt: TripPlanStayOption = {
                id: newPlanId('stay'),
                title: 'New option',
                priceRange: '',
                description: '',
              };
              patch({
                ...draft,
                stayGuide: {
                  ...draft.stayGuide,
                  options: [...draft.stayGuide.options, opt],
                },
              });
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add stay option
          </Button>
        </TabsContent>

        <TabsContent value="moments" className="space-y-4 mt-0">
          {draft.romanticMoments.map((m, mi) => (
            <Card key={m.id} className="rounded-2xl">
              <CardHeader className="flex flex-row justify-between">
                <CardTitle className="text-sm">{m.location || 'Moment'}</CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() =>
                    patch({
                      ...draft,
                      romanticMoments: draft.romanticMoments.filter(
                        (x) => x.id !== m.id
                      ),
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Day label">
                    <Input
                      value={m.dayLabel}
                      onChange={(e) =>
                        updateMoment(draft, patch, mi, {
                          dayLabel: e.target.value,
                        })
                      }
                      className="rounded-xl"
                    />
                  </Field>
                  <Field label="Time of day">
                    <Input
                      value={m.timeOfDay ?? ''}
                      onChange={(e) =>
                        updateMoment(draft, patch, mi, {
                          timeOfDay: e.target.value,
                        })
                      }
                      className="rounded-xl"
                    />
                  </Field>
                </div>
                <Field label="Location">
                  <Input
                    value={m.location}
                    onChange={(e) =>
                      updateMoment(draft, patch, mi, {
                        location: e.target.value,
                      })
                    }
                    className="rounded-xl"
                  />
                </Field>
                <Field label="Tip">
                  <Textarea
                    value={m.tip}
                    onChange={(e) =>
                      updateMoment(draft, patch, mi, { tip: e.target.value })
                    }
                    className="rounded-xl"
                    rows={2}
                  />
                </Field>
                <Field label="Bullets (one per line)">
                  <Textarea
                    value={listToLines(m.bullets ?? [])}
                    onChange={(e) =>
                      updateMoment(draft, patch, mi, {
                        bullets: linesToList(e.target.value),
                      })
                    }
                    className="rounded-xl text-sm"
                    rows={2}
                  />
                </Field>
                <TripPlanImageField
                  tripId={draft.tripId}
                  storageKey={`moments/${m.id}`}
                  label="Moment photo"
                  imageUrl={m.imageUrl}
                  imageKeyword={m.imageKeyword}
                  onChange={(imageUrl) =>
                    updateMoment(draft, patch, mi, { imageUrl })
                  }
                />
              </CardContent>
            </Card>
          ))}
          <Button
            type="button"
            variant="outline"
            className="rounded-xl w-full"
            onClick={() => {
              const m: TripPlanMoment = {
                id: newPlanId('moment'),
                dayLabel: 'New day',
                location: 'Location',
                tip: '',
              };
              patch({
                ...draft,
                romanticMoments: [...draft.romanticMoments, m],
              });
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add moment
          </Button>
        </TabsContent>

        <TabsContent value="more" className="space-y-4 mt-0">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            Monsoon backup options
          </p>
          {draft.monsoonBackup.map((b, bi) => (
            <Card key={b.id} className="rounded-2xl">
              <CardHeader className="flex flex-row justify-between py-3">
                <Input
                  value={b.label}
                  onChange={(e) => updateBackup(draft, patch, bi, {
                    label: e.target.value,
                  })}
                  className="rounded-xl max-w-[140px] font-black"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() =>
                    patch({
                      ...draft,
                      monsoonBackup: draft.monsoonBackup.filter(
                        (x) => x.id !== b.id
                      ),
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <Field label="Title">
                  <Input
                    value={b.title}
                    onChange={(e) =>
                      updateBackup(draft, patch, bi, { title: e.target.value })
                    }
                    className="rounded-xl"
                  />
                </Field>
                <Field label="Items (one per line)">
                  <Textarea
                    value={listToLines(b.items)}
                    onChange={(e) =>
                      updateBackup(draft, patch, bi, {
                        items: linesToList(e.target.value),
                      })
                    }
                    className="rounded-xl"
                    rows={3}
                  />
                </Field>
              </CardContent>
            </Card>
          ))}
          <Button
            type="button"
            variant="outline"
            className="rounded-xl w-full"
            onClick={() => {
              const b: TripPlanBackupOption = {
                id: newPlanId('backup'),
                label: 'OPTION',
                title: 'New backup plan',
                items: [],
              };
              patch({
                ...draft,
                monsoonBackup: [...draft.monsoonBackup, b],
              });
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add backup option
          </Button>

          <Card className="rounded-2xl mt-6">
            <CardHeader>
              <CardTitle className="text-base">Expense template</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="Categories (one per line)">
                <Textarea
                  value={listToLines(draft.expenseTemplate.categories)}
                  onChange={(e) =>
                    patch({
                      ...draft,
                      expenseTemplate: {
                        ...draft.expenseTemplate,
                        categories: linesToList(e.target.value),
                      },
                    })
                  }
                  className="rounded-xl"
                  rows={5}
                />
              </Field>
              <Field label="Split note">
                <Input
                  value={draft.expenseTemplate.splitNote ?? ''}
                  onChange={(e) =>
                    patch({
                      ...draft,
                      expenseTemplate: {
                        ...draft.expenseTemplate,
                        splitNote: e.target.value,
                      },
                    })
                  }
                  className="rounded-xl"
                />
              </Field>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function updateStop(
  draft: TripPlan,
  patch: (p: TripPlan) => void,
  ri: number,
  si: number,
  partial: Partial<TripPlanRouteStop>
) {
  const routes = [...draft.routes];
  const route = routes[ri];
  const stops = [...route.stops];
  stops[si] = { ...stops[si], ...partial };
  routes[ri] = { ...route, stops };
  patch({ ...draft, routes });
}

function updateDay(
  draft: TripPlan,
  patch: (p: TripPlan) => void,
  di: number,
  partial: Partial<TripPlanDay>
) {
  const days = [...draft.days];
  days[di] = { ...days[di], ...partial };
  patch({ ...draft, days });
}

function updateMoment(
  draft: TripPlan,
  patch: (p: TripPlan) => void,
  mi: number,
  partial: Partial<TripPlanMoment>
) {
  const romanticMoments = [...draft.romanticMoments];
  romanticMoments[mi] = { ...romanticMoments[mi], ...partial };
  patch({ ...draft, romanticMoments });
}

function updateStayOpt(
  draft: TripPlan,
  patch: (p: TripPlan) => void,
  oi: number,
  partial: Partial<TripPlanStayOption>
) {
  const options = [...draft.stayGuide.options];
  options[oi] = { ...options[oi], ...partial };
  patch({
    ...draft,
    stayGuide: { ...draft.stayGuide, options },
  });
}

function updateBackup(
  draft: TripPlan,
  patch: (p: TripPlan) => void,
  bi: number,
  partial: Partial<TripPlanBackupOption>
) {
  const monsoonBackup = [...draft.monsoonBackup];
  monsoonBackup[bi] = { ...monsoonBackup[bi], ...partial };
  patch({ ...draft, monsoonBackup });
}
