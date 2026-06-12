'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  RotateCcw, 
  CheckCircle2, 
  ChevronRight,
  Clock,
  ArrowLeft,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { YogaFlow, YogaFlowItem } from '@/types/yoga';
import { createYogaSessionLog } from '@/firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface YogaSessionPlayerProps {
  flow: YogaFlow;
  onClose: () => void;
}

export function YogaSessionPlayer({ flow, onClose }: YogaSessionPlayerProps) {
  const { uid } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(flow.poses[0]?.durationSeconds || 30);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [completedPoses, setCompletedPoses] = useState<number>(0);

  const currentPose = flow.poses[currentIndex];

  useEffect(() => {
    let interval: any = null;
    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((s) => s - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isActive) {
      handleNext();
    }
    return () => clearInterval(interval);
  }, [isActive, secondsLeft]);

  const toggleTimer = () => setIsActive(!isActive);

  const handleNext = useCallback(() => {
    if (currentIndex < flow.poses.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSecondsLeft(flow.poses[currentIndex + 1].durationSeconds);
      setCompletedPoses((c) => c + 1);
      setIsActive(true);
    } else {
      setCompletedPoses((c) => c + 1);
      setIsFinished(true);
      setIsActive(false);
      handleSessionComplete();
    }
  }, [currentIndex, flow.poses]);

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setSecondsLeft(flow.poses[currentIndex - 1].durationSeconds);
      setIsActive(true);
    }
  };

  const handleSessionComplete = async () => {
    if (!uid) return;
    try {
      await createYogaSessionLog(uid, {
        date: new Date().toISOString().split('T')[0],
        flowId: flow.id,
        flowName: flow.name,
        durationMinutes: flow.estimatedMinutes,
        completedPosesCount: flow.poses.length,
        notes: 'Session completed via player',
      });
      toast.success('Zen session logged!');
    } catch (error) {
      console.error('Failed to log session:', error);
      toast.error('Failed to save session stats');
    }
  };

  const progress = currentPose 
    ? ((currentPose.durationSeconds - secondsLeft) / currentPose.durationSeconds) * 100
    : 0;

  const totalProgress = ((currentIndex) / flow.poses.length) * 100;

  if (isFinished) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="bg-emerald-500 w-24 h-24 rounded-full flex items-center justify-center text-white mx-auto mb-8 shadow-2xl shadow-emerald-500/20">
            <CheckCircle2 className="h-12 w-12" />
          </div>
          <h1 className="text-4xl font-black mb-4">Namaste.</h1>
          <p className="text-muted-foreground font-bold mb-10">You've completed "{flow.name}". You look more balanced already!</p>
          
          <div className="grid grid-cols-2 gap-4 mb-10">
            <div className="bg-muted/30 p-6 rounded-3xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Poses</p>
              <p className="text-2xl font-black">{flow.poses.length}</p>
            </div>
            <div className="bg-muted/30 p-6 rounded-3xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Minutes</p>
              <p className="text-2xl font-black">{flow.estimatedMinutes}</p>
            </div>
          </div>

          <Button 
            onClick={onClose}
            className="w-full rounded-2xl h-14 font-black uppercase tracking-widest text-xs bg-primary hover:bg-primary/90"
          >
            Finish & Exit
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-6">
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
          <X className="h-6 w-6" />
        </Button>
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Flowing through</p>
          <p className="font-black text-sm">{flow.name}</p>
        </div>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Progress Bar */}
      <div className="px-6 mb-8">
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${totalProgress}%` }}
          />
        </div>
      </div>

      {/* Main Player Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8 w-full max-w-lg"
          >
            <div className="aspect-[4/3] bg-muted/30 rounded-[40px] flex items-center justify-center relative overflow-hidden mb-12">
               <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
               <p className="text-6xl font-black text-primary/10 select-none">ASANA</p>
            </div>

            <div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-2">{currentPose.poseName}</h2>
              <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Step {currentIndex + 1} of {flow.poses.length}</p>
            </div>

            {/* Timer */}
            <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
               <svg className="absolute w-full h-full -rotate-90">
                  <circle cx="50%" cy="50%" r="45%" className="fill-none stroke-muted stroke-[4]" />
                  <circle 
                    cx="50%" cy="50%" r="45%" 
                    className="fill-none stroke-primary stroke-[4] transition-all duration-1000 ease-linear"
                    style={{
                      strokeDasharray: '283%',
                      strokeDashoffset: `${283 - (283 * progress) / 100}%`,
                      strokeLinecap: 'round'
                    }}
                  />
               </svg>
               <span className="text-5xl font-black tabular-nums">{secondsLeft}s</span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="p-12 flex items-center justify-center gap-8">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="w-14 h-14 rounded-2xl hover:bg-muted"
        >
          <SkipBack className="h-6 w-6" />
        </Button>

        <Button 
          onClick={toggleTimer}
          className={cn(
            "w-20 h-20 rounded-[28px] shadow-2xl transition-all active:scale-95",
            isActive ? "bg-muted text-foreground" : "bg-primary text-white shadow-primary/20"
          )}
        >
          {isActive ? <Pause className="h-8 w-8 fill-current" /> : <Play className="h-8 w-8 fill-current translate-x-0.5" />}
        </Button>

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleNext}
          className="w-14 h-14 rounded-2xl hover:bg-muted"
        >
          <SkipForward className="h-6 w-6" />
        </Button>
      </div>

      {/* Next Preview */}
      {currentIndex < flow.poses.length - 1 && (
        <div className="px-6 pb-12">
          <div className="bg-muted/20 p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted/40 rounded-lg flex items-center justify-center">
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Up Next</p>
                <p className="font-bold text-sm">{flow.poses[currentIndex + 1].poseName}</p>
              </div>
            </div>
            <span className="text-xs font-bold text-muted-foreground">{flow.poses[currentIndex + 1].durationSeconds}s</span>
          </div>
        </div>
      )}
    </div>
  );
}
