'use client';

import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { WorkspaceGuard } from './WorkspaceGuard';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/10 selection:text-primary">
      <WorkspaceGuard />
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-h-[calc(100vh-4rem)] bg-muted/20 lg:bg-background/50 overflow-x-hidden">
          <div className="container mx-auto px-4 sm:px-6 lg:px-12 py-6 md:py-10 pb-32 lg:pb-12 max-w-[1400px]">
             {children}
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
