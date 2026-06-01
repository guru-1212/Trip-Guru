import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import authReducer from '@/features/auth/authSlice';
import tripsReducer from '@/features/trips/tripsSlice';
import expensesReducer from '@/features/expenses/expensesSlice';
import settlementsReducer from '@/features/settlements/settlementsSlice';
import memoriesReducer from '@/features/memories/memoriesSlice';
import roomsReducer from '@/features/rooms/roomsSlice';
import roomExpensesReducer from '@/features/roomExpenses/roomExpensesSlice';
import roomSettlementsReducer from '@/features/roomSettlements/roomSettlementsSlice';
import appModeReducer from '@/features/appMode/appModeSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    trips: tripsReducer,
    expenses: expensesReducer,
    settlements: settlementsReducer,
    memories: memoriesReducer,
    rooms: roomsReducer,
    roomExpenses: roomExpensesReducer,
    roomSettlements: roomSettlementsReducer,
    appMode: appModeReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['auth/setUser', 'expenses/setExpenses'],
        ignoredPaths: [
          'auth.user.createdAt',
          'trips.trips',
          'expenses.expenses',
        ],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
