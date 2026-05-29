import { createAsyncThunk } from '@reduxjs/toolkit';
import { getMemories, createMemory, deleteMemory } from '@/firebase/firestore';
import { setMemories, addMemory, removeMemory, setLoading } from './memoriesSlice';
import { Memory } from '@/types/memory';

export const fetchMemories = createAsyncThunk(
  'memories/fetch',
  async (tripId: string, { dispatch }) => {
    dispatch(setLoading(true));
    const memories = await getMemories(tripId);
    dispatch(setMemories(memories));
    return memories;
  }
);

export const addMemoryThunk = createAsyncThunk(
  'memories/add',
  async (memory: Omit<Memory, 'id' | 'createdAt'>, { dispatch }) => {
    const id = await createMemory(memory);
    dispatch(
      addMemory({
        ...memory,
        id,
        createdAt: { toDate: () => new Date() } as Memory['createdAt'],
      })
    );
    return id;
  }
);

export const deleteMemoryThunk = createAsyncThunk(
  'memories/delete',
  async (memoryId: string, { dispatch }) => {
    await deleteMemory(memoryId);
    dispatch(removeMemory(memoryId));
  }
);
