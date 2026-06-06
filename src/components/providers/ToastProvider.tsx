'use client';

import { Toaster } from 'react-hot-toast';

export function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 4000,
        style: { maxWidth: '90vw', fontSize: '14px' },
      }}
    />
  );
}
