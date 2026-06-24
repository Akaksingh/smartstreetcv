import type { Metadata } from 'next';
import './globals.css';
import BottomNav from '@/components/BottomNav';

export const metadata: Metadata = {
  title: 'NagarAI — Smart Street Civic Reporter',
  description: 'Report road issues, potholes, and civic problems in your neighbourhood using AI. Built for Indian cities.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="page-wrapper">
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
