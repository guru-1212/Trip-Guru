// next-pwa precaching breaks on Vercel (404 on app-build-manifest.json). FCM uses firebase-messaging-sw.js instead.
const pwaDisabled =
  process.env.NODE_ENV === 'development' || process.env.VERCEL === '1';

const withPWA = require('next-pwa')({
  dest: 'public',
  register: !pwaDisabled,
  skipWaiting: true,
  disable: pwaDisabled,
  buildExcludes: [/middleware-manifest\.json$/, /app-build-manifest\.json$/],
  importScripts: ['/firebase-messaging-sw.js'],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'framer-motion',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
    ],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },
};

module.exports = withPWA(nextConfig);
