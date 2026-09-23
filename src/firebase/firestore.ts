/**
 * Firestore barrel. Implementation lives in the sibling `*.firestore.ts`
 * modules; import from here or from the module directly.
 */
export {
  getUser,
  updateUser,
  getEmailByPhone,
  findUserByEmailOrPhone,
} from '@/firebase/users.firestore';

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
  autoLinkPendingFitTrackInviteOnRegister,
} from '@/firebase/fittrackPartners.firestore';

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

export {
  getFitTrackTargetAttempts,
  saveFitTrackTargetAttempt,
  patchFitTrackTargetAttempt,
  deleteFitTrackTargetAttempt,
  deleteFitTrackTargetAttempts,
} from '@/firebase/targets.firestore';
