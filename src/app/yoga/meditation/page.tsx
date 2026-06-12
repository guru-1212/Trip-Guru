'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Heart, Play, Pause, RotateCcw, Clock, Sparkles, History, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { createMeditationLog } from '@/firebase/firestore';
import toast from 'react-hot-toast';

const PRESET_MINUTES = [5, 10, 15, 20, 30];

export default function MeditationPage() {
  const { uid } = useAuth();
  const [secondsLeft, setSecondsLeft] = useState(600); // Default 10 mins
  const [isActive, setIsActive] = useState(false);
  const [initialSeconds, setInitialSeconds] = useState(600);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((s) => s - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isActive) {
      setIsActive(false);
      setIsCompleted(true);
      handleComplete();
    }
    return () => clearInterval(interval);
  }, [isActive, secondsLeft]);

  const handleComplete = async () => {
    if (!uid) return;
    try {
      const durationMins = Math.round(initialSeconds / 60);
      await createMeditationLog(uid, {
        date: new Date().toISOString().split('T')[0],
        durationMinutes: durationMins,
        type: 'mindfulness',
        notes: 'Session completed via timer',
      });
      toast.success('Meditation session logged!');
    } catch (error) {
      console.error('Failed to log meditation:', error);
      toast.error('Failed to log session');
    }
  };

  const toggleTimer = () => setIsActive(!isActive);
  
  const resetTimer = () => {
    setIsActive(false);
    setSecondsLeft(initialSeconds);
    setIsCompleted(false);
  };

  const setPreset = (mins: number) => {
    const secs = mins * 60;
    setInitialSeconds(secs);
    setSecondsLeft(secs);
    setIsActive(false);
    setIsCompleted(false);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = ((initialSeconds - secondsLeft) / initialSeconds) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <header className="text-center">
        <div className="bg-amber-500/10 w-16 h-16 rounded-[24px] flex items-center justify-center text-amber-500 mx-auto mb-4">
          <Heart className="h-8 w-8 fill-current" />
        </div>
        <h1 className="text-4xl font-black tracking-tight text-primary mb-2">Zen Timer</h1>
        <p className="text-muted-foreground font-medium">Clear your mind. Just breathe.</p>
      </header>

      {/* Timer Circle/UI */}
      <div className="flex justify-center">
        <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
          {/* Progress Circle Background */}
          <svg className="absolute w-full h-full -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              className="fill-none stroke-muted/20 stroke-[6]"
            />
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              className="fill-none stroke-amber-500 stroke-[6] transition-all duration-1000 ease-linear"
              style={{
                strokeDasharray: '283%',
                strokeDashoffset: `${283 - (283 * progress) / 100}%`,
                strokeLinecap: 'round'
              }}
            />
          </svg>
          
          <div className="text-center z-10">
            <p className="text-5xl md:text-7xl font-black tracking-tighter tabular-nums mb-2">
              {formatTime(secondsLeft)}
            </p>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {isActive ? 'Breathing...' : isCompleted ? 'Zen Achieved' : 'Ready to begin'}
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={resetTimer}
          className="w-14 h-14 rounded-2xl border-none bg-muted/40 hover:bg-muted/60 transition-all"
        >
          <RotateCcw className="h-6 w-6 text-muted-foreground" />
        </Button>
        
        <Button 
          onClick={toggleTimer}
          disabled={isCompleted}
          className={cn(
            "w-20 h-20 rounded-[28px] shadow-2xl transition-all active:scale-95",
            isActive 
              ? "bg-muted text-foreground hover:bg-muted/80" 
              : "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20"
          )}
        >
          {isActive ? <Pause className="h-8 w-8 fill-current" /> : <Play className="h-8 w-8 fill-current translate-x-0.5" />}
        </Button>

        <Button 
          variant="outline" 
          size="icon"
          className="w-14 h-14 rounded-2xl border-none bg-muted/40 hover:bg-muted/60 transition-all"
        >
          <History className="h-6 w-6 text-muted-foreground" />
        </Button>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap justify-center gap-3">
        {PRESET_MINUTES.map((mins) => (
          <button
            key={mins}
            onClick={() => setPreset(mins)}
            disabled={isActive}
            className={cn(
              "px-6 py-3 rounded-2xl text-sm font-black transition-all border uppercase tracking-widest",
              initialSeconds === mins * 60
                ? "bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20"
                : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50"
            )}
          >
            {mins}m
          </button>
        ))}
      </div>

      {/* Success State */}
      {isCompleted && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-[32px] text-center"
        >
          <div className="bg-emerald-500 w-12 h-12 rounded-full flex items-center justify-center text-white mx-auto mb-4">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-black text-emerald-600 mb-1">Peaceful Session!</h3>
          <p className="text-sm font-bold text-emerald-600/70">Your {Math.round(initialSeconds / 60)} minute session has been saved.</p>
          <Button 
            variant="ghost" 
            onClick={resetTimer}
            className="mt-4 text-emerald-600 hover:bg-emerald-500/10 font-bold uppercase tracking-widest text-[10px]"
          >
            Start Another
          </Button>
        </motion.div>
      )}
    </div>
  );
}
