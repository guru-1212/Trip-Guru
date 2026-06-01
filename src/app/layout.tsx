import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ReduxProvider } from '@/components/providers/ReduxProvider';
import { FCMProvider } from '@/components/providers/FCMProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { AppModeProvider } from '@/components/providers/AppModeProvider';
import { PWAInstallPrompt } from '@/components/common/PWAInstallPrompt';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TripMate — Group Travel Expenses',
  description: 'Track group travel expenses and settle up with friends',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/logo.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/icons/icon-192x192.png',
  },
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
          <AuthProvider>
            <AppModeProvider>
            <FCMProvider>
              {children}
              <PWAInstallPrompt />
            </FCMProvider>
            </AppModeProvider>
          </AuthProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
