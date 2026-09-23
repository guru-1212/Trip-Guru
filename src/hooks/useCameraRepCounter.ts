'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_REP_DETECTOR_OPTIONS,
  createRepDetectorState,
  pushSample,
  sampleCentreLuminance,
} from '@/workout/repCounter';
import type { RepDetectorState } from '@/workout/repCounter';

/** Frames are downscaled to this before sampling — the signal needs no detail. */
const SAMPLE_SIZE = 32;
/** Sampling faster than this buys nothing and costs battery. */
const TARGET_HZ = 30;

export type CameraStatus = 'idle' | 'starting' | 'running' | 'denied' | 'unsupported' | 'error';

export interface CameraRepCounter {
  videoRef: React.RefObject<HTMLVideoElement>;
  status: CameraStatus;
  errorMessage: string | null;
  state: RepDetectorState;
  /** Live brightness, for the signal meter. */
  luminance: number;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
  adjust: (delta: number) => void;
}

function speak(count: number) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    // Cancel anything queued: at speed, stale numbers are worse than silence.
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(String(count));
    utterance.rate = 1.35;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  } catch {
    /* speech is a nicety, never a failure */
  }
}

function makeBeeper(): () => void {
  let ctx: AudioContext | null = null;
  return () => {
    try {
      const Ctor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      ctx ??= new Ctor();
      if (ctx.state === 'suspended') void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    } catch {
      /* audio is a nicety, never a failure */
    }
  };
}

/**
 * Drives the optical rep counter: front camera → centre luminance → detector.
 *
 * Nothing leaves the device. No frame is uploaded, stored or written anywhere —
 * the video element is the only consumer of the stream and it is torn down on stop.
 */
export function useCameraRepCounter(options?: {
  onAutoStop?: () => void;
  voice?: boolean;
}): CameraRepCounter {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastSampleRef = useRef(0);
  const detectorRef = useRef<RepDetectorState>(createRepDetectorState());
  const beepRef = useRef<(() => void) | null>(null);
  const autoStopFiredRef = useRef(false);

  const [status, setStatus] = useState<CameraStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [state, setState] = useState<RepDetectorState>(detectorRef.current);
  const [luminance, setLuminance] = useState(0);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus((prev) => (prev === 'running' || prev === 'starting' ? 'idle' : prev));
  }, []);

  const reset = useCallback(() => {
    detectorRef.current = createRepDetectorState();
    autoStopFiredRef.current = false;
    setState(detectorRef.current);
  }, []);

  const adjust = useCallback((delta: number) => {
    const next = {
      ...detectorRef.current,
      count: Math.max(0, detectorRef.current.count + delta),
    };
    detectorRef.current = next;
    setState(next);
  }, []);

  const tick = useCallback(() => {
    rafRef.current = requestAnimationFrame(tick);

    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    const now = performance.now();
    if (now - lastSampleRef.current < 1000 / TARGET_HZ) return;
    lastSampleRef.current = now;

    canvasRef.current ??= document.createElement('canvas');
    const canvas = canvasRef.current;
    canvas.width = SAMPLE_SIZE;
    canvas.height = SAMPLE_SIZE;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    const lum = sampleCentreLuminance(data, SAMPLE_SIZE, SAMPLE_SIZE);

    const previous = detectorRef.current;
    const next = pushSample(previous, lum, now, DEFAULT_REP_DETECTOR_OPTIONS);
    detectorRef.current = next;

    if (next.count > previous.count) {
      beepRef.current?.();
      if (optionsRef.current?.voice !== false) speak(next.count);
    }

    setState(next);
    setLuminance(lum);

    if (next.shouldStop && !autoStopFiredRef.current) {
      autoStopFiredRef.current = true;
      optionsRef.current?.onAutoStop?.();
    }
  }, []);

  const start = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported');
      setErrorMessage('This browser cannot open the camera.');
      return;
    }
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setStatus('unsupported');
      setErrorMessage('Camera access needs a secure (https) connection.');
      return;
    }

    setStatus('starting');
    setErrorMessage(null);
    reset();
    beepRef.current ??= makeBeeper();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      lastSampleRef.current = 0;
      setStatus('running');
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      const name = (err as Error).name;
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setStatus('denied');
        setErrorMessage('Camera permission was declined.');
      } else if (name === 'NotFoundError') {
        setStatus('error');
        setErrorMessage('No camera found on this device.');
      } else {
        setStatus('error');
        setErrorMessage('Could not start the camera.');
      }
    }
  }, [reset, tick]);

  // Always release the camera when the component goes away.
  useEffect(() => stop, [stop]);

  return { videoRef, status, errorMessage, state, luminance, start, stop, reset, adjust };
}
