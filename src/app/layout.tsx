import './globals.css';
import type { Metadata } from 'react';

export const metadata: Metadata = {
  title: 'Aviation Weather & Runway Resolver',
  description: 'Real-time METAR Decoder and Runway Crosswind Resolver',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}