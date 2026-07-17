import type { Metadata, Viewport } from 'next';
import { Inter, Poppins } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { GoogleAnalytics } from '@next/third-parties/google';
import './globals.css';
import { ErrorReporter } from '@/components/ErrorReporter';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-heading',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Imob Parcerias',
  description: 'Rede exclusiva de parcerias entre corretores de imóveis credenciados',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    title: 'Imob Parcerias',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  themeColor: '#16283D',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${poppins.variable}`}>
      <body>
        <ErrorReporter />
        {children}
        <Analytics />
      </body>
      <GoogleAnalytics gaId="G-K5HBLNLW6W" />
    </html>
  );
}
