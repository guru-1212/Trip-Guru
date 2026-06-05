import { Suspense } from 'react';

export default function ChecklistLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="ft-loading"><span>Loading...</span></div>}>{children}</Suspense>;
}
