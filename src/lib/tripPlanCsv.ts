import {
  TripPlan,
  TripPlanCsvRow,
  TripPlanCsvRowType,
  TripPlanRoute,
  TripPlanRouteStop,
} from '@/types/tripPlan';
import { createDefaultTripPlan } from '@/lib/tripPlanDefaults';
import { resolvePlanImage } from '@/lib/tripPlanImages';

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (c === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }
    current += c;
  }
  result.push(current.trim());
  return result;
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/\s+/g, '_').replace(/[^\w]/g, '');
}

function detectType(raw: string): TripPlanCsvRowType | null {
  const t = raw.toLowerCase().trim();
  const map: Record<string, TripPlanCsvRowType> = {
    day: 'day',
    route: 'route_stop',
    route_stop: 'route_stop',
    stop: 'route_stop',
    moment: 'moment',
    backup: 'backup',
    stay_area: 'stay_area',
    stay: 'stay_option',
    stay_option: 'stay_option',
    meta: 'meta',
    route_group: 'route',
  };
  return map[t] ?? null;
}

function uid() {
  return `_${Math.random().toString(36).slice(2, 9)}`;
}

export function parseCsvToTripPlan(
  csvText: string,
  tripId: string,
  existing?: TripPlan
): { plan: TripPlan; warnings: string[] } {
  const warnings: string[] = [];
  const base = existing ?? createDefaultTripPlan(tripId);
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));

  if (lines.length < 2) {
    warnings.push('CSV needs a header row and at least one data row.');
    return { plan: base, warnings };
  }

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);
  const rows: TripPlanCsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cells[idx] ?? '';
    });

    const typeRaw =
      row.type || row.section || row.category || row.kind || '';
    const type = detectType(typeRaw);
    if (!type) {
      warnings.push(`Row ${i + 1}: unknown type "${typeRaw}" — skipped.`);
      continue;
    }

    rows.push({
      type,
      day: row.day || row.day_number,
      date: row.date,
      title: row.title || row.name || row.location,
      subtitle: row.subtitle || row.note || row.notes,
      detail: row.detail || row.description || row.summary || row.tip,
      order: row.order || row.sort,
      imageKeyword: row.image_keyword || row.image || row.keyword,
      routeGroup: row.route_group || row.route || row.group,
    });
  }

  const plan: TripPlan = {
    ...base,
    tripId,
    days: [...base.days],
    routes: base.routes.map((r) => ({ ...r, stops: [...r.stops] })),
    romanticMoments: [...base.romanticMoments],
    monsoonBackup: [...base.monsoonBackup],
    stayGuide: {
      ...base.stayGuide,
      recommendedAreas: [...base.stayGuide.recommendedAreas],
      options: [...base.stayGuide.options],
    },
  };

  const routeMap = new Map<string, TripPlanRoute>();
  plan.routes.forEach((r) => routeMap.set(r.title.toLowerCase(), r));

  for (const row of rows) {
    switch (row.type) {
      case 'meta': {
        if (row.title?.toLowerCase().includes('budget') && row.detail) {
          const n = parseFloat(row.detail.replace(/[^\d.]/g, ''));
          if (!Number.isNaN(n)) plan.budgetTotal = n;
        }
        if (row.title && row.detail) plan.title = row.title;
        break;
      }
      case 'day': {
        const dayNum = parseInt(row.day ?? '0', 10);
        if (!dayNum) break;
        const activities = row.detail
          ? row.detail.split('|').map((s) => s.trim()).filter(Boolean)
          : [];
        const day = {
          id: uid(),
          dayNumber: dayNum,
          date: row.date,
          title: row.title || `Day ${dayNum}`,
          summary: row.subtitle || row.detail || '',
          activities,
          imageKeyword: row.imageKeyword,
        };
        const idx = plan.days.findIndex((d) => d.dayNumber === dayNum);
        const enriched = {
          ...day,
          imageUrl: resolvePlanImage(day.imageKeyword, day.title),
        };
        if (idx >= 0) plan.days[idx] = { ...plan.days[idx], ...enriched };
        else plan.days.push(enriched);
        break;
      }
      case 'route':
      case 'route_stop': {
        const groupName = (row.routeGroup || 'Lonavala route').trim();
        const key = groupName.toLowerCase();
        let route = routeMap.get(key);
        if (!route) {
          route = {
            id: uid(),
            title: groupName,
            stops: [],
          };
          plan.routes.push(route);
          routeMap.set(key, route);
        }
        if (!row.title) break;
        const stop: TripPlanRouteStop = {
          id: uid(),
          name: row.title,
          note: row.subtitle,
          order: parseInt(row.order ?? String(route.stops.length + 1), 10),
          imageKeyword: row.imageKeyword,
          imageUrl: resolvePlanImage(row.imageKeyword, row.title),
        };
        route.stops.push(stop);
        route.stops.sort((a, b) => a.order - b.order);
        break;
      }
      case 'moment': {
        plan.romanticMoments.push({
          id: uid(),
          dayLabel: row.day ? `Day ${row.day}` : row.date || 'Moment',
          timeOfDay: row.subtitle,
          location: row.title || 'Location',
          tip: row.detail || '',
          bullets: row.detail?.includes('|')
            ? row.detail.split('|').map((s) => s.trim())
            : undefined,
          imageKeyword: row.imageKeyword,
          imageUrl: resolvePlanImage(row.imageKeyword, row.title),
        });
        break;
      }
      case 'backup': {
        plan.monsoonBackup.push({
          id: uid(),
          label: row.subtitle || 'BACKUP',
          title: row.title || 'Plan',
          items: (row.detail || '')
            .split('|')
            .map((s) => s.trim())
            .filter(Boolean),
        });
        break;
      }
      case 'stay_area': {
        if (row.title) plan.stayGuide.recommendedAreas.push(row.title);
        break;
      }
      case 'stay_option': {
        plan.stayGuide.options.push({
          id: uid(),
          title: row.title || 'Stay option',
          priceRange: row.subtitle || '',
          description: row.detail || '',
          searchTerms: row.detail?.includes('|')
            ? row.detail.split('|').map((s) => s.trim())
            : undefined,
        });
        break;
      }
    }
  }

  plan.days.sort((a, b) => a.dayNumber - b.dayNumber);

  return { plan, warnings };
}

export const TRIP_PLAN_CSV_TEMPLATE = `type,day,date,title,subtitle,detail,order,imageKeyword,routeGroup
meta,,,Monsoon Lonavala & Pune,,20000,,,
day,1,24 Jul,Train boarding,,Board train,,train,
day,2,25 Jul,Arrival + viewpoints,Evening,Tiger's Leap + Lion's Point,,sunset,
route_stop,2,25 Jul,Lonavala Railway Station,pickup,First stop,1,lonavala,Lonavala route
route_stop,2,25 Jul,Hostel / Co-living,stay,Check in,2,hostel,Lonavala route
route_stop,2,25 Jul,Tiger's Leap,,Viewpoint,3,tiger,Lonavala route
route_stop,2,25 Jul,Lion's Point,,Viewpoint,4,lion,Lonavala route
route_stop,3,26 Jul,Karla Caves,,Visit,5,karla,Lonavala route
route_stop,3,26 Jul,Bhushi Dam,,Visit,6,bhushi,Lonavala route
route_stop,3,26 Jul,Pawna Lake,,Evening,7,pawna,Lonavala route
route_stop,4,27 Jul,Lohagad Fort base,,Morning,8,lohagad,Lonavala route
route_stop,4,27 Jul,Shaniwar Wada,,Evening,1,wada,Pune route
route_stop,5,28 Jul,Aga Khan Palace,,Visit,2,palace,Pune route
moment,2,25 Jul,Tiger's Leap + Lion's Point,Evening,Fog + sunset|Umbrella couple shot,,sunset,
backup,,,Heavy rain — safe day,OPTION A,Stay in hostel|Cafe hopping,,rain,
stay_area,,,Tungarli area,best views,,,mountain,
stay_option,,,Backpacker hostel,₹400–₹700/bed,Dorm social vibe|Zostel Lonavala type,,hostel,
`;
