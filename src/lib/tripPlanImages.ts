/** Curated Unsplash URLs — no API key required. */
const KEYWORD_IMAGES: Record<string, string> = {
  lonavala:
    'https://images.unsplash.com/photo-1590523277543-94afbefcba0e?auto=format&fit=crop&w=900&q=80',
  pune: 'https://images.unsplash.com/photo-1570168007204-dfb528c680a3?auto=format&fit=crop&w=900&q=80',
  monsoon:
    'https://images.unsplash.com/photo-1421930866250-aa0594cea05f?auto=format&fit=crop&w=900&q=80',
  rain: 'https://images.unsplash.com/photo-1519692933481-16242f770eda?auto=format&fit=crop&w=900&q=80',
  fort: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=900&q=80',
  lohagad:
    'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=900&q=80',
  lake: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?auto=format&fit=crop&w=900&q=80',
  pawna:
    'https://images.unsplash.com/photo-1439066615861-d1af74d74000?auto=format&fit=crop&w=900&q=80',
  cave: 'https://images.unsplash.com/photo-1509316785289-025f5b846b8f?auto=format&fit=crop&w=900&q=80',
  karla:
    'https://images.unsplash.com/photo-1509316785289-025f5b846b8f?auto=format&fit=crop&w=900&q=80',
  dam: 'https://images.unsplash.com/photo-1432405972618-c60b02235bfa?auto=format&fit=crop&w=900&q=80',
  bhushi:
    'https://images.unsplash.com/photo-1432405972618-c60b02235bfa?auto=format&fit=crop&w=900&q=80',
  train:
    'https://images.unsplash.com/photo-1474487548417-781cbdaa74b4?auto=format&fit=crop&w=900&q=80',
  hostel:
    'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=900&q=80',
  mountain:
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=80',
  sunset:
    'https://images.unsplash.com/photo-1495616811223-4d98c6e2470e?auto=format&fit=crop&w=900&q=80',
  tiger:
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=80',
  lion:
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=80',
  rajmachi:
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=900&q=80',
  wada:
    'https://images.unsplash.com/photo-1524492412937-0c2307cb5776?auto=format&fit=crop&w=900&q=80',
  palace:
    'https://images.unsplash.com/photo-1524492412937-0c2307cb5776?auto=format&fit=crop&w=900&q=80',
  food:
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80',
  bike:
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=900&q=80',
  nature:
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=900&q=80',
  default:
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=900&q=80',
};

export function resolvePlanImage(
  keyword?: string,
  text?: string
): string {
  const haystack = `${keyword ?? ''} ${text ?? ''}`.toLowerCase();
  for (const key of Object.keys(KEYWORD_IMAGES)) {
    if (key === 'default') continue;
    if (haystack.includes(key)) return KEYWORD_IMAGES[key];
  }
  return KEYWORD_IMAGES.default;
}

export function attachImagesToPlan<T extends { imageKeyword?: string; imageUrl?: string }>(
  items: T[],
  textPicker: (item: T) => string
): T[] {
  return items.map((item) => ({
    ...item,
    imageUrl:
      item.imageUrl ||
      resolvePlanImage(item.imageKeyword, textPicker(item)),
  }));
}
