'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { RoomPageShell } from '@/components/rooms/RoomPageShell';
import { useAppSelector } from '@/store';
import { useAuth } from '@/hooks/useAuth';
import { useRoomSettlement } from '@/hooks/useRoomSettlement';
import { getTotalSpent, getMemberPaidTotals } from '@/lib/settlementAlgorithm';
import { isSettlementOpen } from '@/lib/mergeRoomSettlements';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCycleLabel } from '@/firebase/firestore';
import { 
  Receipt, 
  HandCoins, 
  Wallet, 
  PlusCircle, 
  Users, 
  History, 
  CreditCard,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function RoomOverviewPage() {
  const params = useParams();
  const roomId = params.roomId as string;

  return (
    <RoomPageShell roomId={roomId}>
      <OverviewContent />
    </RoomPageShell>
  );
}

function OverviewContent() {
  const { uid } = useAuth();
  const room = useAppSelector((s) => s.rooms.currentRoom);
  const cycle = useAppSelector((s) => s.rooms.activeCycle);
  const expenses = useAppSelector((s) => s.roomExpenses.expenses);
  const members = useAppSelector((s) => s.rooms.members);
  const roomId = room?.roomId ?? '';
  const { displaySettlements, getMemberName } = useRoomSettlement(roomId);
  const myMemberKey = members.find((m) => m.userId === uid)?.id;
  const carryForward = useAppSelector((s) =>
    s.roomSettlements.carryForward.filter((c) => c.status !== 'settled')
  );

  const openDues = displaySettlements.filter((s) => isSettlementOpen(s.status));
  const myDues = openDues.filter((s) => s.fromMemberKey === myMemberKey);
  
  const total = getTotalSpent(expenses);
  const rentExpense = expenses.find(e => e.category === 'Rent');
  const currency = room?.currency ?? 'INR';
  const paidByMember = useMemo(() => {
    const accepted = members.filter((m) => m.inviteStatus === 'accepted');
    return getMemberPaidTotals(expenses, accepted);
  }, [expenses, members]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
    >
      {/* Primary Stats Card */}
      <motion.div variants={item} className="lg:col-span-2">
        <Card className="h-full border-primary/20 bg-primary/5 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <TrendingUp className="h-32 w-32" />
          </div>
          <CardHeader>
            <CardDescription className="text-primary font-bold uppercase tracking-wider">
              {cycle ? formatCycleLabel(cycle) : 'Current cycle'}
            </CardDescription>
            <CardDescription className="text-muted-foreground font-semibold normal-case tracking-normal">
              Total spent this cycle
            </CardDescription>
            <CardTitle className="text-4xl font-black">
              {currency} {total.toLocaleString()}
            </CardTitle>
            {paidByMember.some((m) => m.amount > 0) && (
              <div className="mt-4 pt-4 border-t border-primary/10 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Paid by
                </p>
                <ul className="space-y-1.5">
                  {paidByMember
                    .filter((m) => m.amount > 0)
                    .map(({ memberKey, amount }) => (
                    <li
                      key={memberKey}
                      className="flex items-center justify-between gap-4 text-sm font-semibold max-w-md"
                    >
                      <span className="text-foreground">{getMemberName(memberKey)}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {currency} {amount.toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="rounded-xl shadow-lg shadow-primary/20">
                <Link href={`/rooms/${room?.roomId}/expenses`}>
                  <PlusCircle className="h-4 w-4 mr-2" /> Add expense
                </Link>
              </Button>
              <Button variant="outline" asChild className="rounded-xl bg-background/50 backdrop-blur-sm">
                <Link href={`/rooms/${room?.roomId}/settlement`}>
                  <Wallet className="h-4 w-4 mr-2" /> Settlements
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Rent Status Card */}
      <motion.div variants={item}>
        <Card className="h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-rose-500" /> Rent Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rentExpense ? (
              <div className="space-y-1">
                <p className="text-2xl font-black text-emerald-600">Paid</p>
                <p className="text-xs text-muted-foreground">Recorded on {rentExpense.expenseDate.toDate().toLocaleDateString()}</p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-2xl font-black text-rose-500">Unpaid</p>
                <p className="text-xs text-muted-foreground">Not recorded for this cycle</p>
                <Button variant="link" asChild className="p-0 h-auto text-xs font-bold text-primary">
                  <Link href={`/rooms/${room?.roomId}/rent`}>View rent details <ArrowRight className="h-3 w-3 ml-1" /></Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Pending Dues Card */}
      <motion.div variants={item} className="lg:col-span-2">
        <Card className="h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground flex items-center gap-2">
              <HandCoins className="h-4 w-4 text-amber-500" /> Pending dues
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {openDues.length === 0 && carryForward.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending payments this cycle.</p>
            ) : (
              <>
                {openDues.length > 0 && (
                  <ul className="space-y-2">
                    {openDues.map((s) => (
                      <li
                        key={s.id}
                        className="flex justify-between gap-2 text-sm font-semibold"
                      >
                        <span>
                          {getMemberName(s.fromMemberKey)}
                          <span className="text-muted-foreground font-normal">
                            {' '}
                            → pay to {getMemberName(s.toMemberKey)}
                          </span>
                          {s.status === 'awaiting_confirmation' && (
                            <span className="block text-xs text-amber-600 font-medium">
                              Awaiting confirmation
                            </span>
                          )}
                        </span>
                        <span className="tabular-nums shrink-0">
                          {currency} {s.amount.toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {myDues.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    You have {myDues.length} payment
                    {myDues.length > 1 ? 's' : ''} to make.
                  </p>
                )}
                {carryForward.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Plus {carryForward.length} balance
                    {carryForward.length > 1 ? 's' : ''} from earlier months.
                  </p>
                )}
              </>
            )}
            <Button variant="link" asChild className="p-0 h-auto text-xs font-bold text-primary">
              <Link href={`/rooms/${room?.roomId}/settlement`}>
                Open settlements <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Members Card */}
      <motion.div variants={item}>
        <Card className="h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" /> Roommates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black">{members.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Active members in room</p>
            <div className="flex -space-x-2 mt-3 overflow-hidden">
              {members.slice(0, 5).map((m, i) => (
                <div 
                  key={m.id} 
                  className="inline-block h-8 w-8 rounded-full ring-2 ring-background bg-muted flex items-center justify-center text-[10px] font-bold"
                  style={{ zIndex: 10 - i }}
                >
                  {m.name.charAt(0)}
                </div>
              ))}
              {members.length > 5 && (
                <div className="inline-block h-8 w-8 rounded-full ring-2 ring-background bg-muted-foreground text-white flex items-center justify-center text-[10px] font-bold z-0">
                  +{members.length - 5}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* History Shortcut */}
      <motion.div variants={item}>
        <Link href={`/rooms/${room?.roomId}/history`} className="block h-full">
          <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer group">
            <CardContent className="p-6 flex flex-col items-center justify-center h-full text-center space-y-2">
              <div className="p-3 rounded-full bg-muted group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                <History className="h-6 w-6" />
              </div>
              <div>
                <p className="font-bold">Past Cycles</p>
                <p className="text-xs text-muted-foreground">View expense history</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </motion.div>
    </motion.div>
  );
}
