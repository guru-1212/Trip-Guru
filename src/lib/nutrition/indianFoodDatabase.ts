import type { FoodItem } from '@/types/nutrition';

function f(
  id: string,
  name: string,
  servingLabel: string,
  nutrients: FoodItem['nutrients'],
  category: FoodItem['category'],
  tags: FoodItem['tags'],
  extra?: Partial<FoodItem>
): FoodItem {
  return { id, name, servingLabel, nutrients, category, tags, source: 'ICMR-NIN', ...extra };
}

/** Static Hyderabad / South Indian mixed-diet database — fixed portions only */
export const INDIAN_FOOD_DATABASE: FoodItem[] = [
  // User seed list
  f('egg-boiled', 'Boiled Egg', '1 egg', { calories: 70, proteinG: 6, carbsG: 0.5, fatG: 5, fiberG: 0, calciumMg: 25, ironMg: 0.9, magnesiumMg: 6, potassiumMg: 70 }, 'protein', ['egg', 'protein_rich']),
  f('banana', 'Banana', '1 medium', { calories: 105, proteinG: 1.3, carbsG: 27, fatG: 0.4, fiberG: 3.1, calciumMg: 6, ironMg: 0.3, magnesiumMg: 32, potassiumMg: 422 }, 'fruit', ['veg', 'snack'], { nameHi: 'arati pandu' }),
  f('groundnuts', 'Groundnuts (Peanuts)', '30 g', { calories: 170, proteinG: 8, carbsG: 5, fatG: 14, fiberG: 2.5, calciumMg: 16, ironMg: 0.5, magnesiumMg: 50, potassiumMg: 200 }, 'nut', ['veg', 'snack', 'protein_rich']),
  f('peanut-butter', 'Peanut Butter', '1 tbsp (16 g)', { calories: 95, proteinG: 4, carbsG: 3, fatG: 8, fiberG: 1, calciumMg: 8, ironMg: 0.3, magnesiumMg: 25, potassiumMg: 90 }, 'nut', ['veg', 'snack']),
  f('bread', 'Bread', '1 slice', { calories: 70, proteinG: 2.5, carbsG: 13, fatG: 1, fiberG: 1, calciumMg: 30, ironMg: 0.9, magnesiumMg: 8, potassiumMg: 30 }, 'staple', ['veg', 'staple']),
  f('protein-powder', 'Protein Powder', '1 scoop (48 g)', { calories: 188, proteinG: 24, carbsG: 6, fatG: 3, fiberG: 1, calciumMg: 120, ironMg: 1, magnesiumMg: 40, potassiumMg: 150 }, 'supplement', ['veg', 'protein_rich']),
  f('almonds', 'Almonds', '10 pieces (~14 g)', { calories: 81, proteinG: 3, carbsG: 3, fatG: 7, fiberG: 1.5, calciumMg: 35, ironMg: 0.5, magnesiumMg: 38, potassiumMg: 95 }, 'nut', ['veg', 'snack']),
  f('soy-chunks', 'Soy Chunks', '50 g dry', { calories: 170, proteinG: 26, carbsG: 15, fatG: 0.5, fiberG: 8, calciumMg: 100, ironMg: 3.5, magnesiumMg: 80, potassiumMg: 400 }, 'protein', ['veg', 'protein_rich']),
  f('paneer', 'Paneer', '100 g', { calories: 265, proteinG: 18, carbsG: 4, fatG: 20, fiberG: 0, calciumMg: 200, ironMg: 0.2, magnesiumMg: 20, potassiumMg: 70 }, 'protein', ['veg', 'protein_rich']),
  f('curd', 'Curd', '100 g', { calories: 60, proteinG: 3.5, carbsG: 4.5, fatG: 3, fiberG: 0, calciumMg: 120, ironMg: 0.1, magnesiumMg: 12, potassiumMg: 140 }, 'dairy', ['veg']),
  f('milk', 'Milk', '250 ml', { calories: 150, proteinG: 8, carbsG: 12, fatG: 8, fiberG: 0, calciumMg: 280, ironMg: 0.1, magnesiumMg: 25, potassiumMg: 320 }, 'dairy', ['veg']),
  f('chicken-breast', 'Chicken Breast', '100 g', { calories: 165, proteinG: 31, carbsG: 0, fatG: 3.6, fiberG: 0, calciumMg: 12, ironMg: 0.7, magnesiumMg: 28, potassiumMg: 256 }, 'protein', ['non_veg', 'protein_rich']),
  f('rice-cooked', 'Rice (Cooked)', '100 g', { calories: 130, proteinG: 2.7, carbsG: 28, fatG: 0.3, fiberG: 0.4, calciumMg: 10, ironMg: 0.2, magnesiumMg: 12, potassiumMg: 35 }, 'staple', ['veg', 'staple'], { nameHi: 'annam' }),
  f('chapati', 'Chapati', '1 medium', { calories: 120, proteinG: 3, carbsG: 22, fatG: 3, fiberG: 2, calciumMg: 15, ironMg: 1, magnesiumMg: 20, potassiumMg: 80 }, 'staple', ['veg', 'staple']),
  f('oats', 'Oats', '50 g dry', { calories: 190, proteinG: 7, carbsG: 32, fatG: 3.5, fiberG: 5, calciumMg: 25, ironMg: 2, magnesiumMg: 70, potassiumMg: 180 }, 'breakfast', ['veg', 'staple']),
  f('apple', 'Apple', '1 medium', { calories: 95, proteinG: 0.5, carbsG: 25, fatG: 0.3, fiberG: 4, calciumMg: 10, ironMg: 0.1, magnesiumMg: 9, potassiumMg: 195 }, 'fruit', ['veg', 'snack']),
  f('orange', 'Orange', '1 medium', { calories: 62, proteinG: 1.2, carbsG: 15, fatG: 0.2, fiberG: 3, calciumMg: 52, ironMg: 0.1, magnesiumMg: 13, potassiumMg: 237 }, 'fruit', ['veg', 'snack']),

  // Breakfast
  f('idli', 'Idli', '2 pieces', { calories: 106, proteinG: 3.6, carbsG: 22, fatG: 0.4, fiberG: 1.2, calciumMg: 20, ironMg: 0.8, magnesiumMg: 15, potassiumMg: 60 }, 'breakfast', ['veg', 'staple']),
  f('dosa-plain', 'Dosa (Plain)', '1 medium', { calories: 120, proteinG: 3, carbsG: 20, fatG: 3, fiberG: 1, calciumMg: 15, ironMg: 1, magnesiumMg: 18, potassiumMg: 70 }, 'breakfast', ['veg', 'staple']),
  f('upma', 'Upma', '1 cup', { calories: 250, proteinG: 6, carbsG: 40, fatG: 7, fiberG: 3, calciumMg: 20, ironMg: 1.5, magnesiumMg: 30, potassiumMg: 120 }, 'breakfast', ['veg', 'staple']),
  f('poha', 'Poha', '1 cup', { calories: 250, proteinG: 5, carbsG: 45, fatG: 5, fiberG: 2, calciumMg: 15, ironMg: 2, magnesiumMg: 25, potassiumMg: 100 }, 'breakfast', ['veg', 'staple']),
  f('paratha-plain', 'Paratha (Plain)', '1 piece', { calories: 260, proteinG: 6, carbsG: 38, fatG: 10, fiberG: 2, calciumMg: 20, ironMg: 2, magnesiumMg: 25, potassiumMg: 90 }, 'breakfast', ['veg', 'staple']),

  // Dal & legumes
  f('toor-dal', 'Toor Dal', '1 katori (150 g)', { calories: 180, proteinG: 10, carbsG: 28, fatG: 3, fiberG: 5, calciumMg: 30, ironMg: 2.5, magnesiumMg: 40, potassiumMg: 300 }, 'dal', ['veg', 'protein_rich']),
  f('moong-dal', 'Moong Dal', '1 katori (150 g)', { calories: 160, proteinG: 11, carbsG: 24, fatG: 2, fiberG: 4, calciumMg: 25, ironMg: 2, magnesiumMg: 35, potassiumMg: 280 }, 'dal', ['veg', 'protein_rich']),
  f('rajma', 'Rajma', '1 katori (150 g)', { calories: 210, proteinG: 12, carbsG: 32, fatG: 2, fiberG: 8, calciumMg: 40, ironMg: 3, magnesiumMg: 50, potassiumMg: 400 }, 'dal', ['veg', 'protein_rich']),
  f('chole', 'Chole', '1 katori (150 g)', { calories: 220, proteinG: 11, carbsG: 35, fatG: 4, fiberG: 9, calciumMg: 50, ironMg: 3.5, magnesiumMg: 55, potassiumMg: 350 }, 'dal', ['veg', 'protein_rich']),
  f('sprouted-moong', 'Sprouted Moong', '1 cup', { calories: 120, proteinG: 9, carbsG: 18, fatG: 0.5, fiberG: 4, calciumMg: 20, ironMg: 2, magnesiumMg: 30, potassiumMg: 250 }, 'dal', ['veg', 'protein_rich']),

  // More staples & proteins
  f('brown-rice', 'Brown Rice (Cooked)', '100 g', { calories: 112, proteinG: 2.6, carbsG: 24, fatG: 0.9, fiberG: 1.8, calciumMg: 10, ironMg: 0.4, magnesiumMg: 44, potassiumMg: 86 }, 'staple', ['veg', 'staple']),
  f('jeera-rice', 'Jeera Rice', '1 cup', { calories: 240, proteinG: 4, carbsG: 45, fatG: 5, fiberG: 1, calciumMg: 15, ironMg: 0.5, magnesiumMg: 20, potassiumMg: 80 }, 'staple', ['veg', 'staple']),
  f('fish-rohu', 'Fish (Rohu)', '100 g', { calories: 120, proteinG: 20, carbsG: 0, fatG: 4, fiberG: 0, calciumMg: 40, ironMg: 0.5, magnesiumMg: 25, potassiumMg: 300 }, 'protein', ['non_veg', 'protein_rich']),
  f('egg-white', 'Egg Whites', '3 eggs', { calories: 51, proteinG: 11, carbsG: 0.7, fatG: 0.2, fiberG: 0, calciumMg: 7, ironMg: 0.1, magnesiumMg: 4, potassiumMg: 54 }, 'protein', ['egg', 'protein_rich']),
  f('tofu', 'Tofu', '100 g', { calories: 76, proteinG: 8, carbsG: 1.9, fatG: 4.8, fiberG: 0.3, calciumMg: 350, ironMg: 1.5, magnesiumMg: 30, potassiumMg: 121 }, 'protein', ['veg', 'protein_rich']),

  // Dairy & beverages
  f('lassi-sweet', 'Lassi (Sweet)', '250 ml', { calories: 180, proteinG: 6, carbsG: 28, fatG: 5, fiberG: 0, calciumMg: 200, ironMg: 0.1, magnesiumMg: 20, potassiumMg: 250 }, 'dairy', ['veg']),
  f('buttermilk', 'Buttermilk', '250 ml', { calories: 45, proteinG: 3, carbsG: 5, fatG: 1, fiberG: 0, calciumMg: 100, ironMg: 0.1, magnesiumMg: 10, potassiumMg: 120 }, 'beverage', ['veg']),
  f('ghee', 'Ghee', '1 tsp (5 g)', { calories: 45, proteinG: 0, carbsG: 0, fatG: 5, fiberG: 0, calciumMg: 0, ironMg: 0, magnesiumMg: 0, potassiumMg: 0 }, 'dairy', ['veg']),
  f('tea-milk', 'Tea with Milk', '1 cup', { calories: 50, proteinG: 2, carbsG: 6, fatG: 2, fiberG: 0, calciumMg: 60, ironMg: 0.1, magnesiumMg: 5, potassiumMg: 80 }, 'beverage', ['veg']),
  f('coconut-water', 'Coconut Water', '200 ml', { calories: 38, proteinG: 0.5, carbsG: 9, fatG: 0, fiberG: 0, calciumMg: 24, ironMg: 0.1, magnesiumMg: 14, potassiumMg: 300 }, 'beverage', ['veg']),

  // Fruits
  f('mango', 'Mango', '1 medium', { calories: 135, proteinG: 1, carbsG: 35, fatG: 0.5, fiberG: 3.5, calciumMg: 20, ironMg: 0.2, magnesiumMg: 18, potassiumMg: 280 }, 'fruit', ['veg', 'snack']),
  f('papaya', 'Papaya', '1 cup', { calories: 55, proteinG: 0.7, carbsG: 14, fatG: 0.2, fiberG: 2.5, calciumMg: 25, ironMg: 0.1, magnesiumMg: 14, potassiumMg: 260 }, 'fruit', ['veg', 'snack']),
  f('pomegranate', 'Pomegranate', '1 cup arils', { calories: 144, proteinG: 2.9, carbsG: 32, fatG: 2, fiberG: 7, calciumMg: 17, ironMg: 0.5, magnesiumMg: 21, potassiumMg: 411 }, 'fruit', ['veg', 'snack']),
  f('watermelon', 'Watermelon', '2 cups', { calories: 80, proteinG: 1.6, carbsG: 20, fatG: 0.4, fiberG: 1, calciumMg: 20, ironMg: 0.6, magnesiumMg: 27, potassiumMg: 340 }, 'fruit', ['veg', 'snack']),
  f('guava', 'Guava', '1 medium', { calories: 68, proteinG: 2.6, carbsG: 14, fatG: 1, fiberG: 5, calciumMg: 18, ironMg: 0.4, magnesiumMg: 22, potassiumMg: 417 }, 'fruit', ['veg', 'snack']),

  // Nuts & snacks
  f('walnuts', 'Walnuts', '30 g', { calories: 196, proteinG: 4.6, carbsG: 4, fatG: 19.5, fiberG: 2, calciumMg: 28, ironMg: 0.9, magnesiumMg: 44, potassiumMg: 132 }, 'nut', ['veg', 'snack']),
  f('cashews', 'Cashews', '30 g', { calories: 175, proteinG: 5.7, carbsG: 9, fatG: 14, fiberG: 1, calciumMg: 12, ironMg: 1.9, magnesiumMg: 73, potassiumMg: 160 }, 'nut', ['veg', 'snack']),
  f('flaxseed', 'Flaxseed', '1 tbsp', { calories: 55, proteinG: 2, carbsG: 3, fatG: 4.3, fiberG: 2.8, calciumMg: 26, ironMg: 0.6, magnesiumMg: 40, potassiumMg: 84 }, 'nut', ['veg']),
  f('samosa', 'Samosa', '1 piece', { calories: 260, proteinG: 5, carbsG: 30, fatG: 14, fiberG: 2, calciumMg: 15, ironMg: 1.5, magnesiumMg: 20, potassiumMg: 120 }, 'snack', ['veg', 'snack']),
  f('medu-vada', 'Medu Vada', '1 piece', { calories: 150, proteinG: 5, carbsG: 18, fatG: 7, fiberG: 2, calciumMg: 15, ironMg: 1, magnesiumMg: 18, potassiumMg: 80 }, 'snack', ['veg', 'snack']),
  f('marie-biscuit', 'Marie Biscuit', '2 pieces', { calories: 76, proteinG: 1.2, carbsG: 12, fatG: 2.5, fiberG: 0.5, calciumMg: 20, ironMg: 0.8, magnesiumMg: 5, potassiumMg: 30 }, 'snack', ['veg', 'snack']),
  f('banana-chips', 'Banana Chips', '30 g', { calories: 160, proteinG: 1, carbsG: 18, fatG: 10, fiberG: 2, calciumMg: 5, ironMg: 0.3, magnesiumMg: 20, potassiumMg: 200 }, 'snack', ['veg', 'snack']),

  // Vegetables (fixed portions)
  f('palak-sabzi', 'Palak Sabzi', '1 katori', { calories: 80, proteinG: 4, carbsG: 8, fatG: 4, fiberG: 3, calciumMg: 120, ironMg: 3, magnesiumMg: 50, potassiumMg: 400 }, 'staple', ['veg']),
  f('bhindi-sabzi', 'Bhindi Sabzi', '1 katori', { calories: 90, proteinG: 3, carbsG: 10, fatG: 5, fiberG: 4, calciumMg: 80, ironMg: 0.8, magnesiumMg: 45, potassiumMg: 250 }, 'staple', ['veg']),
  f('aloo-gobi', 'Aloo Gobi', '1 katori', { calories: 140, proteinG: 3, carbsG: 18, fatG: 7, fiberG: 3, calciumMg: 30, ironMg: 1, magnesiumMg: 25, potassiumMg: 350 }, 'staple', ['veg']),
];

/** Telugu/Hindi/short aliases → match against food names & ids */
const SEARCH_ALIASES: Record<string, string[]> = {
  annam: ['rice', 'chapati', 'jeera'],
  rice: ['rice', 'annam', 'chawal'],
  chawal: ['rice'],
  anda: ['egg'],
  egg: ['egg', 'anda'],
  eggs: ['egg'],
  doodh: ['milk'],
  milk: ['milk', 'doodh'],
  palak: ['palak'],
  paneer: ['paneer'],
  chicken: ['chicken'],
  murg: ['chicken'],
  dal: ['dal', 'toor', 'moong', 'rajma', 'chole'],
  roti: ['chapati', 'paratha', 'rumali'],
  chapati: ['chapati', 'roti'],
  idli: ['idli'],
  dosa: ['dosa'],
  oats: ['oats'],
  whey: ['protein'],
  protein: ['protein', 'soy', 'paneer', 'chicken', 'egg'],
  peanut: ['groundnut', 'peanut'],
  groundnut: ['groundnut', 'peanut'],
  banana: ['banana', 'arati'],
  apple: ['apple'],
  biryani: ['jeera', 'rice'],
  hostel: ['custom'],
  mess: ['custom'],
};

function matchesQuery(food: FoodItem, q: string): boolean {
  if (!q) return true;
  const haystack = [
    food.name,
    food.id,
    food.nameHi ?? '',
    food.servingLabel,
    food.category,
    ...food.tags,
  ]
    .join(' ')
    .toLowerCase();

  if (haystack.includes(q)) return true;

  const aliasKeys = Object.keys(SEARCH_ALIASES).filter(
    (key) => q.includes(key) || key.includes(q)
  );
  for (const key of aliasKeys) {
    if (SEARCH_ALIASES[key].some((term) => haystack.includes(term))) return true;
  }

  return q.split(/\s+/).every((word) => word.length < 2 || haystack.includes(word));
}

export function searchFoods(query: string, category?: string): FoodItem[] {
  const q = query.trim().toLowerCase();
  const results = INDIAN_FOOD_DATABASE.filter((f) => {
    if (category && category !== 'all' && f.category !== category) return false;
    return matchesQuery(f, q);
  });

  if (!q) return results;

  // Sort: name starts with query first
  return results.sort((a, b) => {
    const aStart = a.name.toLowerCase().startsWith(q) ? 0 : 1;
    const bStart = b.name.toLowerCase().startsWith(q) ? 0 : 1;
    if (aStart !== bStart) return aStart - bStart;
    return a.name.localeCompare(b.name);
  });
}

export function getFoodById(id: string): FoodItem | undefined {
  return INDIAN_FOOD_DATABASE.find((f) => f.id === id);
}

export const QUICK_ADD_FOOD_IDS = [
  'egg-boiled',
  'rice-cooked',
  'chapati',
  'paneer',
  'chicken-breast',
  'protein-powder',
  'banana',
  'milk',
  'oats',
  'groundnuts',
  'toor-dal',
  'idli',
];
