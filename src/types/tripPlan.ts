export interface TripPlanRouteStop {
  id: string;
  name: string;
  note?: string;
  order: number;
  imageKeyword?: string;
  imageUrl?: string;
}

export interface TripPlanRoute {
  id: string;
  title: string;
  subtitle?: string;
  dayRange?: string;
  stops: TripPlanRouteStop[];
}

export interface TripPlanStayOption {
  id: string;
  title: string;
  priceRange: string;
  description: string;
  searchTerms?: string[];
}

export interface TripPlanStayGuide {
  recommendedAreas: string[];
  options: TripPlanStayOption[];
  bookingRule?: string;
}

export interface TripPlanDay {
  id: string;
  dayNumber: number;
  date?: string;
  title: string;
  summary: string;
  activities: string[];
  imageUrl?: string;
  imageKeyword?: string;
}

export interface TripPlanMoment {
  id: string;
  dayLabel: string;
  timeOfDay?: string;
  location: string;
  tip: string;
  bullets?: string[];
  imageUrl?: string;
  imageKeyword?: string;
}

export interface TripPlanBackupOption {
  id: string;
  label: string;
  title: string;
  items: string[];
}

export interface TripPlanExpenseTemplate {
  categories: string[];
  splitNote?: string;
}

export interface TripPlan {
  tripId: string;
  title?: string;
  /** Hero banner on plan overview (falls back to first day image). */
  coverImageUrl?: string;
  budgetTotal: number;
  budgetUsed?: number;
  routes: TripPlanRoute[];
  stayGuide: TripPlanStayGuide;
  days: TripPlanDay[];
  romanticMoments: TripPlanMoment[];
  monsoonBackup: TripPlanBackupOption[];
  expenseTemplate: TripPlanExpenseTemplate;
  updatedAt?: unknown;
}

export type TripPlanCsvRowType =
  | 'day'
  | 'route'
  | 'route_stop'
  | 'moment'
  | 'backup'
  | 'stay_area'
  | 'stay_option'
  | 'meta';

export interface TripPlanCsvRow {
  type: TripPlanCsvRowType;
  day?: string;
  date?: string;
  title?: string;
  subtitle?: string;
  detail?: string;
  order?: string;
  imageKeyword?: string;
  routeGroup?: string;
}
