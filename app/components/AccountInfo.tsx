'use client'

import { usePrivy } from '@privy-io/react-auth'
import { LogOut, X, Mail, Wallet, User } from 'lucide-react'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useApi } from '../Context/ApiProvider'
import { useAuth } from '../hooks/useAuth'

interface AccountInfoProps {
  onClose?: () => void
}

export default function AccountInfo({ onClose }: AccountInfoProps) {
  const { authenticated, user: privyUser, ready, logout } = usePrivy()
  const { getUserProfile } = useApi()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Helper function to get best available name from Privy
  const getPrivyDisplayName = () => {
    if (!privyUser) return 'User'

    console.log('🔍 AccountInfo - Privy user data:', {
      google: privyUser.google,
      twitter: privyUser.twitter,
      discord: privyUser.discord,
      github: privyUser.github,
      email: privyUser.email
    })

    // Try to get name from various Privy auth methods
    if (privyUser.google?.name) {
      console.log('✅ Using Google name:', privyUser.google.name)
      return privyUser.google.name
    }
    if (privyUser.twitter?.name) {
      console.log('✅ Using Twitter name:', privyUser.twitter.name)
      return privyUser.twitter.name
    }
    if (privyUser.discord?.username) {
      console.log('✅ Using Discord username:', privyUser.discord.username)
      return privyUser.discord.username
    }
    if (privyUser.github?.username) {
      console.log('✅ Using GitHub username:', privyUser.github.username)
      return privyUser.github.username
    }
    if (privyUser.email?.address) {
      const emailName = privyUser.email.address.split('@')[0]
      console.log('✅ Using email username:', emailName)
      return emailName
    }

    return 'User'
  }

  // Helper function to get best available avatar from Privy
  const getPrivyAvatar = () => {
    if (!privyUser) return null

    // Try to get avatar from various Privy auth methods
    // Note: Privy types may vary, check available properties
    const google = privyUser.google as any
    const twitter = privyUser.twitter as any
    const discord = privyUser.discord as any
    const github = privyUser.github as any

    if (google?.pictureUrl || google?.picture) {
      const avatar = google.pictureUrl || google.picture
      console.log('✅ Using Google avatar:', avatar)
      return avatar
    }
    if (twitter?.profilePictureUrl || twitter?.picture) {
      const avatar = twitter.profilePictureUrl || twitter.picture
      console.log('✅ Using Twitter avatar:', avatar)
      return avatar
    }
    if (discord?.avatarUrl || discord?.avatar) {
      const avatar = discord.avatarUrl || discord.avatar
      console.log('✅ Using Discord avatar:', avatar)
      return avatar
    }
    if (github?.profilePictureUrl || github?.avatarUrl) {
      const avatar = github.profilePictureUrl || github.avatarUrl
      console.log('✅ Using GitHub avatar:', avatar)
      return avatar
    }

    console.log('⚠️ No avatar found in Privy data')
    return null
  }

  // Fallback timeout to prevent infinite loading
  useEffect(() => {
    const maxLoadingTimeout = setTimeout(() => {
      if (loading) {
        console.warn('AccountInfo - Loading timeout reached, forcing stop')
        setLoading(false)
        // Show basic info if we have Privy user
        if (authenticated && privyUser && !currentUser) {
          const displayName = getPrivyDisplayName()
          setCurrentUser({
            username: displayName,
            name: displayName,
            avatar_url: getPrivyAvatar(),
            account_type: 'individual'
          })
        }
      }
    }, 15000) // 15 second max loading time

    return () => clearTimeout(maxLoadingTimeout)
  }, [loading, authenticated, privyUser, currentUser])

  // Get auth from centralized Redux store
  const { currentUserId: reduxUserId } = useAuth()

  // Use Redux user ID if available, otherwise fallback to basic Privy info
  useEffect(() => {
    if (reduxUserId) {
      setCurrentUserId(reduxUserId)
    } else if (authenticated && privyUser) {
      // Show basic Privy info if backend user not available
      const displayName = getPrivyDisplayName()
      setCurrentUser({
        username: displayName,
        name: displayName,
        avatar_url: getPrivyAvatar(),
        account_type: 'individual'
      })
      setLoading(false)
    } else {
      setLoading(false)
    }
  }, [reduxUserId, authenticated, privyUser])

  // Fetch profile using getUserProfile (same as ProfilePage)
  useEffect(() => {
    const fetchProfile = async () => {
      if (currentUserId) {
        try {
          setLoading(true)

          // Add timeout to prevent infinite loading
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), 10000)
          )

          const profilePromise = getUserProfile(currentUserId)

          const profileData = await Promise.race([profilePromise, timeoutPromise])

          console.log('AccountInfo - Profile data from backend:', profileData)
          console.log('AccountInfo - Avatar URL from backend:', profileData.profile?.avatar_url)
          setCurrentUser(profileData.profile)
        } catch (error) {
          console.error('AccountInfo - Failed to fetch profile:', error)
          // Even on error, show basic info from Privy
          if (privyUser) {
            const displayName = getPrivyDisplayName()
            setCurrentUser({
              username: displayName,
              name: displayName,
              avatar_url: getPrivyAvatar(),
              account_type: 'individual'
            })
          }
        } finally {
          setLoading(false)
        }
      }
    }

    fetchProfile()
  }, [currentUserId, getUserProfile, privyUser])

  const handleLogout = async () => {
    await logout()
    window.location.href = '/'
  }

  if (!authenticated || !ready) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-black border-2 border-gray-700/70 rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl"
      >
        <div className="text-center">
          <p className="text-white text-lg font-semibold mb-2">Not Connected</p>
          <p className="text-gray-400 text-sm">Please sign in to view your account</p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      className="bg-black border-2 border-gray-700/70 rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl relative"
    >
      {/* Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/40 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Header with Badge */}
      <div className="text-center mb-6">
        <div className="inline-block bg-gray-700/30 border-2 border-[#6e54ff] rounded-2xl px-4 py-2 mb-3">
          <h2 className="text-white text-sm font-semibold tracking-wide uppercase">Connected Account</h2>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-2 border-[#6e54ff] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Avatar and Username */}
          <div className="flex flex-col items-center space-y-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-xl"></div>
              {currentUser?.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser?.username || 'User'}
                  className={`relative w-24 h-24 border-2 border-[#6e54ff] object-cover shadow-lg ${currentUser?.account_type === 'community' ? 'rounded-md' : 'rounded-full'}`}
                  onError={(e) => {
                    console.error('AccountInfo - Failed to load avatar:', currentUser.avatar_url);
                    const target = e.currentTarget as HTMLImageElement;
                    target.src = 'https://robohash.org/' + (currentUser?.username || 'user') + '.png?size=96x96';
                  }}
                />
              ) : (
                <img
                  src={'https://robohash.org/' + (currentUser?.username || 'user') + '.png?size=96x96'}
                  alt={currentUser?.username || 'User'}
                  className={`relative w-24 h-24 border-2 border-[#6e54ff] object-cover shadow-lg ${currentUser?.account_type === 'community' ? 'rounded-md' : 'rounded-full'}`}
                />
              )}
            </div>
            {currentUser && (
              <div className="text-center">
                <p className="text-white font-bold text-xl">
                  {currentUser.name || currentUser.username}
                </p>
                <p className="text-gray-400 text-sm">@{currentUser.username}</p>
              </div>
            )}
          </div>

          {/* Account Details */}
          <div className="space-y-2">
            {privyUser?.email?.address && (
              <div className="flex items-center space-x-3 bg-gray-700/30 border border-gray-700/50 rounded-xl p-3 hover:bg-gray-700/40 transition-colors">
                <div className="bg-[#6e54ff]/20 p-2 rounded-lg">
                  <Mail className="w-4 h-4 text-[#6e54ff]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Email</p>
                  <p className="text-white text-sm truncate">{privyUser.email.address}</p>
                </div>
              </div>
            )}

            {privyUser?.wallet?.address && (
              <div className="flex items-center space-x-3 bg-gray-700/30 border border-gray-700/50 rounded-xl p-3 hover:bg-gray-700/40 transition-colors">
                <div className="bg-[#6e54ff]/20 p-2 rounded-lg">
                  <Wallet className="w-4 h-4 text-[#6e54ff]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Wallet</p>
                  <p className="text-white text-xs font-mono truncate">
                    {privyUser.wallet.address.slice(0, 6)}...{privyUser.wallet.address.slice(-4)}
                  </p>
                </div>
              </div>
            )}

            {currentUser?.account_type && (
              <div className="flex items-center space-x-3 bg-gray-700/30 border border-gray-700/50 rounded-xl p-3 hover:bg-gray-700/40 transition-colors">
                <div className="bg-[#6e54ff]/20 p-2 rounded-lg">
                  <User className="w-4 h-4 text-[#6e54ff]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Account Type</p>
                  <p className="text-white text-sm capitalize">{currentUser.account_type}</p>
                </div>
              </div>
            )}
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full text-white rounded-full px-6 py-3 text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2"
            style={{
              backgroundColor: "#DC2626",
              boxShadow: "0px 1px 0.5px 0px rgba(255, 255, 255, 0.50) inset, 0px 1px 2px 0px rgba(220, 38, 38, 0.50), 0px 0px 0px 1px #DC2626"
            }}
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      )}
    </motion.div>
  )
}
