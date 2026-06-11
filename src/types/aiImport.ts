import type { LibraryExercise } from '@/workout/types';

export interface ImportedExercise {
  exerciseName: string;
  sets: number;
  reps: string;
  weight: number;
  notes?: string;
}

export interface MatchResult {
  imported: ImportedExercise;
  matched: boolean;
  libraryExercise?: LibraryExercise;
  warning?: string;
}

export type AIImportStep = 'paste' | 'processing' | 'preview' | 'error';

export interface AIImportState {
  modalOpen: boolean;
  step: AIImportStep;
  progressValue: number;
  pastedText: string;
  parsedExercises: ImportedExercise[];
  matchedExercises: MatchResult[];
  errorMessage: string | null;
}
