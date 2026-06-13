export {
  getUser,
  updateUser,
  getEmailByPhone,
  findUserByEmailOrPhone,
} from '@/firebase/users.firestore';

export {
  getTrip,
  getTripsForUser,
  getTripMembers,
  getExpenses,
  getSettlements,
  getMemories,
  createTrip,
  createExpense,
  updateExpense,
  deleteExpense,
  removeTripMember,
  saveSettlements,
  markSettlementPaid,
  createMemory,
  deleteMemory,
  updateTripStatus,
  syncTripData,
  getPendingInvitesForUser,
  acceptTripInvite,
  declineTripInvite,
  recalculateEqualExpenses,
  addMemberToTrip,
  updateTripCategory,
  updateTrip,
  updateTripExpectedBudget,
  updateTripClassification,
  addCustomExpenseCategory,
  removeCustomExpenseCategory,
  syncMemberProfile,
} from '@/firebase/trips.firestore';

export type { CreateTripInput } from '@/firebase/trips.firestore';

export {
  getTripPlan,
  getTripPlanOrDefault,
  saveTripPlan,
  resetTripPlanToDefault,
} from '@/firebase/tripPlans.firestore';

export {
  getRoom,
  getRoomsForUser,
  getRoomMembers,
  createRoom,
  getPendingRoomInvitesForUser,
  acceptRoomInvite,
  declineRoomInvite,
  addMemberToRoom,
  removeRoomMember,
} from '@/firebase/rooms.firestore';

export type { CreateRoomInput } from '@/firebase/rooms.firestore';

export {
  getCyclesForRoom,
  getActiveCycle,
  createCycleForMonth,
  closeCycle,
  ensureActiveCycle,
  formatCycleLabel,
} from '@/firebase/cycles.firestore';

export {
  getRoomExpenses,
  createRoomExpense,
  updateRoomExpense,
  deleteRoomExpense,
} from '@/firebase/roomExpenses.firestore';

export {
  getCarryForwardBalances,
  upsertCarryForward,
  updateCarryForwardStatus,
} from '@/firebase/carryForward.firestore';

export {
  getRentPayments,
  initRentPayments,
  markRentPaid,
  updateRentPayment,
  setRentPaymentAmount,
} from '@/firebase/rent.firestore';

export {
  getRoomSettlements,
  saveRoomSettlements,
  syncRoomSettlements,
  claimRoomSettlementPayment,
  confirmRoomSettlementPayment,
} from '@/firebase/roomSettlements.firestore';

export {
  createRoomAuditLog,
  getRoomAuditLogs,
} from '@/firebase/roomAuditLog.firestore';

export {
  createTripAuditLog,
  getTripAuditLogs,
} from '@/firebase/tripAuditLog.firestore';

export {
  getRoomBringItems,
  createRoomBringItem,
  updateRoomBringItem,
  setRoomBringItemStatus,
  deleteRoomBringItem,
} from '@/firebase/roomBringItems.firestore';

export {
  getTripPackItems,
  createTripPackItem,
  createTripPackItemsBatch,
  updateTripPackItem,
  setTripPackItemStatus,
  deleteTripPackItem,
} from '@/firebase/tripPackItems.firestore';

export {
  getFitTrackOwnerId,
  resolveFitTrackOwnerId,
  inviteFitTrackPartner,
  getPendingFitTrackInvitesForUser,
  acceptFitTrackPartner,
  declineFitTrackPartner,
  getFitTrackPartnersForOwner,
  getAcceptedFitTrackPartners,
  removeFitTrackPartner,
  cancelPendingFitTrackInvite,
} from '@/firebase/fittrackPartners.firestore';

export {
  getGymProfile,
  upsertGymProfile,
  getWorkoutLogs,
  createWorkoutLog,
  getWeightLogs,
  createWeightLog,
  getMeasurementLogs,
  createMeasurementLog,
  getProgressPhotos,
  createProgressPhoto,
  getChecklist,
  upsertChecklist,
  toggleChecklistItem,
} from '@/firebase/gym.firestore';

export {
  getWaterSettings,
  saveWaterSettings,
  ensureWaterSettings,
  getWaterLog,
  subscribeWaterLog,
  ensureWaterLog,
  addWaterIntake,
  removeWaterIntake,
  getRecentCompletedWaterLogs,
  getRecentWaterLogsForStreak,
  WaterFirestoreError,
} from '@/firebase/water.firestore';

export {
  getYogaPoses,
  createYogaPose,
  updateYogaPose,
  getYogaFlows,
  getYogaFlow,
  getYogaSessionLogs,
  createYogaSessionLog,
  getMeditationLogs,
  createMeditationLog,
  getPosturePhotoLogs,
  createPosturePhotoLog,
} from '@/firebase/yoga.firestore';

export {
  inviteYogaMate,
  getPendingYogaInvitesForUser,
  acceptYogaMate,
  declineYogaMate,
  getYogaMatesForOwner,
  removeYogaMate,
} from '@/firebase/yogaPartners.firestore';

export {
  getDefaultNutritionSettings,
  ensureNutritionSettings,
  saveNutritionSettings,
  subscribeNutritionLog,
  ensureNutritionLog,
  addNutritionEntry,
  updateNutritionEntry,
  removeNutritionEntry,
  getRecentNutritionLogs,
  getNutritionStreak,
  saveCustomFood,
  getCustomFoods,
  getGlobalFoods,
  uploadGlobalFoods,
  deleteGlobalFood,
  updateGlobalFood,
} from '@/firebase/nutrition.firestore';
