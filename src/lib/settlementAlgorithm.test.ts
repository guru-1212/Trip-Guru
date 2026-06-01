import {
  applyCarryForwardToBalances,
  calculateNetBalances,
  computeRoomSettlements,
} from './settlementAlgorithm';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function runTests() {
  const members = [
    { id: 'guru', userId: 'u1' },
    { id: 'saurav', userId: 'u2' },
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

  console.log('settlementAlgorithm tests passed');
}

runTests();
