'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Home, PlusCircle, HandCoins, ChevronRight } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchUserRooms } from '@/features/rooms/roomsThunks';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function RoomsDashboardSection() {
  const { uid } = useAuth();
  const dispatch = useAppDispatch();
  const rooms = useAppSelector((s) => s.rooms.rooms);
  const carryForward = useAppSelector((s) =>
    s.roomSettlements.carryForward.filter((c) => c.status !== 'settled')
  );

  useEffect(() => {
    if (uid) dispatch(fetchUserRooms(uid));
  }, [uid, dispatch]);

  const featured = rooms[0];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black flex items-center gap-2">
          <Home className="h-5 w-5 text-primary" />
          My Rooms
        </h2>
        <Button variant="outline" size="sm" asChild>
          <Link href="/rooms/new">
            <PlusCircle className="h-4 w-4 mr-1" /> New room
          </Link>
        </Button>
      </div>

      {rooms.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <p>No rooms yet. Create a PG or shared home to track expenses.</p>
            <Button className="mt-4" asChild>
              <Link href="/rooms/new">Create room</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {featured && (
            <motion.div whileHover={{ scale: 1.01 }}>
              <Link href={`/rooms/${featured.roomId}`}>
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-6">
                    <p className="text-xs font-black uppercase text-primary tracking-widest mb-2">
                      Featured
                    </p>
                    <p className="text-2xl font-black">{featured.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {featured.membersCount} members
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          )}
          {carryForward.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <p className="text-xs font-black uppercase text-amber-600 tracking-widest mb-2 flex items-center gap-1">
                  <HandCoins className="h-4 w-4" /> Pending dues
                </p>
                <p className="text-2xl font-black">{carryForward.length}</p>
                <p className="text-sm text-muted-foreground">
                  Cross-month balances to settle
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {rooms.length > 1 && (
        <div className="space-y-2">
          {rooms.slice(1).map((room) => (
            <Link
              key={room.roomId}
              href={`/rooms/${room.roomId}`}
              className="flex items-center justify-between p-4 rounded-2xl border hover:bg-muted/50 transition-colors"
            >
              <span className="font-bold">{room.name}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
