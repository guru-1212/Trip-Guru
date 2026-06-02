import {
  computeTripPackProgress,
  computeMemberPackProgress,
  nextPackStatus,
} from './tripPackProgress';
import type { TripPackItem } from '@/types/tripPackItem';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function item(
  overrides: Partial<TripPackItem> & Pick<TripPackItem, 'itemType' | 'status'>
): TripPackItem {
  return {
    id: '1',
    tripId: 't1',
    title: 'Test',
    category: 'Miscellaneous',
    quantity: '',
    note: '',
    assignedToMemberKey: null,
    source: 'custom',
    templateKey: null,
    templateItemSlug: null,
    createdBy: 'u1',
    createdAt: { toMillis: () => 0 } as TripPackItem['createdAt'],
    packedAt: null,
    ...overrides,
  };
}

function runTests() {
  const empty = computeTripPackProgress([]);
  assert(empty.overallPercent === 0, 'empty overall 0%');
  assert(empty.total === 0, 'empty total 0');

  const items = [
    item({ itemType: 'buy', status: 'packed' }),
    item({ itemType: 'buy', status: 'todo' }),
    item({ itemType: 'bring', status: 'packed' }),
    item({ itemType: 'bring', status: 'todo' }),
  ];
  const stats = computeTripPackProgress(items);
  assert(stats.overallPercent === 50, 'overall 50%');
  assert(stats.buyPercent === 50, 'buy 50%');
  assert(stats.bringPercent === 50, 'bring 50%');
  assert(stats.remaining === 2, '2 remaining');

  const memberStats = computeMemberPackProgress(
    [
      item({
        itemType: 'bring',
        status: 'packed',
        assignedToMemberKey: 'm1',
      }),
      item({
        itemType: 'bring',
        status: 'todo',
        assignedToMemberKey: 'm1',
      }),
      item({
        itemType: 'bring',
        status: 'packed',
        assignedToMemberKey: 'm2',
      }),
    ],
    'm1'
  );
  assert(memberStats.assigned === 2, 'm1 assigned 2');
  assert(memberStats.packed === 1, 'm1 packed 1');
  assert(memberStats.percent === 50, 'm1 50%');

  assert(
    nextPackStatus({ itemType: 'buy', status: 'todo' }) === 'ready',
    'buy todo -> ready'
  );
  assert(
    nextPackStatus({ itemType: 'buy', status: 'ready' }) === 'packed',
    'buy ready -> packed'
  );
  assert(
    nextPackStatus({ itemType: 'bring', status: 'todo' }) === 'packed',
    'bring todo -> packed'
  );

  console.log('tripPackProgress tests passed');
}

runTests();
