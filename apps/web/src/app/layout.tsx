import type { Metadata } from 'next';
import { Big_Shoulders, IBM_Plex_Sans, JetBrains_Mono } from 'next/font/google';

import { Sidebar } from '@/components/Sidebar';
import { ShopSelector } from '@/components/ShopSelector';
import { ShopProvider } from '@/context/ShopContext';

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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sansFont.variable} ${monoFont.variable} ${displayFont.variable}`}>
      <body className="antialiased">
        <ShopProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex flex-1 flex-col">
              <header className="flex items-center justify-between border-b border-ink-800 bg-ink-900 px-6 py-3">
                <p className="font-mono text-xs tracking-wide text-ink-500">
                  Parts counter workstation
                </p>
                <ShopSelector />
              </header>
              <main className="bg-graticule flex-1 p-6">{children}</main>
            </div>
          </div>
        </ShopProvider>
      </body>
    </html>
  );
}
