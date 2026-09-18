import { redirect } from 'next/navigation';

/** Legacy landing route; FitTrack is the whole app now. */
export default function DashboardRedirectPage() {
  redirect('/fittrack/dashboard');
}
