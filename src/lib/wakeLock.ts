/**
 * Implements a secure and robust Screen Wake Lock for Athlete OS.
 * Ensures the screen remains active during active workout sessions.
 */

let wakeLock: any = null;

/**
 * Requests a Screen Wake Lock.
 * MUST be called within a user gesture event listener (e.g., click).
 */
export async function requestWakeLock() {
  // 1. Security Check: API presence and Secure Context (HTTPS/localhost)
  if (typeof navigator === 'undefined' || !('wakeLock' in navigator) || !window.isSecureContext) {
    console.warn('Wake Lock API is not supported or context is not secure.');
    return;
  }

  try {
    // 2. Request the lock
    wakeLock = await (navigator as any).wakeLock.request('screen');
    
    console.log('Athlete OS: Screen Wake Lock active.');

    // Handle release (e.g., if the browser releases it automatically)
    wakeLock.addEventListener('release', () => {
      console.log('Athlete OS: Screen Wake Lock released.');
      wakeLock = null;
    });
  } catch (err: any) {
    console.error(`Wake Lock Error: ${err?.name}, ${err?.message}`);
  }
}

/**
 * Automatically re-acquires the lock when the tab becomes visible again.
 */
const handleVisibilityChange = async () => {
  if (wakeLock !== null && typeof document !== 'undefined' && document.visibilityState === 'visible') {
    await requestWakeLock();
  }
};

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', handleVisibilityChange);
}

/**
 * Manual release function for when the workout is finished.
 */
export async function releaseWakeLock() {
  if (wakeLock) {
    try {
      await wakeLock.release();
    } catch (err) {
      console.error('Error releasing wake lock:', err);
    }
    wakeLock = null;
  }
}
