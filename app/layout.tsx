import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import localFont from 'next/font/local'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const nasalization = localFont({
  src: '../public/fonts/nasalization.otf',
  variable: '--font-nasalization',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'GRUPO NEW ENERGY — Panel Comercial',
  description: 'Plataforma de gestión para comerciales de GRUPO NEW ENERGY',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${nasalization.variable} antialiased min-h-screen bg-background`}
      >
        {children}
      </body>
    </html>
  )
}
