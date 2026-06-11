'use client';

import { useCallback, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { buildDietAIPrompt } from '@/lib/nutrition/dietImportPrompt';
import {
  extractJsonPayload,
  matchImportedFoods,
  parseImportedFoods,
  toLogPayload,
} from '@/lib/nutrition/dietImportParser';
import { formatDateLabel } from '@/lib/nutrition/nutritionUtils';
import type { DietImportLogPayload, DietImportStep, DietMatchResult } from '@/types/dietImport';
import type { FoodItem, NutrientsPerServing } from '@/types/nutrition';

const PROCESSING_DURATION_MS = 1500;

export interface UseAIDietImportOptions {
  dateKey: string;
  timezone: string;
  totals: NutrientsPerServing;
  targets: NutrientsPerServing;
  customFoods: FoodItem[];
  onImportSuccess: (entries: DietImportLogPayload[]) => Promise<void>;
}

export function useAIDietImport({
  dateKey,
  timezone,
  totals,
  targets,
  customFoods,
  onImportSuccess,
}: UseAIDietImportOptions) {
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<DietImportStep>('paste');
  const [progressValue, setProgressValue] = useState(0);
  const [pastedText, setPastedText] = useState('');
  const [matchedFoods, setMatchedFoods] = useState<DietMatchResult[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const processingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetModalState = useCallback(() => {
    if (processingTimerRef.current) {
      clearTimeout(processingTimerRef.current);
      processingTimerRef.current = null;
    }
    setStep('paste');
    setProgressValue(0);
    setPastedText('');
    setMatchedFoods([]);
    setErrorMessage(null);
  }, []);

  const openModal = useCallback(() => {
    resetModalState();
    setModalOpen(true);
  }, [resetModalState]);

  const closeModal = useCallback(() => {
    resetModalState();
    setModalOpen(false);
  }, [resetModalState]);

  const copyPrompt = useCallback(async () => {
    const prompt = buildDietAIPrompt({
      dateLabel: formatDateLabel(dateKey, timezone),
      totals,
      targets,
    });

    try {
      await navigator.clipboard.writeText(prompt);
      toast.success('Prompt copied to clipboard!');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  }, [dateKey, timezone, totals, targets]);

  const runValidation = useCallback(
    (text: string) => {
      try {
        const payload = extractJsonPayload(text);
        const parsed = parseImportedFoods(JSON.parse(payload));
        const matched = matchImportedFoods(parsed, customFoods);
        setMatchedFoods(matched);
        setErrorMessage(null);
        setStep('preview');
      } catch (err) {
        setProgressValue(0);
        setStep('error');
        if (err instanceof Error && err.message === 'empty') {
          setErrorMessage('No food items found. Paste a JSON array with at least one entry.');
        } else {
          setErrorMessage('Invalid format. Please make sure you pasted the exact AI response.');
        }
      }
    },
    [customFoods]
  );

  const processPastedDiet = useCallback(() => {
    if (!pastedText.trim()) {
      setErrorMessage('Paste your AI-generated diet log first.');
      setStep('error');
      return;
    }

    setErrorMessage(null);
    setStep('processing');
    setProgressValue(0);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => setProgressValue(100));
    });

    if (processingTimerRef.current) clearTimeout(processingTimerRef.current);
    processingTimerRef.current = setTimeout(() => {
      runValidation(pastedText);
      processingTimerRef.current = null;
    }, PROCESSING_DURATION_MS);
  }, [pastedText, runValidation]);

  const goBackToPaste = useCallback(() => {
    setStep('paste');
    setProgressValue(0);
    setErrorMessage(null);
  }, []);

  const confirmImport = useCallback(async () => {
    if (!matchedFoods.length) {
      toast.error('No valid food items to import');
      return;
    }

    const payloads = matchedFoods.map(toLogPayload);

    try {
      await onImportSuccess(payloads);
      closeModal();
      toast.success(`Imported ${payloads.length} food item${payloads.length === 1 ? '' : 's'}!`);
    } catch {
      toast.error('Could not import diet log');
    }
  }, [matchedFoods, onImportSuccess, closeModal]);

  return {
    modalOpen,
    step,
    progressValue,
    pastedText,
    matchedFoods,
    errorMessage,
    setPastedText,
    openModal,
    closeModal,
    copyPrompt,
    processPastedDiet,
    goBackToPaste,
    confirmImport,
  };
}
