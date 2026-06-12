'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Flower2, 
  BookOpen, 
  Activity, 
  Heart, 
  Camera,
  ArrowRight,
  Clock,
  Sparkles,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { YogaSessionPlayer } from '@/components/yoga/YogaSessionPlayer';
import { YogaAttendanceCalendar } from '@/components/yoga/YogaAttendanceCalendar';
import { YogaWeeklyAnalytics } from '@/components/yoga/YogaWeeklyAnalytics';
import { YogaFlow, YogaSessionLog, MeditationLog } from '@/types/yoga';
import { getYogaSessionLogs, getMeditationLogs, getYogaPoses, getYogaMatesForOwner } from '@/firebase/firestore';
import { useAuth } from '@/hooks/useAuth';

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
  const { uid } = useAuth();
  const [activeFlow, setActiveFlow] = useState<YogaFlow | null>(null);
  const [sessionLogs, setSessionLogs] = useState<YogaSessionLog[]>([]);
  const [meditationLogs, setMeditationLogs] = useState<MeditationLog[]>([]);
  const [mates, setMates] = useState<any[]>([]);
  const [posesCount, setPosesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      if (!uid) return;
      try {
        const [sLogs, mLogs, poses, matesData] = await Promise.all([
          getYogaSessionLogs(uid),
          getMeditationLogs(uid),
          getYogaPoses(),
          getYogaMatesForOwner(uid)
        ]);
        setSessionLogs(sLogs);
        setMeditationLogs(mLogs);
        setPosesCount(poses.length);
        setMates(matesData.filter(m => m.inviteStatus === 'accepted'));
      } catch (error) {
        console.error('Failed to load dashboard stats', error);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [uid]);

  const stats = useMemo(() => {
    const totalMinutes = meditationLogs.reduce((sum, l) => sum + l.durationMinutes, 0);
    
    // Simple streak calculation
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    const dates = new Set([...sessionLogs, ...meditationLogs].map(l => l.date));
    
    let checkDate = new Date();
    while (dates.has(checkDate.toISOString().split('T')[0])) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return [
      { label: 'Total Sessions', value: sessionLogs.length.toString(), icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
      { label: 'Mindful Mins', value: totalMinutes.toString(), icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10' },
      { label: 'Poses Learned', value: posesCount.toString(), icon: BookOpen, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
      { label: 'Current Streak', value: streak.toString(), icon: Sparkles, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    ];
  }, [sessionLogs, meditationLogs, posesCount]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Opening your Zen Space...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {activeFlow && (
        <YogaSessionPlayer 
          flow={activeFlow} 
          onClose={() => {
            setActiveFlow(null);
            // Refresh logs after session
            if (uid) {
              getYogaSessionLogs(uid).then(setSessionLogs);
              getMeditationLogs(uid).then(setMeditationLogs);
            }
          }} 
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
        {stats.map((stat, i) => (
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

      {/* Analytics & Attendance Section */}
      <div className="grid lg:grid-cols-2 gap-8">
        <YogaWeeklyAnalytics sessionLogs={sessionLogs} meditationLogs={meditationLogs} />
        <YogaAttendanceCalendar sessionLogs={sessionLogs} meditationLogs={meditationLogs} />
      </div>

      {/* Yoga Mates & Quick Links */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Mates Preview */}
        <Card className="lg:col-span-1 border-none bg-muted/20 rounded-[32px] overflow-hidden">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-lg">Yoga Mates</h3>
              <Link href="/yoga/mates">
                <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest text-primary">Manage</Button>
              </Link>
            </div>
            
            <div className="space-y-4">
              {mates.slice(0, 3).map((mate) => (
                <div key={mate.id} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-xs">
                    {mate.partnerName[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{mate.partnerName}</p>
                    <p className="text-[10px] text-muted-foreground font-medium truncate">Active Yogi</p>
                  </div>
                </div>
              ))}
              
              {mates.length === 0 && (
                <p className="text-xs font-medium text-muted-foreground italic">No active mates. Invite some to practice together!</p>
              )}
              
              {mates.length > 3 && (
                <p className="text-[10px] font-black text-center text-muted-foreground pt-2">+{mates.length - 3} more mates</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Link href="/yoga/library" className="group">
          <Card className="border-none bg-indigo-50 dark:bg-indigo-500/5 hover:bg-indigo-100 dark:hover:bg-indigo-500/10 transition-all duration-300 rounded-[32px] overflow-hidden cursor-pointer border border-indigo-100 dark:border-indigo-500/10 h-full">
            <CardContent className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className="bg-indigo-500 text-white p-4 rounded-2xl shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform">
                  <BookOpen className="h-6 w-6" />
                </div>
                <ArrowRight className="h-5 w-5 text-indigo-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <h3 className="text-xl font-black text-indigo-900 dark:text-indigo-400 mb-2">Pose Library</h3>
              <p className="text-sm font-medium text-indigo-700/70 dark:text-indigo-400/70">Explore asanas with detailed instructions and benefits.</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/yoga/flows" className="group">
          <Card className="border-none bg-rose-50 dark:bg-rose-500/5 hover:bg-rose-100 dark:hover:bg-rose-500/10 transition-all duration-300 rounded-[32px] overflow-hidden cursor-pointer border border-rose-100 dark:border-rose-500/10 h-full">
            <CardContent className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className="bg-rose-500 text-white p-4 rounded-2xl shadow-lg shadow-rose-500/30 group-hover:scale-110 transition-transform">
                  <Activity className="h-6 w-6" />
                </div>
                <ArrowRight className="h-5 w-5 text-rose-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <h3 className="text-xl font-black text-rose-900 dark:text-rose-400 mb-2">Yoga Flows</h3>
              <p className="text-sm font-medium text-rose-700/70 dark:text-rose-400/70">Follow structured sequences designed for your goals.</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
