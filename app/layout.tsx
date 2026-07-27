import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Cinzel, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const displayFont = Cinzel({
  subsets: ['latin'],
  weight: ['400', '600', '700', '900'],
  variable: '--font-display',
  display: 'swap',
})

const uiFont = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-ui',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Echoes of the Scale — Duel Ignis, the Ancient Flame',
  description:
    'A voice-driven AI boss battle. Answer the riddles of Ignis, an ancient dragon whose fury adapts to every word you speak. Wit is your only weapon.',
  generator: 'v0.app',
  openGraph: {
    title: 'Echoes of the Scale',
    description:
      'Face Ignis, the Ancient Flame. An AI dragon that reasons, taunts, and burns. Wit is your only weapon.',
    type: 'website',
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0d0b09',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark bg-background ${displayFont.variable} ${uiFont.variable}`}>
      <body className="bg-background text-foreground font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
