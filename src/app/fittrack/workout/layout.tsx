import { Suspense } from 'react';

export default function WorkoutPageLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="text-[var(--wk-muted)] p-4">Loading workout...</div>}>{children}</Suspense>;
}
