'use client';

import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 container mx-auto px-4 py-6 pb-24 lg:pb-6">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
