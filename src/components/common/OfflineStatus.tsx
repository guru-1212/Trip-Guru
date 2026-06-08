'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi, AlertTriangle, CheckCircle2 } from 'lucide-react';

export function OfflineStatus() {
  const [isOffline, setIsOffline] = useState(false);
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowBackOnline(true);
      const timer = setTimeout(() => setShowBackOnline(false), 3000);
      return () => clearTimeout(timer);
    };
    const handleOffline = () => {
      setIsOffline(true);
      setShowBackOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOffline(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          className="fixed top-0 inset-x-0 z-[9999] p-4 flex justify-center pointer-events-none"
        >
          <div className="bg-red-600 dark:bg-red-500 text-white px-6 py-4 rounded-3xl shadow-[0_20px_50px_rgba(220,38,38,0.3)] flex items-center gap-4 pointer-events-auto border border-white/20 backdrop-blur-xl">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
              <WifiOff className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-black tracking-tight leading-none">Connection Lost</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-80 mt-1.5 flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3" />
                Athlete OS is currently offline
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {showBackOnline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          className="fixed top-0 inset-x-0 z-[9999] p-4 flex justify-center pointer-events-none"
        >
          <div className="bg-emerald-600 dark:bg-emerald-500 text-white px-6 py-4 rounded-3xl shadow-[0_20px_50px_rgba(16,185,129,0.3)] flex items-center gap-4 pointer-events-auto border border-white/20 backdrop-blur-xl">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
              <Wifi className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-black tracking-tight leading-none">Online Again</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-80 mt-1.5 flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3" />
                System connectivity restored
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
