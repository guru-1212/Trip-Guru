import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ReduxProvider } from '@/components/providers/ReduxProvider';
import { FCMProvider } from '@/components/providers/FCMProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TripMate — Group Travel Expenses',
  description: 'Track group travel expenses and settle up with friends',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TripMate',
  },
};

export const dynamic = 'force-dynamic';

export const viewport: Viewport = {
  themeColor: '#6366F1',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ReduxProvider>
          <FCMProvider>{children}</FCMProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
