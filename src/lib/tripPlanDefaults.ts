import { TripPlan } from '@/types/tripPlan';
import { resolvePlanImage } from '@/lib/tripPlanImages';

function id(prefix: string, n: number) {
  return `${prefix}_${n}`;
}

/** Example monsoon Lonavala–Pune plan (editable / replaceable via CSV). */
export function createDefaultTripPlan(tripId: string): TripPlan {
  const lonavalaStops = [
    { id: id('l', 1), name: 'Lonavala Railway Station', note: 'Pickup point', order: 1, imageKeyword: 'lonavala' },
    { id: id('l', 2), name: 'Hostel / Co-living stay', note: 'Check in', order: 2, imageKeyword: 'hostel' },
    { id: id('l', 3), name: "Tiger's Leap", order: 3, imageKeyword: 'tiger' },
    { id: id('l', 4), name: "Lion's Point", order: 4, imageKeyword: 'lion' },
    { id: id('l', 5), name: 'Karla Caves', order: 5, imageKeyword: 'karla' },
    { id: id('l', 6), name: 'Bhushi Dam', order: 6, imageKeyword: 'bhushi' },
    { id: id('l', 7), name: 'Rajmachi View Point', note: 'Backup', order: 7, imageKeyword: 'rajmachi' },
    { id: id('l', 8), name: 'Pawna Lake', order: 8, imageKeyword: 'pawna' },
    { id: id('l', 9), name: 'Lohagad Fort base village', order: 9, imageKeyword: 'lohagad' },
  ].map((s) => ({
    ...s,
    imageUrl: resolvePlanImage(s.imageKeyword, s.name),
  }));

  const puneStops = [
    { id: id('p', 1), name: 'Shaniwar Wada', order: 1, imageKeyword: 'wada' },
    { id: id('p', 2), name: 'FC Road', order: 2, imageKeyword: 'pune' },
    { id: id('p', 3), name: 'Aga Khan Palace', order: 3, imageKeyword: 'palace' },
    { id: id('p', 4), name: 'Pune Railway Station', order: 4, imageKeyword: 'train' },
  ].map((s) => ({
    ...s,
    imageUrl: resolvePlanImage(s.imageKeyword, s.name),
  }));

  return {
    tripId,
    title: 'Monsoon Lonavala & Pune',
    budgetTotal: 20000,
    budgetUsed: 0,
    routes: [
      {
        id: 'route_lonavala',
        title: 'Lonavala route',
        subtitle: 'Use in this order — reduces backtracking, fuel & rain exposure',
        dayRange: 'Day 2–4',
        stops: lonavalaStops,
      },
      {
        id: 'route_pune',
        title: 'Pune route',
        dayRange: 'Day 4–5',
        stops: puneStops,
      },
    ],
    stayGuide: {
      recommendedAreas: [
        'Tungarli area (best views)',
        'Old Mumbai–Pune Highway side',
        'Near Lonavala Station (budget)',
      ],
      bookingRule: 'Book BEFORE 15 July — July weekends fill fast. Max ~₹1500/night.',
      options: [
        {
          id: 'stay_1',
          title: 'Backpacker hostel (best)',
          priceRange: '₹400–₹700 / bed',
          description: 'Dorm style, social vibe',
          searchTerms: ['Zostel Lonavala type stays', 'Backpacker hostel Lonavala'],
        },
        {
          id: 'stay_2',
          title: 'Budget room',
          priceRange: '₹1200–₹1500 total',
          description: '1 room for 3 people — basic but private',
        },
        {
          id: 'stay_3',
          title: 'Co-living guesthouse',
          priceRange: '₹1000–₹1500',
          description: 'Shared hall / rooms, flexible check-in',
        },
      ],
    },
    days: [
      { id: 'd1', dayNumber: 1, date: '24 Jul', title: 'Train boarding', summary: 'Board train', activities: ['Travel day'], imageKeyword: 'train' },
      { id: 'd2', dayNumber: 2, date: '25 Jul', title: 'Arrival + viewpoints', summary: "Tiger's Leap + Lion's Point", activities: ['Evening fog & sunset'], imageKeyword: 'sunset' },
      { id: 'd3', dayNumber: 3, date: '26 Jul', title: 'Caves & lake', summary: 'Karla + Bhushi + Pawna/Rajmachi', activities: ['Morning caves', 'Evening lake ride'], imageKeyword: 'monsoon' },
      { id: 'd4', dayNumber: 4, date: '27 Jul', title: 'Fort & Pune', summary: 'Lohagad + move to Pune + Shaniwar Wada', activities: ['Morning fort clouds', 'Evening historic Pune'], imageKeyword: 'fort' },
      { id: 'd5', dayNumber: 5, date: '28 Jul', title: 'Return', summary: 'Aga Khan Palace + return train', activities: ['Palace visit', 'Departure'], imageKeyword: 'palace' },
    ].map((d) => ({ ...d, imageUrl: resolvePlanImage(d.imageKeyword, d.title) })),
    romanticMoments: [
      {
        id: 'm1',
        dayLabel: 'Day 2 evening',
        timeOfDay: 'Evening',
        location: "Tiger's Leap + Lion's Point",
        tip: 'Fog + sunset + rain mist — perfect couple photos',
        bullets: ['Hold umbrella together shot'],
        imageKeyword: 'sunset',
      },
      {
        id: 'm2',
        dayLabel: 'Day 3 morning',
        timeOfDay: 'Morning',
        location: 'Karla Caves',
        tip: 'Rain dripping cave entrance, dark-green backdrop',
        imageKeyword: 'cave',
      },
      {
        id: 'm3',
        dayLabel: 'Day 3 evening',
        timeOfDay: 'Evening',
        location: 'Pawna Lake / Rajmachi',
        tip: 'Bike ride in mist, clouds moving through valley',
        imageKeyword: 'lake',
      },
      {
        id: 'm4',
        dayLabel: 'Day 4 morning',
        timeOfDay: 'Morning',
        location: 'Lohagad Fort',
        tip: 'Clouds under your feet — cinematic fog shots',
        imageKeyword: 'fort',
      },
      {
        id: 'm5',
        dayLabel: 'Day 4 evening',
        timeOfDay: 'Evening',
        location: 'Shaniwar Wada',
        tip: 'Golden lights + historic vibe, street food lane walk',
        imageKeyword: 'wada',
      },
    ].map((m) => ({ ...m, imageUrl: resolvePlanImage(m.imageKeyword, m.location) })),
    monsoonBackup: [
      {
        id: 'b1',
        label: 'OPTION A',
        title: 'Heavy rain all day — safe day',
        items: ['Stay in hostel', 'Café hopping', 'Local food exploration'],
      },
      {
        id: 'b2',
        label: 'OPTION B',
        title: 'Short trips only',
        items: ["Tiger's Leap (quick)", 'Karla caves only'],
      },
      {
        id: 'b3',
        label: 'OPTION C',
        title: 'Full rest day',
        items: ['Movies / indoor games / rest'],
      },
      {
        id: 'b4',
        label: 'IF BHUSHI DAM CLOSED',
        title: 'Replace with',
        items: ['Rajmachi View Point', 'Café + waterfall roads', 'Stay dry — explore cafés'],
      },
    ],
    expenseTemplate: {
      categories: [
        'Stay (hostel)',
        'Transport (bike / fuel)',
        'Food (breakfast / lunch / dinner)',
        'Entry / parking / misc',
        'Tea & snacks',
      ],
      splitNote: 'Track who paid: You / GF / Sudhakar (friend support)',
    },
  };
}
