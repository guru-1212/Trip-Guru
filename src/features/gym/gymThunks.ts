import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  createMeasurementLog,
  createProgressPhoto,
  createWeightLog,
  createWorkoutLog,
  getChecklist,
  getGymProfile,
  getMeasurementLogs,
  getProgressPhotos,
  getWeightLogs,
  getWorkoutLogs,
  upsertChecklist,
  upsertGymProfile,
} from '@/firebase/gym.firestore';
import {
  addMeasurementLog,
  addPhotoLog,
  addWeightLog,
  addWorkoutLog,
  setChecklist,
  setGymLoading,
  setGymProfile,
  setMeasurementLogs,
  setPhotoLogs,
  setWeightLogs,
  setWorkoutLogs,
} from '@/features/gym/gymSlice';
import {
  DailyChecklist,
  GymProfile,
  MeasurementLog,
  ProgressPhotoLog,
  WeightLog,
  WorkoutLog,
} from '@/types/gym';

export const loadGymData = createAsyncThunk(
  'gym/loadAll',
  async ({ uid, dateKey }: { uid: string; dateKey: string }, { dispatch }) => {
    dispatch(setGymLoading(true));
    const [profile, workoutLogs, weightLogs, measurementLogs, photoLogs, checklist] =
      await Promise.all([
        getGymProfile(uid),
        getWorkoutLogs(uid),
        getWeightLogs(uid),
        getMeasurementLogs(uid),
        getProgressPhotos(uid),
        getChecklist(uid, dateKey),
      ]);

    dispatch(setGymProfile(profile));
    dispatch(setWorkoutLogs(workoutLogs));
    dispatch(setWeightLogs(weightLogs));
    dispatch(setMeasurementLogs(measurementLogs));
    dispatch(setPhotoLogs(photoLogs));
    dispatch(setChecklist(checklist));
    dispatch(setGymLoading(false));
  }
);

export const saveGymProfile = createAsyncThunk(
  'gym/saveProfile',
  async ({ uid, profile }: { uid: string; profile: Omit<GymProfile, 'uid'> }, { dispatch }) => {
    await upsertGymProfile(uid, profile);
    dispatch(setGymProfile({ uid, ...profile }));
  }
);

export const addWorkoutLogThunk = createAsyncThunk(
  'gym/addWorkoutLog',
  async (
    { uid, payload }: { uid: string; payload: Omit<WorkoutLog, 'id' | 'uid' | 'createdAt'> },
    { dispatch }
  ) => {
    const id = await createWorkoutLog(uid, payload);
    dispatch(addWorkoutLog({ id, uid, ...payload }));
  }
);

export const addWeightLogThunk = createAsyncThunk(
  'gym/addWeightLog',
  async ({ uid, date, weightKg }: { uid: string; date: string; weightKg: number }, { dispatch }) => {
    const id = await createWeightLog(uid, date, weightKg);
    dispatch(addWeightLog({ id, uid, date, weightKg }));
  }
);

export const addMeasurementLogThunk = createAsyncThunk(
  'gym/addMeasurementLog',
  async (
    { uid, payload }: { uid: string; payload: Omit<MeasurementLog, 'id' | 'uid' | 'createdAt'> },
    { dispatch }
  ) => {
    const id = await createMeasurementLog(uid, payload);
    dispatch(addMeasurementLog({ id, uid, ...payload }));
  }
);

export const addProgressPhotoThunk = createAsyncThunk(
  'gym/addProgressPhoto',
  async (
    { uid, payload }: { uid: string; payload: Omit<ProgressPhotoLog, 'id' | 'uid' | 'createdAt'> },
    { dispatch }
  ) => {
    const id = await createProgressPhoto(uid, payload);
    dispatch(addPhotoLog({ id, uid, ...payload }));
  }
);

export const updateChecklistThunk = createAsyncThunk(
  'gym/updateChecklist',
  async (
    {
      uid,
      dateKey,
      patch,
    }: { uid: string; dateKey: string; patch: Partial<Omit<DailyChecklist, 'dateKey' | 'updatedAt'>> },
    { dispatch }
  ) => {
    await upsertChecklist(uid, dateKey, patch);
    const latest = await getChecklist(uid, dateKey);
    dispatch(setChecklist(latest));
  }
);
