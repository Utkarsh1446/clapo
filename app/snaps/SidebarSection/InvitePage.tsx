'use client'

import React, { useState, useEffect } from 'react'
import { X, Copy, Share, ArrowLeft, Gift } from 'lucide-react'
import { motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { usePrivy } from '@privy-io/react-auth'
import { AccessTokenManager } from '@/app/components/AccessTokenManager'
import { useAuth } from '@/app/hooks/useAuth'

interface InviteCode {
  id: string
  code: string
  isUsed: boolean
  usedBy?: string
  usedAt?: Date
}

export default function InvitePage() {
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([])
  const [totalCodes] = useState(50)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [hasCreatorToken, setHasCreatorToken] = useState(false)
  const [isLoadingUser, setIsLoadingUser] = useState(true)

  const { data: session, status } = useSession()
  const { authenticated: privyAuthenticated, user: privyUser, ready: privyReady } = usePrivy()

  // Get auth from centralized Redux store
  const { currentUserId: reduxUserId, backendUser } = useAuth()

  // Support both NextAuth (legacy) and Privy auth
  const currentUserId = session?.dbUser?.id || reduxUserId
  const currentUsername = session?.dbUser?.username || backendUser?.username || 'User'

  // Check for creator token when userId is available
  useEffect(() => {
    const initializeCreatorToken = async () => {
      if (currentUserId) {
        setIsLoadingUser(true)
        await checkForCreatorToken(currentUserId)
        setIsLoadingUser(false)
      } else {
        setIsLoadingUser(false)
      }
    }

    initializeCreatorToken()
  }, [currentUserId])

  // Check if user has created a creator token
  const checkForCreatorToken = async (userId: string) => {
    try {
      // Import the tokenApiService
      const { tokenApiService } = await import('@/app/lib/tokenApi')
      const { generateCreatorTokenUUID } = await import('@/app/lib/uuid')

      const creatorTokenUuid = generateCreatorTokenUUID(userId)

      // Try to get the creator token stats
      const response = await tokenApiService.getAccessTokenStats(creatorTokenUuid)

      if (response.success && response.data) {
        setHasCreatorToken(true)
      }
    } catch (error) {
      console.log('User has not created a creator token yet')
      setHasCreatorToken(false)
    }
  }

  // Generate invite codes on component mount (fallback for users without creator tokens)
  useEffect(() => {
    const generateCodes = () => {
      const codes: InviteCode[] = []
      for (let i = 0; i < totalCodes; i++) {
        codes.push({
          id: `invite-${i + 1}`,
          code: generateRandomCode(),
          isUsed: i < 3, // First 3 codes are used (as shown in screenshot)
          usedBy: i < 3 ? `user${i + 1}@example.com` : undefined,
          usedAt: i < 3 ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) : undefined
        })
      }
      return codes
    }

    setInviteCodes(generateCodes())
  }, [totalCodes])

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }

  const handleShareCode = (code: string) => {
    if (navigator.share) {
      navigator.share({
        title: 'Join Clapo with my invite code',
        text: `Use my invite code to join Clapo: ${code}`,
        url: `${window.location.origin}/signup?invite=${code}`
      })
    } else {
      // Fallback: copy to clipboard
      handleCopyCode(`Join Clapo with my invite code: ${code} - ${window.location.origin}/signup?invite=${code}`)
    }
  }

  const usedCodes = inviteCodes.filter(code => code.isUsed).length
  const availableCodes = totalCodes - usedCodes

  // Loading state
  if (isLoadingUser) {
    return (
      <div className="w-full text-white p-4 md:p-6">
        <div className="bg-black border border-gray-800 rounded-2xl p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-800 rounded w-1/3"></div>
            <div className="h-4 bg-gray-800 rounded w-2/3"></div>
            <div className="h-4 bg-gray-800 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full text-white">
      {/* Content */}
      <div className="p-4 md:p-6">
        {hasCreatorToken && currentUserId && currentUsername ? (
          // Show AccessTokenManager if user has created a creator token
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Header Stats Card */}
            <div className="bg-black border border-gray-800 rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-white mb-2">
                Your Creator Share Access Tokens
              </h2>
              <p className="text-gray-400 text-sm mb-3">
                Share these access tokens with your friends to give them free access to your creator share.
              </p>
              <p className="text-gray-400 text-sm">
                Invite friends to use Clapo with the below invitation codes. You'll earn extra points when they sign up.
              </p>
            </div>

            {/* Access Token Manager */}
            <AccessTokenManager
              userId={currentUserId}
              username={currentUsername}
              isOwnProfile={true}
            />
          </motion.div>
        ) : (
          // Show message if user hasn't created a creator token
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black border border-gray-800 rounded-2xl p-8 text-center"
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-[#6E54FF]/20 rounded-full flex items-center justify-center">
                <Gift className="w-8 h-8 text-[#6E54FF]" />
              </div>
              <h2 className="text-xl font-semibold text-white">
                Launch your Creator Share to start onboarding your friends
              </h2>
              <p className="text-gray-400 text-sm max-w-md">
                Create your creator share to generate access tokens that you can share with friends and community members. They'll get free access to your creator tokens!
              </p>
              <button
                onClick={() => window.location.href = '/snaps/profile/' + currentUserId}
                className="mt-4 px-6 py-3 rounded-full text-sm font-semibold transition-all duration-200 text-white bg-[#6E54FF] hover:bg-[#5940cc]"
              >
                Go to Profile
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
