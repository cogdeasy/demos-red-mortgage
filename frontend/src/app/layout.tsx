import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mortgage Origination Platform',
  description: 'Full-stack mortgage application processing system',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
