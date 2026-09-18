import { redirect } from 'next/navigation';

/** Legacy account route; account settings live on the FitTrack profile. */
export default function ProfileRedirectPage() {
  redirect('/fittrack/profile');
}
