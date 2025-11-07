import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from './components/Navbar'
import Providers from './components/Providers'
import Footer from './components/Footer'
import { ToastContainer } from './components/ToastContainer'
import { NetworkChecker } from './components/NetworkChecker'
import AddToHomeScreen from './components/AddToHomeScreen'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Clapo',
  description: 'Social platform for sharing and connecting',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: '/favicon.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Clapo',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{background:"black"}} className={inter.className}>
        <Providers>
          <NetworkChecker />
          {/* <Navbar /> */}
          {children}
          {/* <Footer/> */}
          <ToastContainer />
          <AddToHomeScreen />
        </Providers>
      </body>
    </html>
  )
}