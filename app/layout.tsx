import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from './components/Navbar'
import Providers from './components/Providers'
import Footer from './components/Footer'
import { ToastContainer } from './components/ToastContainer'
import { NetworkChecker } from './components/NetworkChecker'
import AddToHomeScreen from './components/AddToHomeScreen'
import PWAHandler from './components/PWAHandler'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Clapo',
  description: 'Social platform for sharing and connecting',
  applicationName: 'Clapo',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: '/favicon.png',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Clapo',
    startupImage: [
      {
        url: '/clapo_log.png',
        media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)',
      },
    ],
  },
  formatDetection: {
    telephone: false,
    date: false,
    address: false,
    email: false,
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#000000' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Clapo" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Clapo" />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body style={{background:"#000000"}} className={inter.className}>
        <PWAHandler />
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