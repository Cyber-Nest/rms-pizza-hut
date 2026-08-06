'use client';

import React from 'react';
import { Toaster } from 'react-hot-toast';

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      toastOptions={{
        // Default base options
        duration: 3500,
        style: {
          background: '#FFFFFF',
          color: '#1C1917',
          border: '1px solid #E7E5E4',
          borderRadius: '12px',
          padding: '10px 14px',
          fontSize: '11px',
          fontWeight: 600,
          fontFamily: 'var(--font-sans), Inter, system-ui, sans-serif',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02)',
        },
        // Success  (light green background with solid green border)
        success: {
          iconTheme: {
            primary: '#16A34A',
            secondary: '#FFFFFF',
          },
          style: {
            background: '#F0FDF4',
            border: '1px solid #DCFAE6',
            color: '#14532D',
          },
        },
        // Error  (light red background with solid red border)
        error: {
          iconTheme: {
            primary: '#DC2626',
            secondary: '#FFFFFF',
          },
          style: {
            background: '#FEF2F2',
            border: '1px solid #FEE2E2',
            color: '#7F1D1D',
          },
        },
      }}
    />
  );
}
