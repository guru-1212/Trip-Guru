import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ReduxProvider } from '@/components/providers/ReduxProvider';
import { FCMProvider } from '@/components/providers/FCMProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { PWAInstallPrompt } from '@/components/common/PWAInstallPrompt';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { OfflineStatus } from '@/components/common/OfflineStatus';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FitTrack — Gym & Nutrition Tracker',
  description: 'Log workouts, track water and diet, and follow your training split',
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/logo.svg', type: 'image/svg+xml' }],
    apple: '/logo.svg',
    shortcut: '/logo.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FitTrack',
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
          <AuthProvider>
            <FCMProvider>
              {children}
              <OfflineStatus />
              <PWAInstallPrompt />
              <ToastProvider />
            </FCMProvider>
          </AuthProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
