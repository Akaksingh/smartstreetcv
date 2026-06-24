import type { Metadata } from 'next';
import './globals.css';
import GovHeader from '@/components/GovHeader';

export const metadata: Metadata = {
  title: 'NagarAI — Civic Issue Reporting Portal',
  description: 'AI-powered road and civic infrastructure reporting portal for Indian citizens. Report potholes, waterlogging, open manholes and other road issues instantly.',
  keywords: 'civic issues, road repair, pothole reporting, india, smart city, NagarAI',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <GovHeader />
        {children}
        <footer className="gov-footer">
          <p>
            <strong>NagarAI — Civic Issue Reporting Portal</strong><br />
            Powered by AI for Indian citizens &nbsp;|&nbsp; Built with Qwen2.5-VL + FastAPI + PostgreSQL<br />
            Report issues to your local municipal corporation. Data is for civic use only.
          </p>
        </footer>
      </body>
    </html>
  );
}
