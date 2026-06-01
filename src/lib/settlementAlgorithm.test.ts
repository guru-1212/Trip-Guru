import {
  applyCarryForwardToBalances,
  calculateNetBalances,
  computeRoomSettlements,
} from './settlementAlgorithm';
import { mergeRoomSettlements } from './mergeRoomSettlements';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function runTests() {
  const members = [
    { id: 'guru', userId: 'u1', inviteStatus: 'accepted' as const },
    { id: 'saurav', userId: 'u2', inviteStatus: 'accepted' as const },
  ];

  const repairExpense = {
    amount: 1000,
    paidBy: 'guru',
    splitBetween: [
      { uid: 'guru', amount: 500 },
      { uid: 'saurav', amount: 500 },
    ],
  };

  const balances = calculateNetBalances([repairExpense], members);
  assert(balances.get('guru') === 500, 'Guru should be credited 500');
  assert(balances.get('saurav') === -500, 'Saurav should owe 500');

  const withCarry = applyCarryForwardToBalances(balances, [
    {
      fromMemberKey: 'saurav',
      toMemberKey: 'guru',
      amount: 500,
      status: 'pending',
    },
  ]);
  assert(withCarry.get('saurav') === -1000, 'Carry forward doubles saurav debt');
  assert(withCarry.get('guru') === 1000, 'Carry forward doubles guru credit');

  const septemberExpense = {
    amount: 200,
    paidBy: 'saurav',
    splitBetween: [
      { uid: 'guru', amount: 100 },
      { uid: 'saurav', amount: 100 },
    ],
  };

  const net = computeRoomSettlements(
    [septemberExpense],
    members,
    'room1',
    [
      {
        fromMemberKey: 'saurav',
        toMemberKey: 'guru',
        amount: 500,
        status: 'pending',
      },
    ]
  );

  const main = net.find(
    (s) => s.fromMemberKey === 'saurav' && s.toMemberKey === 'guru'
  );
  assert(main !== undefined, 'Should have saurav -> guru settlement');
  assert(main!.amount === 400, `Expected net 400, got ${main!.amount}`);

  const sauravPaid = {
    amount: 1000,
    paidBy: 'saurav',
    splitBetween: [
      { uid: 'guru', amount: 500 },
      { uid: 'saurav', amount: 500 },
    ],
  };
  const guruOwes = computeRoomSettlements([sauravPaid], members, 'room1');
  const guruToSaurav = guruOwes.find(
    (s) => s.fromMemberKey === 'guru' && s.toMemberKey === 'saurav'
  );
  assert(guruToSaurav !== undefined, 'Guru should owe Saurav when Saurav paid');
  assert(guruToSaurav!.amount === 500, `Expected 500, got ${guruToSaurav!.amount}`);

  const paidByUserId = {
    amount: 200,
    paidBy: 'u2',
    splitBetween: [
      { uid: 'guru', amount: 100 },
      { uid: 'saurav', amount: 100 },
    ],
  };
  const fromUid = computeRoomSettlements([paidByUserId], members, 'room1');
  assert(
    fromUid.some((s) => s.fromMemberKey === 'guru' && s.toMemberKey === 'saurav'),
    'Legacy paidBy userId should still credit payer'
  );

  const merged = mergeRoomSettlements(
    guruToSaurav ? [guruToSaurav] : [],
    [
      {
        id: 'saved1',
        roomId: 'room1',
        cycleId: 'cycle1',
        fromMemberKey: 'guru',
        toMemberKey: 'saurav',
        amount: 500,
        status: 'paid',
        source: 'computed',
        paidAt: null,
        claimedAt: null,
        confirmedAt: null,
      },
    ],
    'cycle1'
  );
  assert(
    merged[0]?.status === 'pending',
    'Paid settlement should reopen when new debt exists'
  );

  console.log('settlementAlgorithm tests passed');
}

runTests();
