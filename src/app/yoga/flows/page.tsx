'use client';

import { useState } from 'react';
import { Activity, Clock, Zap, Play, ArrowRight, Info, CheckCircle2, Star, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { YogaDifficulty, YogaFlow } from '@/types/yoga';
import { YogaSessionPlayer } from '@/components/yoga/YogaSessionPlayer';

// Placeholder data for initial look
const SAMPLE_FLOWS: YogaFlow[] = [
  {
    id: '1',
    name: 'Morning Sun Salutation',
    description: 'A classic sequence to energize your body and focus your mind for the day ahead.',
    difficulty: 'beginner',
    estimatedMinutes: 15,
    poses: [
      { poseId: 'p1', poseName: 'Mountain Pose', durationSeconds: 30 },
      { poseId: 'p2', poseName: 'Hands Up', durationSeconds: 20 },
      { poseId: 'p3', poseName: 'Forward Fold', durationSeconds: 40 },
      { poseId: 'p4', poseName: 'Plank', durationSeconds: 30 },
      { poseId: 'p5', poseName: 'Cobra', durationSeconds: 40 },
      { poseId: 'p6', poseName: 'Downward Dog', durationSeconds: 60 },
    ],
  },
  {
    id: '2',
    name: 'Deep Hip Opening',
    description: 'Focus on releasing tension in the hips and lower back with long, sustained holds.',
    difficulty: 'intermediate',
    estimatedMinutes: 30,
    poses: [
      { poseId: 'h1', poseName: 'Butterfly', durationSeconds: 120 },
      { poseId: 'h2', poseName: 'Pigeon (Right)', durationSeconds: 180 },
      { poseId: 'h3', poseName: 'Pigeon (Left)', durationSeconds: 180 },
      { poseId: 'h4', poseName: 'Happy Baby', durationSeconds: 120 },
    ],
  },
  {
    id: '3',
    name: 'Core & Balance Power',
    description: 'Build strength and stability with this intense flow focusing on core engagement.',
    difficulty: 'advanced',
    estimatedMinutes: 45,
    poses: [
      { poseId: 'c1', poseName: 'Boat Pose', durationSeconds: 60 },
      { poseId: 'c2', poseName: 'Crow Pose', durationSeconds: 45 },
      { poseId: 'c3', poseName: 'Side Plank (Right)', durationSeconds: 45 },
      { poseId: 'c4', poseName: 'Side Plank (Left)', durationSeconds: 45 },
    ],
  },
  {
    id: '4',
    name: 'Bedtime Relaxation',
    description: 'Calm your nervous system and prepare for a deep sleep with gentle stretches.',
    difficulty: 'beginner',
    estimatedMinutes: 10,
    poses: [
      { poseId: 'b1', poseName: 'Seated Side Stretch', durationSeconds: 60 },
      { poseId: 'b2', poseName: 'Child\'s Pose', durationSeconds: 120 },
      { poseId: 'b3', poseName: 'Legs Up The Wall', durationSeconds: 300 },
    ],
  },
];

export default function YogaFlowsPage() {
  const [filter, setFilter] = useState<YogaDifficulty | 'all'>('all');
  const [activeFlow, setActiveFlow] = useState<YogaFlow | null>(null);

  const filteredFlows = SAMPLE_FLOWS.filter(f => filter === 'all' || f.difficulty === filter);

  return (
    <div className="space-y-8">
      {activeFlow && (
        <YogaSessionPlayer 
          flow={activeFlow} 
          onClose={() => setActiveFlow(null)} 
        />
      )}
      {/* Header */}
      <header>
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-rose-500/10 p-2 rounded-xl text-rose-500">
            <Activity className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-primary">Yoga Flows</h1>
        </div>
        <p className="text-muted-foreground font-medium">Follow structured sequences designed for your goals.</p>
      </header>

      {/* Filters */}
      <div>
        <div className="flex flex-wrap gap-2">
          {['all', 'beginner', 'intermediate', 'advanced'].map((d) => (
            <button
              key={d}
              onClick={() => setFilter(d as any)}
              className={cn(
                'px-4 py-2 rounded-full text-xs font-bold transition-all border uppercase tracking-wider',
                filter === d
                  ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/20'
                  : 'bg-background border-border text-muted-foreground hover:border-rose-500/30'
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Flows Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredFlows.map((flow) => (
          <Card key={flow.id} className="group border-none bg-muted/20 hover:bg-muted/40 transition-all duration-300 rounded-[32px] overflow-hidden border border-transparent hover:border-rose-500/10">
            <CardContent className="p-0 flex flex-col md:flex-row h-full">
              {/* Image side */}
              <div className="w-full md:w-48 bg-muted/50 flex items-center justify-center relative overflow-hidden shrink-0">
                <Zap className="h-10 w-10 text-muted-foreground/20" />
                <div className="absolute top-4 left-4">
                  <div className="bg-white/90 dark:bg-black/80 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                    <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                    <span className="text-[10px] font-black uppercase tracking-tighter">Premium</span>
                  </div>
                </div>
              </div>
              
              <div className="p-8 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-2">
                    <span className={cn(
                      'px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest',
                      flow.difficulty === 'beginner' ? 'bg-emerald-500/10 text-emerald-600' :
                      flow.difficulty === 'intermediate' ? 'bg-amber-500/10 text-amber-600' :
                      'bg-rose-500/10 text-rose-600'
                    )}>
                      {flow.difficulty}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {flow.estimatedMinutes}m
                    </span>
                  </div>
                </div>

                <h3 className="text-2xl font-black mb-3 group-hover:text-rose-500 transition-colors">{flow.name}</h3>
                <p className="text-sm font-medium text-muted-foreground/80 mb-6 leading-relaxed">
                  {flow.description}
                </p>

                <div className="mt-auto flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">
                    {flow.poses.length} Poses included
                  </span>
                  <Button 
                    onClick={() => setActiveFlow(flow)}
                    className="rounded-2xl font-bold uppercase tracking-widest text-[10px] h-10 px-6 bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/20 group-hover:scale-105 transition-transform"
                  >
                    <Play className="h-3.5 w-3.5 mr-2 fill-current" />
                    Start Flow
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredFlows.length === 0 && (
        <div className="text-center py-20 bg-muted/20 rounded-[40px] border-2 border-dashed border-muted">
          <Info className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-black text-muted-foreground">No flows found</h3>
          <p className="text-sm font-bold text-muted-foreground/60">Try adjusting your filters.</p>
        </div>
      )}
    </div>
  );
}
