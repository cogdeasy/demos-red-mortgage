import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HSBC Mortgage Services',
  description: 'Mortgage origination and underwriting platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
