import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  YogaPose,
  YogaFlow,
  YogaSessionLog,
  MeditationLog,
  PosturePhotoLog,
} from '@/types/yoga';

interface YogaState {
  poses: YogaPose[];
  flows: YogaFlow[];
  sessionLogs: YogaSessionLog[];
  meditationLogs: MeditationLog[];
  posturePhotoLogs: PosturePhotoLog[];
  loading: boolean;
}

const initialState: YogaState = {
  poses: [],
  flows: [],
  sessionLogs: [],
  meditationLogs: [],
  posturePhotoLogs: [],
  loading: false,
};

const yogaSlice = createSlice({
  name: 'yoga',
  initialState,
  reducers: {
    setYogaLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setYogaPoses(state, action: PayloadAction<YogaPose[]>) {
      state.poses = action.payload;
    },
    setYogaFlows(state, action: PayloadAction<YogaFlow[]>) {
      state.flows = action.payload;
    },
    setYogaSessionLogs(state, action: PayloadAction<YogaSessionLog[]>) {
      state.sessionLogs = action.payload;
    },
    addYogaSessionLog(state, action: PayloadAction<YogaSessionLog>) {
      state.sessionLogs.unshift(action.payload);
    },
    setMeditationLogs(state, action: PayloadAction<MeditationLog[]>) {
      state.meditationLogs = action.payload;
    },
    addMeditationLog(state, action: PayloadAction<MeditationLog>) {
      state.meditationLogs.unshift(action.payload);
    },
    setPosturePhotoLogs(state, action: PayloadAction<PosturePhotoLog[]>) {
      state.posturePhotoLogs = action.payload;
    },
    addPosturePhotoLog(state, action: PayloadAction<PosturePhotoLog>) {
      state.posturePhotoLogs.unshift(action.payload);
    },
  },
});

export const {
  setYogaLoading,
  setYogaPoses,
  setYogaFlows,
  setYogaSessionLogs,
  addYogaSessionLog,
  setMeditationLogs,
  addMeditationLog,
  setPosturePhotoLogs,
  addPosturePhotoLog,
} = yogaSlice.actions;

export default yogaSlice.reducer;
