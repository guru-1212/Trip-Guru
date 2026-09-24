'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_POSE_DETECTOR_OPTIONS,
  createPoseDetectorState,
  pushPoseFrame,
} from '@/workout/poseRepCounter';
import type { PoseDetectorState, PoseLandmark, PoseRepSpec } from '@/workout/poseRepCounter';

/**
 * Where the pose model comes from.
 *
 * The WASM runtime is copied into public/ at build time by
 * scripts/copy-pose-assets.js, so it is served from our own origin and stays
 * in step with the npm package. Only the model weights come from Google's
 * bucket, and that address can be overridden to self-host them too.
 */
const WASM_PATH = '/mediapipe/wasm';
const MODEL_URL =
  process.env.NEXT_PUBLIC_POSE_MODEL_URL ??
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

/** Running the model faster than this buys nothing and cooks the battery. */
const TARGET_HZ = 24;

export type PoseCameraStatus =
  | 'idle'
  | 'loading'
  | 'starting'
  | 'running'
  | 'denied'
  | 'unsupported'
  | 'error';

export type PoseFacing = 'user' | 'environment';

export interface PoseRepCounter {
  videoRef: React.RefObject<HTMLVideoElement>;
  status: PoseCameraStatus;
  errorMessage: string | null;
  state: PoseDetectorState;
  /** Latest landmarks, for the skeleton overlay. Empty when nobody is seen. */
  landmarks: PoseLandmark[];
  facing: PoseFacing;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
  adjust: (delta: number) => void;
  flipCamera: () => Promise<void>;
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

function buzz(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* haptics are a nicety, never a failure */
  }
}

function makeBeeper(): (tone: 'count' | 'reject') => void {
  let ctx: AudioContext | null = null;
  return (tone) => {
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      ctx ??= new Ctor();
      if (ctx.state === 'suspended') void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      // Low buzz for a rejected rep: you hear "that did not count" without looking.
      osc.frequency.value = tone === 'reject' ? 200 : 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(tone === 'reject' ? 0.18 : 0.25, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    } catch {
      /* audio is a nicety, never a failure */
    }
  };
}

/** The bits of PoseLandmarker this hook touches, so the import can stay lazy. */
interface Landmarker {
  detectForVideo: (
    video: HTMLVideoElement,
    timestamp: number
  ) => { landmarks?: PoseLandmark[][] };
  close: () => void;
}

let landmarkerPromise: Promise<Landmarker> | null = null;

/**
 * Loads the pose model once per page load.
 *
 * The import is dynamic so the ~2MB of MediaPipe glue never enters the main
 * bundle: someone who only ever types their reps in should not pay for this.
 * The promise is cached because loading it twice would fetch the model twice.
 */
async function getLandmarker(): Promise<Landmarker> {
  landmarkerPromise ??= (async () => {
    const vision = await import('@mediapipe/tasks-vision');
    const fileset = await vision.FilesetResolver.forVisionTasks(WASM_PATH);
    return (await vision.PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      // One person: a bystander walking past must not steal the count.
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    })) as unknown as Landmarker;
  })().catch((err) => {
    // Do not cache a failure, or a flaky first load would be permanent.
    landmarkerPromise = null;
    throw err;
  });
  return landmarkerPromise;
}

/**
 * Drives the pose rep counter: camera -> 33 landmarks -> joint angle -> count.
 *
 * Nothing leaves the device. Frames go to the pose model and the overlay and
 * nowhere else; no frame is uploaded, stored or written anywhere, and the
 * stream is torn down on stop.
 */
export function usePoseRepCounter(options: {
  spec: PoseRepSpec | null;
  onAutoStop?: () => void;
  voice?: boolean;
}): PoseRepCounter {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastSampleRef = useRef(0);
  const lastTimestampRef = useRef(-1);
  const detectorRef = useRef<PoseDetectorState>(createPoseDetectorState());
  const landmarkerRef = useRef<Landmarker | null>(null);
  const beepRef = useRef<((tone: 'count' | 'reject') => void) | null>(null);
  const autoStopFiredRef = useRef(false);

  const [status, setStatus] = useState<PoseCameraStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [state, setState] = useState<PoseDetectorState>(detectorRef.current);
  const [landmarks, setLandmarks] = useState<PoseLandmark[]>([]);
  const [facing, setFacing] = useState<PoseFacing>('user');

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
    setStatus((prev) =>
      prev === 'running' || prev === 'starting' || prev === 'loading' ? 'idle' : prev
    );
  }, []);

  const reset = useCallback(() => {
    detectorRef.current = createPoseDetectorState();
    autoStopFiredRef.current = false;
    lastTimestampRef.current = -1;
    setState(detectorRef.current);
    setLandmarks([]);
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
    const landmarker = landmarkerRef.current;
    const spec = optionsRef.current.spec;
    if (!video || !landmarker || !spec || video.readyState < 2) return;

    const now = performance.now();
    if (now - lastSampleRef.current < 1000 / TARGET_HZ) return;
    lastSampleRef.current = now;

    // detectForVideo rejects a timestamp that does not advance, which happens
    // whenever two frames land in the same millisecond.
    const timestamp = Math.max(lastTimestampRef.current + 1, Math.round(now));
    lastTimestampRef.current = timestamp;

    let frame: PoseLandmark[] = [];
    try {
      const result = landmarker.detectForVideo(video, timestamp);
      frame = result.landmarks?.[0] ?? [];
    } catch {
      // A dropped frame is not worth ending the set over.
      return;
    }

    const previous = detectorRef.current;
    const next = pushPoseFrame(previous, frame, now, spec, DEFAULT_POSE_DETECTOR_OPTIONS);
    detectorRef.current = next;

    if (next.count > previous.count) {
      beepRef.current?.('count');
      buzz(35);
      if (optionsRef.current.voice !== false) speak(next.count);
    } else if (next.shallowReps > previous.shallowReps) {
      beepRef.current?.('reject');
      buzz([25, 60, 25]);
    }

    setState(next);
    setLandmarks(frame);

    if (next.shouldStop && !autoStopFiredRef.current) {
      autoStopFiredRef.current = true;
      optionsRef.current.onAutoStop?.();
    }
  }, []);

  const openCamera = useCallback(
    async (mode: PoseFacing) => {
      const stream = await navigator.mediaDevices.getUserMedia({
        // The whole body has to fit in frame, so this wants more resolution
        // than the brightness counter does.
        video: { facingMode: mode, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    },
    []
  );

  const start = useCallback(async () => {
    if (!optionsRef.current.spec) {
      setStatus('unsupported');
      setErrorMessage('This exercise cannot be counted by camera yet.');
      return;
    }
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

    setErrorMessage(null);
    reset();
    beepRef.current ??= makeBeeper();

    // Model first: asking for the camera and then failing to load the model
    // would light the privacy indicator for nothing.
    setStatus('loading');
    try {
      landmarkerRef.current = await getLandmarker();
    } catch {
      setStatus('error');
      setErrorMessage('Could not load the pose model. Check your connection and try again.');
      return;
    }

    setStatus('starting');
    try {
      await openCamera(facing);
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
  }, [facing, openCamera, reset, tick]);

  /**
   * Switches between the selfie and rear cameras mid-set.
   *
   * The count is deliberately kept: you flip the camera because the framing is
   * wrong, and losing the reps you have already done would be the worse bug.
   */
  const flipCamera = useCallback(async () => {
    const next: PoseFacing = facing === 'user' ? 'environment' : 'user';
    setFacing(next);
    if (status !== 'running') return;
    try {
      await openCamera(next);
    } catch {
      setErrorMessage('Could not switch camera.');
    }
  }, [facing, openCamera, status]);

  // Always release the camera when the component goes away.
  useEffect(() => stop, [stop]);

  return {
    videoRef,
    status,
    errorMessage,
    state,
    landmarks,
    facing,
    start,
    stop,
    reset,
    adjust,
    flipCamera,
  };
}
