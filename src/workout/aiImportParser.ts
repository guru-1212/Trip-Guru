import type { ImportedExercise } from '@/types/aiImport';
import { normalizeImportedReps } from './aiImportPrompt';

/** Thrown by the parser with a message that is safe to show to the user. */
export class ImportFormatError extends Error {}

/** Strip a ```json fence if the AI wrapped its answer in one. */
export function extractJsonPayload(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) return fenceMatch[1].trim();
  return trimmed;
}

/**
 * AI responses vary: a missing/null weight, "bodyweight", "BW" or "" all mean
 * bodyweight (0); "60 kg" / "22.5kg" carry a unit. Returns null when the
 * value cannot be read as a non-negative number.
 */
export function parseImportedWeight(value: unknown): number | null {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : null;
  if (typeof value === 'string') {
    const text = value.trim().toLowerCase();
    if (!text || text === 'bodyweight' || text === 'body weight' || text === 'bw' || text === 'n/a') {
      return 0;
    }
    const match = text.match(/-?\d+(?:\.\d+)?/);
    if (!match) return null;
    const num = Number(match[0]);
    return Number.isFinite(num) && num >= 0 ? num : null;
  }
  return null;
}

/** Accept a bare array or an object wrapping one (e.g. { "workout": [...] }). */
function unwrapImportedList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const arrays = Object.values(raw as Record<string, unknown>).filter(Array.isArray);
    if (arrays.length === 1) return arrays[0] as unknown[];
  }
  throw new ImportFormatError('Expected a JSON array of exercises (starting with "[").');
}

export function parseImportedExercises(raw: unknown): ImportedExercise[] {
  const list = unwrapImportedList(raw);
  if (list.length === 0) throw new ImportFormatError('The AI response contains no exercises.');

  return list.map((item, index) => {
    const label = `Exercise ${index + 1}`;
    if (!item || typeof item !== 'object') {
      throw new ImportFormatError(`${label} is not an object.`);
    }
    const row = item as Record<string, unknown>;
    if (typeof row.exerciseName !== 'string' || !row.exerciseName.trim()) {
      throw new ImportFormatError(`${label} is missing "exerciseName".`);
    }
    const name = row.exerciseName.trim();
    const sets = Number(row.sets);
    if (!Number.isFinite(sets) || sets < 1) {
      throw new ImportFormatError(`${name}: "sets" must be a number of at least 1.`);
    }
    const reps = normalizeImportedReps(String(row.reps ?? ''));
    if (!reps) throw new ImportFormatError(`${name}: "reps" is missing.`);
    const weight = parseImportedWeight(row.weight);
    if (weight === null) {
      throw new ImportFormatError(`${name}: "weight" must be a number (use 0 for bodyweight).`);
    }
    return {
      exerciseName: name,
      sets: Math.round(sets),
      reps,
      weight,
      notes: typeof row.notes === 'string' ? row.notes : undefined,
    };
  });
}

/** Parse pasted AI text end-to-end. Throws ImportFormatError for shape problems, SyntaxError for bad JSON. */
export function parsePastedWorkout(text: string): ImportedExercise[] {
  return parseImportedExercises(JSON.parse(extractJsonPayload(text)));
}
