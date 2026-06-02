import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  DailyChecklist,
  GymProfile,
  MeasurementLog,
  ProgressPhotoLog,
  WeightLog,
  WorkoutLog,
} from '@/types/gym';

interface GymState {
  profile: GymProfile | null;
  workoutLogs: WorkoutLog[];
  weightLogs: WeightLog[];
  measurementLogs: MeasurementLog[];
  photoLogs: ProgressPhotoLog[];
  checklist: DailyChecklist | null;
  loading: boolean;
}

const initialState: GymState = {
  profile: null,
  workoutLogs: [],
  weightLogs: [],
  measurementLogs: [],
  photoLogs: [],
  checklist: null,
  loading: false,
};

const gymSlice = createSlice({
  name: 'gym',
  initialState,
  reducers: {
    setGymLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setGymProfile(state, action: PayloadAction<GymProfile | null>) {
      state.profile = action.payload;
    },
    setWorkoutLogs(state, action: PayloadAction<WorkoutLog[]>) {
      state.workoutLogs = action.payload;
    },
    addWorkoutLog(state, action: PayloadAction<WorkoutLog>) {
      state.workoutLogs.unshift(action.payload);
    },
    setWeightLogs(state, action: PayloadAction<WeightLog[]>) {
      state.weightLogs = action.payload;
    },
    addWeightLog(state, action: PayloadAction<WeightLog>) {
      state.weightLogs.unshift(action.payload);
    },
    setMeasurementLogs(state, action: PayloadAction<MeasurementLog[]>) {
      state.measurementLogs = action.payload;
    },
    addMeasurementLog(state, action: PayloadAction<MeasurementLog>) {
      state.measurementLogs.unshift(action.payload);
    },
    setPhotoLogs(state, action: PayloadAction<ProgressPhotoLog[]>) {
      state.photoLogs = action.payload;
    },
    addPhotoLog(state, action: PayloadAction<ProgressPhotoLog>) {
      state.photoLogs.unshift(action.payload);
    },
    setChecklist(state, action: PayloadAction<DailyChecklist | null>) {
      state.checklist = action.payload;
    },
  },
});

export const {
  setGymLoading,
  setGymProfile,
  setWorkoutLogs,
  addWorkoutLog,
  setWeightLogs,
  addWeightLog,
  setMeasurementLogs,
  addMeasurementLog,
  setPhotoLogs,
  addPhotoLog,
  setChecklist,
} = gymSlice.actions;
export default gymSlice.reducer;
