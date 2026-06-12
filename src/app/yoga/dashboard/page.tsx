'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Flower2, 
  BookOpen, 
  Activity, 
  Heart, 
  Camera,
  ArrowRight,
  Clock,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { YogaSessionPlayer } from '@/components/yoga/YogaSessionPlayer';
import { YogaFlow } from '@/types/yoga';

const DEFAULT_ZEN_FLOW: YogaFlow = {
  id: 'daily-zen',
  name: "Daily Zen Quick Flow",
  description: "A balanced 5-minute flow to center yourself.",
  difficulty: 'beginner',
  estimatedMinutes: 5,
  poses: [
    { poseId: 'p1', poseName: 'Mountain Pose', durationSeconds: 30 },
    { poseId: 'p2', poseName: 'Forward Fold', durationSeconds: 45 },
    { poseId: 'p3', poseName: 'Downward Dog', durationSeconds: 60 },
    { poseId: 'p4', poseName: 'Cobra Pose', durationSeconds: 45 },
    { poseId: 'p5', poseName: 'Child\'s Pose', durationSeconds: 60 },
    { poseId: 'p6', poseName: 'Savasana', durationSeconds: 60 },
  ]
};

export default function YogaDashboardPage() {
  const [activeFlow, setActiveFlow] = useState<YogaFlow | null>(null);

  return (
    <div className="space-y-8">
      {activeFlow && (
        <YogaSessionPlayer 
          flow={activeFlow} 
          onClose={() => setActiveFlow(null)} 
        />
      )}
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-primary">Yoga & Mindfulness</h1>
          <p className="text-muted-foreground font-medium">Find your balance, track your progress.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setActiveFlow(DEFAULT_ZEN_FLOW)}
            className="rounded-2xl font-bold uppercase tracking-widest text-[10px] h-11 px-6 shadow-lg shadow-primary/20"
          >
            Start Today's Zen
          </Button>
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Sessions', value: '0', icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Mindful Mins', value: '0', icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10' },
          { label: 'Poses Learned', value: '0', icon: BookOpen, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Current Streak', value: '0', icon: Sparkles, color: 'text-purple-500', bg: 'bg-purple-500/10' },
        ].map((stat, i) => (
          <Card key={i} className="border-none bg-muted/30 shadow-none rounded-3xl overflow-hidden">
            <CardContent className="p-6">
              <div className={`${stat.bg} ${stat.color} w-10 h-10 rounded-xl flex items-center justify-center mb-3`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-2xl font-black">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Feature Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        <Link href="/yoga/library" className="group">
          <Card className="border-none bg-indigo-50 dark:bg-indigo-500/5 hover:bg-indigo-100 dark:hover:bg-indigo-500/10 transition-all duration-300 rounded-[32px] overflow-hidden cursor-pointer border border-indigo-100 dark:border-indigo-500/10">
            <CardContent className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className="bg-indigo-500 text-white p-4 rounded-2xl shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform">
                  <BookOpen className="h-6 w-6" />
                </div>
                <ArrowRight className="h-5 w-5 text-indigo-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <h3 className="text-xl font-black text-indigo-900 dark:text-indigo-400 mb-2">Pose Library</h3>
              <p className="text-sm font-medium text-indigo-700/70 dark:text-indigo-400/70">Explore over 100 asanas with detailed instructions and benefits.</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/yoga/flows" className="group">
          <Card className="border-none bg-rose-50 dark:bg-rose-500/5 hover:bg-rose-100 dark:hover:bg-rose-500/10 transition-all duration-300 rounded-[32px] overflow-hidden cursor-pointer border border-rose-100 dark:border-rose-500/10">
            <CardContent className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className="bg-rose-500 text-white p-4 rounded-2xl shadow-lg shadow-rose-500/30 group-hover:scale-110 transition-transform">
                  <Activity className="h-6 w-6" />
                </div>
                <ArrowRight className="h-5 w-5 text-rose-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <h3 className="text-xl font-black text-rose-900 dark:text-rose-400 mb-2">Yoga Flows</h3>
              <p className="text-sm font-medium text-rose-700/70 dark:text-rose-400/70">Follow structured sequences for energy, flexibility, or relaxation.</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/yoga/meditation" className="group">
          <Card className="border-none bg-amber-50 dark:bg-amber-500/5 hover:bg-amber-100 dark:hover:bg-amber-500/10 transition-all duration-300 rounded-[32px] overflow-hidden cursor-pointer border border-amber-100 dark:border-amber-500/10">
            <CardContent className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className="bg-amber-500 text-white p-4 rounded-2xl shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform">
                  <Heart className="h-6 w-6" />
                </div>
                <ArrowRight className="h-5 w-5 text-amber-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <h3 className="text-xl font-black text-amber-900 dark:text-amber-400 mb-2">Meditation</h3>
              <p className="text-sm font-medium text-amber-700/70 dark:text-amber-400/70">Track your mindfulness minutes and meditation sessions.</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/yoga/progress" className="group">
          <Card className="border-none bg-emerald-50 dark:bg-emerald-500/5 hover:bg-emerald-100 dark:hover:bg-emerald-100/10 transition-all duration-300 rounded-[32px] overflow-hidden cursor-pointer border border-emerald-100 dark:border-emerald-500/10">
            <CardContent className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className="bg-emerald-500 text-white p-4 rounded-2xl shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">
                  <Camera className="h-6 w-6" />
                </div>
                <ArrowRight className="h-5 w-5 text-emerald-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-400 mb-2">Progress Photos</h3>
              <p className="text-sm font-medium text-emerald-700/70 dark:text-emerald-400/70">Upload photos of your poses to track your alignment and flexibility over time.</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
