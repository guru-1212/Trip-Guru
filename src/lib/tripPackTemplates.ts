import type { TripPackCategory, TripPackItemType } from '@/types/tripPackItem';

export interface TripPackTemplateItem {
  slug: string;
  title: string;
  category: TripPackCategory;
  itemType: TripPackItemType;
  featured?: boolean;
}

export interface TripPackTemplatePack {
  key: string;
  label: string;
  description: string;
  items: TripPackTemplateItem[];
}

export const TRIP_PACK_TEMPLATE_PACKS: TripPackTemplatePack[] = [
  {
    key: 'common_essentials_v1',
    label: 'Common essentials',
    description: 'IDs, charger, meds, and basics for any trip',
    items: [
      { slug: 'gov_id', title: 'Government ID', category: 'Documents', itemType: 'bring', featured: true },
      { slug: 'wallet', title: 'Wallet & cards', category: 'Documents', itemType: 'bring', featured: true },
      { slug: 'phone_charger', title: 'Phone charger', category: 'Electronics', itemType: 'bring', featured: true },
      { slug: 'power_bank', title: 'Power bank', category: 'Electronics', itemType: 'bring', featured: true },
      { slug: 'medicines', title: 'Personal medicines', category: 'Health', itemType: 'bring', featured: true },
      { slug: 'first_aid', title: 'Basic first-aid kit', category: 'Health', itemType: 'bring' },
      { slug: 'toiletries', title: 'Toiletries kit', category: 'Toiletries', itemType: 'bring' },
      { slug: 'snacks', title: 'Travel snacks', category: 'Food', itemType: 'buy' },
      { slug: 'water_bottle', title: 'Reusable water bottle', category: 'Food', itemType: 'bring' },
      { slug: 'extra_clothes', title: 'Extra clothes (2–3 sets)', category: 'Clothing', itemType: 'bring' },
    ],
  },
  {
    key: 'rainy_season_v1',
    label: 'Rainy season',
    description: 'Stay dry and comfortable in wet weather',
    items: [
      { slug: 'raincoat', title: 'Raincoat / poncho', category: 'Clothing', itemType: 'buy', featured: true },
      { slug: 'umbrella', title: 'Compact umbrella', category: 'Miscellaneous', itemType: 'buy', featured: true },
      { slug: 'waterproof_bag', title: 'Waterproof bag cover', category: 'Miscellaneous', itemType: 'buy', featured: true },
      { slug: 'quick_dry_towel', title: 'Quick-dry towel', category: 'Toiletries', itemType: 'bring', featured: true },
      { slug: 'extra_socks', title: 'Extra socks (waterproof pack)', category: 'Clothing', itemType: 'bring', featured: true },
      { slug: 'zip_pouches', title: 'Zip pouches for phone & wallet', category: 'Miscellaneous', itemType: 'buy' },
      { slug: 'slip_shoes', title: 'Slip-resistant footwear', category: 'Clothing', itemType: 'bring' },
      { slug: 'mosquito_repellent', title: 'Mosquito repellent', category: 'Health', itemType: 'buy' },
      { slug: 'anti_fungal', title: 'Anti-fungal powder / cream', category: 'Health', itemType: 'buy' },
      { slug: 'plastic_bags', title: 'Extra plastic bags for wet clothes', category: 'Miscellaneous', itemType: 'buy' },
    ],
  },
];

export function getTripPackTemplatePack(key: string): TripPackTemplatePack | undefined {
  return TRIP_PACK_TEMPLATE_PACKS.find((p) => p.key === key);
}

/** Featured chips across all packs (deduped by slug). */
export function getTripPackQuickAddItems(): (TripPackTemplateItem & { packKey: string })[] {
  const seen = new Set<string>();
  const result: (TripPackTemplateItem & { packKey: string })[] = [];
  for (const pack of TRIP_PACK_TEMPLATE_PACKS) {
    for (const item of pack.items) {
      if (!item.featured || seen.has(item.slug)) continue;
      seen.add(item.slug);
      result.push({ ...item, packKey: pack.key });
    }
  }
  return result;
}

export function templateItemDedupeKey(
  tripId: string,
  templateKey: string,
  slug: string
): string {
  return `${tripId}:${templateKey}:${slug}`;
}
