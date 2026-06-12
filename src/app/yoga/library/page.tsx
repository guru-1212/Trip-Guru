'use client';

import { useState, useMemo } from 'react';
import { Search, BookOpen, Filter, ArrowRight, Info, CheckCircle2, Flower2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { YogaDifficulty } from '@/types/yoga';

// Placeholder data for initial look
const SAMPLE_POSES = [
  {
    id: '1',
    name: 'Downward-Facing Dog',
    sanskritName: 'Adho Mukha Svanasana',
    difficulty: 'beginner' as YogaDifficulty,
    targetAreas: ['hamstrings', 'shoulders', 'calves'],
    benefits: ['Energizes the body', 'Strengthens arms and legs', 'Stretches shoulders and hamstrings'],
  },
  {
    id: '2',
    name: 'Tree Pose',
    sanskritName: 'Vrksasana',
    difficulty: 'beginner' as YogaDifficulty,
    targetAreas: ['legs', 'core', 'balance'],
    benefits: ['Improves balance', 'Strengthens thighs and calves', 'Opens hips'],
  },
  {
    id: '3',
    name: 'Crow Pose',
    sanskritName: 'Bakasana',
    difficulty: 'advanced' as YogaDifficulty,
    targetAreas: ['arms', 'core', 'wrists'],
    benefits: ['Strengthens arms and wrists', 'Tones abdominal muscles', 'Improves focus'],
  },
  {
    id: '4',
    name: 'Warrior II',
    sanskritName: 'Virabhadrasana II',
    difficulty: 'intermediate' as YogaDifficulty,
    targetAreas: ['legs', 'hips', 'shoulders'],
    benefits: ['Strengthens and stretches legs and ankles', 'Stimulates abdominal organs', 'Increases stamina'],
  },
];

const DIFFICULTIES: { id: YogaDifficulty | 'all'; label: string }[] = [
  { id: 'all', label: 'All Levels' },
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
];

const TARGET_AREAS = ['all', 'core', 'legs', 'arms', 'back', 'hips', 'shoulders', 'balance'];

export default function YogaLibraryPage() {
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState<YogaDifficulty | 'all'>('all');
  const [targetArea, setTargetArea] = useState('all');

  const filteredPoses = useMemo(() => {
    return SAMPLE_POSES.filter((pose) => {
      const matchesSearch = pose.name.toLowerCase().includes(search.toLowerCase()) || 
                           pose.sanskritName?.toLowerCase().includes(search.toLowerCase());
      const matchesDifficulty = difficulty === 'all' || pose.difficulty === difficulty;
      const matchesTarget = targetArea === 'all' || pose.targetAreas.includes(targetArea);
      return matchesSearch && matchesDifficulty && matchesTarget;
    });
  }, [search, difficulty, targetArea]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <header>
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-primary/10 p-2 rounded-xl text-primary">
            <BookOpen className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-primary">Pose Library</h1>
        </div>
        <p className="text-muted-foreground font-medium">Master every asana with detailed guides.</p>
      </header>

      {/* Search and Filters */}
      <div className="space-y-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            className="w-full bg-muted/40 border-none rounded-[20px] pl-12 pr-4 py-4 font-bold placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            placeholder="Search by English or Sanskrit name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 px-1">Difficulty</p>
            <div className="flex flex-wrap gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDifficulty(d.id)}
                  className={cn(
                    'px-4 py-2 rounded-full text-xs font-bold transition-all border uppercase tracking-wider',
                    difficulty === d.id
                      ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                      : 'bg-background border-border text-muted-foreground hover:border-primary/30'
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 px-1">Target Area</p>
            <div className="flex flex-wrap gap-2">
              {TARGET_AREAS.map((area) => (
                <button
                  key={area}
                  onClick={() => setTargetArea(area)}
                  className={cn(
                    'px-4 py-2 rounded-full text-xs font-bold transition-all border uppercase tracking-wider',
                    targetArea === area
                      ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                      : 'bg-background border-border text-muted-foreground hover:border-primary/30'
                  )}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pose Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPoses.map((pose) => (
          <Card key={pose.id} className="group border-none bg-muted/20 hover:bg-muted/40 transition-all duration-300 rounded-[32px] overflow-hidden border border-transparent hover:border-primary/10">
            <CardContent className="p-0">
              {/* Placeholder for Pose Image */}
              <div className="aspect-[4/3] bg-muted/50 flex items-center justify-center relative overflow-hidden">
                <Flower2 className="h-12 w-12 text-muted-foreground/20" />
                <div className="absolute top-4 right-4">
                  <span className={cn(
                    'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest',
                    pose.difficulty === 'beginner' ? 'bg-emerald-500/10 text-emerald-600' :
                    pose.difficulty === 'intermediate' ? 'bg-amber-500/10 text-amber-600' :
                    'bg-rose-500/10 text-rose-600'
                  )}>
                    {pose.difficulty}
                  </span>
                </div>
              </div>
              
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="text-xl font-black mb-1 group-hover:text-primary transition-colors">{pose.name}</h3>
                  <p className="text-xs font-bold italic text-muted-foreground">{pose.sanskritName}</p>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-6">
                  {pose.targetAreas.map((area) => (
                    <span key={area} className="px-2 py-0.5 rounded-md bg-primary/5 text-primary text-[10px] font-bold uppercase tracking-tighter">
                      {area}
                    </span>
                  ))}
                </div>

                <div className="space-y-2 mb-6">
                  {pose.benefits.slice(0, 2).map((benefit, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      <p className="text-[11px] font-medium leading-tight text-muted-foreground/80">{benefit}</p>
                    </div>
                  ))}
                </div>

                <Button variant="outline" className="w-full rounded-2xl font-bold uppercase tracking-widest text-[10px] h-10 border-primary/20 hover:bg-primary hover:text-white transition-all">
                  View Guide
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPoses.length === 0 && (
        <div className="text-center py-20 bg-muted/20 rounded-[40px] border-2 border-dashed border-muted">
          <Info className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-black text-muted-foreground">No poses found</h3>
          <p className="text-sm font-bold text-muted-foreground/60">Try adjusting your filters or search terms.</p>
        </div>
      )}
    </div>
  );
}
