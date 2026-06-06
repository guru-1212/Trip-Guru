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
import roomBringItemsReducer from '@/features/roomBringItems/roomBringItemsSlice';
import tripPackItemsReducer from '@/features/tripPackItems/tripPackItemsSlice';
import appModeReducer from '@/features/appMode/appModeSlice';
import gymReducer from '@/features/gym/gymSlice';

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
    roomBringItems: roomBringItemsReducer,
    tripPackItems: tripPackItemsReducer,
    appMode: appModeReducer,
    gym: gymReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'auth/setUser',
          'auth/updateProfileLocal',
          'expenses/setExpenses',
          'trips/setTrips',
          'trips/fetchUser/fulfilled',
          'rooms/setRooms',
          'rooms/fetchUser/fulfilled',
          'appMode/setAppModeState',
        ],
        ignoredPaths: [
          'auth.user.createdAt',
          'trips.trips',
          'expenses.expenses',
          'rooms.rooms',
        ],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
