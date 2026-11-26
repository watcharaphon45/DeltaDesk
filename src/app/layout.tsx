import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DeltaDesk | Crypto Trading Terminal',
  description:
    'Real-time multi-exchange cryptocurrency charting terminal powered by KlineCharts v10',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="dark">
      <body className="bg-terminal-bg text-terminal-text font-sans antialiased selection:bg-terminal-blue/30">
        {children}
      </body>
    </html>
  );
}
