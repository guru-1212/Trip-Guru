import {
  extractJsonPayload,
  matchFoodByName,
  matchImportedFoods,
  parseGramsFromLabel,
  parseImportedFoods,
  resolveServings,
} from './dietImportParser';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion Failed: ${message}`);
}

const baseNutrients = {
  calories: 100,
  proteinG: 10,
  carbsG: 5,
  fatG: 3,
  fiberG: 1,
  calciumMg: 20,
  ironMg: 1,
  magnesiumMg: 15,
  potassiumMg: 100,
};

function testExtractJsonPayload() {
  console.log('Testing extractJsonPayload...');
  const fenced = '```json\n[{"foodName":"Egg"}]\n```';
  assert(
    extractJsonPayload(fenced).startsWith('[{"foodName":"Egg"}]'),
    'Should strip markdown fences'
  );
  assert(extractJsonPayload('  [{"a":1}]  ') === '[{"a":1}]', 'Should trim whitespace');
}

function testParseGramsFromLabel() {
  console.log('Testing parseGramsFromLabel...');
  assert(parseGramsFromLabel('100 g') === 100, '100 g');
  assert(parseGramsFromLabel('1 scoop (48 g)') === 48, 'parenthetical grams');
  assert(parseGramsFromLabel('1 medium') === null, 'non-gram label');
}

function testResolveServingsGrams() {
  console.log('Testing resolveServings (grams)...');
  const result = resolveServings({ amount: 150, unit: 'g' }, '100 g');
  assert(result.servings === 1.5, '150g / 100g = 1.5 servings');
  assert(result.servingLabel === '100 g', 'keeps serving label');

  const fallback = resolveServings({ amount: 200, unit: 'grams' }, '');
  assert(fallback.servings === 1, 'no label fallback servings');
  assert(fallback.servingLabel === '200 g', 'fallback label');
}

function testResolveServingsPieces() {
  console.log('Testing resolveServings (pieces)...');
  const result = resolveServings({ amount: 2, unit: 'piece' }, '1 egg', 2);
  assert(result.servings === 2, 'explicit servings');
}

function testParseImportedFoods() {
  console.log('Testing parseImportedFoods...');

  const parsed = parseImportedFoods([
    {
      foodName: 'Boiled Egg',
      mealSlot: 'breakfast',
      quantity: { amount: 2, unit: 'piece' },
      servingLabel: '1 egg',
      servings: 2,
      nutrients: baseNutrients,
    },
  ]);
  assert(parsed.length === 1, 'one item');
  assert(parsed[0].foodName === 'Boiled Egg', 'food name');
  assert(parsed[0].servings === 2, 'servings');

  const gramParsed = parseImportedFoods([
    {
      foodName: 'Rice (Cooked)',
      mealSlot: 'lunch',
      quantity: { amount: 150, unit: 'g' },
      servingLabel: '100 g',
      nutrients: baseNutrients,
    },
  ]);
  assert(gramParsed[0].servings === 1.5, 'derived gram servings');

  let threw = false;
  try {
    parseImportedFoods([{ foodName: 'X', mealSlot: 'brunch', quantity: { amount: 1, unit: 'g' }, nutrients: baseNutrients }]);
  } catch {
    threw = true;
  }
  assert(threw, 'invalid mealSlot throws');

  threw = false;
  try {
    parseImportedFoods([]);
  } catch (e) {
    threw = e instanceof Error && e.message === 'empty';
  }
  assert(threw, 'empty array throws empty');
}

function testMatchImportedFoods() {
  console.log('Testing matchImportedFoods...');

  const items = parseImportedFoods([
    {
      foodName: 'boiled egg',
      mealSlot: 'breakfast',
      quantity: { amount: 1, unit: 'piece' },
      servingLabel: '1 egg',
      servings: 1,
      nutrients: baseNutrients,
    },
    {
      foodName: 'Unknown Food',
      mealSlot: 'snack',
      quantity: { amount: 1, unit: 'serving' },
      servingLabel: '1 serving',
      servings: 1,
      nutrients: baseNutrients,
    },
  ]);

  const matched = matchImportedFoods(items, []);
  assert(matched[0].matched === true, 'case-insensitive library match');
  assert(matched[0].libraryFood?.id === 'egg-boiled', 'matched egg id');
  assert(matched[0].imported.nutrients.calories === 100, 'AI nutrients preserved');
  assert(matched[1].matched === false, 'unknown food is custom');
}

function testMatchFoodByName() {
  console.log('Testing matchFoodByName...');
  const food = matchFoodByName('Paneer', []);
  assert(food?.id === 'paneer', 'finds paneer in database');
}

function run() {
  testExtractJsonPayload();
  testParseGramsFromLabel();
  testResolveServingsGrams();
  testResolveServingsPieces();
  testParseImportedFoods();
  testMatchImportedFoods();
  testMatchFoodByName();
  console.log('All dietImportParser tests passed.');
}

run();
