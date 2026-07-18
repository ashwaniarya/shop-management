import type { Metadata } from 'next';

import { Sidebar } from '@/components/Sidebar';
import { ShopSelector } from '@/components/ShopSelector';
import { ShopProvider } from '@/context/ShopContext';

import './globals.css';

export const metadata: Metadata = {
  title: 'Shop Management',
  description: 'Multi-shop management system',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      {/* Pinned light theme: the shell's gray palette has no dark: variants yet. */}
      <body className="bg-white text-gray-900 antialiased">
        <ShopProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex flex-1 flex-col">
              <header className="flex items-center justify-end border-b border-gray-200 px-6 py-3">
                <ShopSelector />
              </header>
              <main className="flex-1 p-6">{children}</main>
            </div>
          </div>
        </ShopProvider>
      </body>
    </html>
  );
}
