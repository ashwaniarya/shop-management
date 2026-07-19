import type { Metadata, Viewport } from 'next';
import { Big_Shoulders, IBM_Plex_Sans, JetBrains_Mono } from 'next/font/google';

import { AppGate } from '@/components/AppGate';
import { AuthProvider } from '@/context/AuthContext';

import './globals.css';

const sansFont = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans-src',
});

const monoFont = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-mono-src',
});

const displayFont = Big_Shoulders({
  subsets: ['latin'],
  weight: ['700', '800', '900'],
  variable: '--font-display-src',
});

export const metadata: Metadata = {
  title: 'Shop Management',
  description: 'Multi-shop parts counter management system',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0d0e10',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sansFont.variable} ${monoFont.variable} ${displayFont.variable}`}>
      <body className="antialiased">
        <AuthProvider>
          <AppGate>{children}</AppGate>
        </AuthProvider>
      </body>
    </html>
  );
}
