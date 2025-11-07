'use client'

import { useEffect } from 'react'

export default function PWAHandler() {
  useEffect(() => {
    // Detect if app is running in standalone mode
    const isStandalone = () => {
      return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://')
      )
    }

    // Add class to body if in standalone mode
    if (isStandalone()) {
      document.body.classList.add('pwa-standalone')

      // Prevent pull-to-refresh on mobile
      let lastTouchY = 0
      const touchStartHandler = (e: TouchEvent) => {
        lastTouchY = e.touches[0].clientY
      }

      const touchMoveHandler = (e: TouchEvent) => {
        const touchY = e.touches[0].clientY
        const touchYDelta = touchY - lastTouchY
        lastTouchY = touchY

        // Prevent pull-to-refresh at the top of the page
        if (window.scrollY === 0 && touchYDelta > 0) {
          e.preventDefault()
        }
      }

      document.addEventListener('touchstart', touchStartHandler, { passive: true })
      document.addEventListener('touchmove', touchMoveHandler, { passive: false })

      // Prevent long-press context menu
      window.addEventListener('contextmenu', (e) => {
        e.preventDefault()
      })

      return () => {
        document.removeEventListener('touchstart', touchStartHandler)
        document.removeEventListener('touchmove', touchMoveHandler)
      }
    }

    // Handle viewport height on mobile (especially iOS)
    const setViewportHeight = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    }

    setViewportHeight()
    window.addEventListener('resize', setViewportHeight)

    return () => {
      window.removeEventListener('resize', setViewportHeight)
    }
  }, [])

  return null
}
