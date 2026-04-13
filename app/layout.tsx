import type { Metadata } from 'next'
import { DM_Sans, Space_Grotesk } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({ 
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['300', '400', '500', '600']
})

const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  weight: ['400', '500', '600']
})

export const metadata: Metadata = {
  title: 'React Commerce — Business Messaging',
  description: 'Unified WhatsApp, Instagram & Facebook inbox',
}

export default function RootLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body className={`${dmSans.variable} ${spaceGrotesk.variable}`}>
        {children}
      </body>
    </html>
  )
}