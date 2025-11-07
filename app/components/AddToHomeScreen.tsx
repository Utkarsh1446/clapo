'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function AddToHomeScreen() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOSPrompt, setShowIOSPrompt] = useState(false)
  const [showAndroidPrompt, setShowAndroidPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if app is already installed (standalone mode)
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
                              (window.navigator as any).standalone === true

    setIsStandalone(isStandaloneMode)

    if (isStandaloneMode) {
      return // Don't show prompt if already installed
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(isIOSDevice)

    // Check if user is on mobile
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)

    if (!isMobile) {
      return // Don't show prompt on desktop
    }

    // Check if prompt was dismissed before
    const promptDismissed = localStorage.getItem('pwa-prompt-dismissed')
    const dismissedTime = promptDismissed ? parseInt(promptDismissed) : 0
    const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24)

    if (promptDismissed && daysSinceDismissed < 7) {
      return // Don't show again if dismissed within last 7 days
    }

    // Handle Android/Chrome install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)

      // Show prompt after a short delay for better UX
      setTimeout(() => {
        setShowAndroidPrompt(true)
      }, 2000)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // For iOS, show custom prompt since iOS doesn't support beforeinstallprompt
    if (isIOSDevice && !isStandaloneMode) {
      setTimeout(() => {
        setShowIOSPrompt(true)
      }, 2000)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setShowAndroidPrompt(false)
    }

    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString())
    setShowAndroidPrompt(false)
    setShowIOSPrompt(false)
  }

  if (isStandalone || (!showAndroidPrompt && !showIOSPrompt)) {
    return null
  }

  return (
    <>
      {/* Android/Chrome Prompt */}
      {showAndroidPrompt && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-black via-black/95 to-transparent">
          <div className="max-w-md mx-auto bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-2xl">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <img
                  src="/clapo_log.png"
                  alt="Clapo"
                  className="w-12 h-12 rounded-xl"
                />
                <div>
                  <h3 className="text-white font-semibold text-lg">Install Clapo</h3>
                  <p className="text-zinc-400 text-sm">Add to your home screen</p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
                aria-label="Dismiss"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-zinc-300 text-sm mb-4">
              Install Clapo for a better experience. Access it instantly from your home screen!
            </p>

            <div className="flex gap-2">
              <button
                onClick={handleAndroidInstall}
                className="flex-1 bg-white text-black font-semibold py-3 px-4 rounded-lg hover:bg-zinc-200 transition-colors"
              >
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-3 text-zinc-400 hover:text-white transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS Prompt */}
      {showIOSPrompt && isIOS && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-black via-black/95 to-transparent">
          <div className="max-w-md mx-auto bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-2xl">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <img
                  src="/clapo_log.png"
                  alt="Clapo"
                  className="w-12 h-12 rounded-xl"
                />
                <div>
                  <h3 className="text-white font-semibold text-lg">Install Clapo</h3>
                  <p className="text-zinc-400 text-sm">Add to your home screen</p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
                aria-label="Dismiss"
              >
                <X size={20} />
              </button>
            </div>

            <div className="text-zinc-300 text-sm mb-4 space-y-2">
              <p>To install Clapo on your iOS device:</p>
              <ol className="list-decimal list-inside space-y-1 pl-2">
                <li>Tap the Share button <span className="inline-block">
                  <svg className="inline w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 14H4v-7h2v5h12v-5h2v7z"/>
                  </svg>
                </span> in Safari</li>
                <li>Scroll down and tap &quot;Add to Home Screen&quot;</li>
                <li>Tap &quot;Add&quot; in the top right corner</li>
              </ol>
            </div>

            <button
              onClick={handleDismiss}
              className="w-full bg-zinc-800 text-white font-semibold py-3 px-4 rounded-lg hover:bg-zinc-700 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  )
}
