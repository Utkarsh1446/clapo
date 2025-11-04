/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { User, Users, MapPin, Calendar, Link, Image as ImageIcon, Star, Mail } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { usePrivy } from '@privy-io/react-auth'
import { useApi } from '@/app/Context/ApiProvider'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { giveReputation } from '@/app/lib/reputationApi'
import ReputationBadge from '@/app/components/ReputationBadge'
import { apiService } from '@/app/lib/api'
import { useAuth } from '@/app/hooks/useAuth'

interface UserProfileHoverProps {
  userId: string
  username: string
  avatarUrl?: string
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
}

interface UserStats {
  followers: number
  following: number
  posts: number
  isFollowing: boolean
}

interface UserProfile {
  id: string
  username: string
  bio?: string
  avatar_url?: string
  followers_count: number
  following_count: number
  total_posts: number
  website?: string
  reputation_score?: number
  reputation_tier?: 'newcomer' | 'contributor' | 'veteran' | 'expert' | 'legend'
  account_type?: 'individual' | 'community'
  recentPosts?: Array<{
    id: string
    media_url?: string
    content: string
  }>
}

export function UserProfileHover({ 
  userId, 
  username, 
  avatarUrl, 
  children, 
  position = 'bottom' 
}: UserProfileHoverProps) {
  const [showProfile, setShowProfile] = useState(false)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isGivingRep, setIsGivingRep] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const { data: session, status } = useSession()
  const { authenticated: privyAuthenticated, user: privyUser, ready: privyReady } = usePrivy()
  const { getUserProfile, getUserFollowers, getUserFollowing, followUser, unfollowUser } = useApi()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Get auth from centralized Redux store
  const { currentUserId: reduxUserId } = useAuth()

  // Support both NextAuth (legacy) and Privy auth
  const currentUserId = status === "authenticated" && session?.dbUser?.id
    ? session.dbUser.id
    : reduxUserId

  const isOwnProfile = currentUserId === userId

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    timeoutRef.current = setTimeout(async () => {
      setShowProfile(true)
      await loadUserStats()
    }, 500)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    timeoutRef.current = setTimeout(() => {
      setShowProfile(false)
      // Clear stats when hiding to allow fresh data next time
      setUserStats(null)
      setUserProfile(null)
      setIsFollowing(false)
    }, 200)
  }

  const loadUserStats = async () => {
    if (!currentUserId || isLoading) return

    // If we already have stats, don't reload
    if (userStats && userProfile) return

    setIsLoading(true)
    try {
      const profileResponse = await getUserProfile(userId)

      if (profileResponse && profileResponse.profile) {
        const profile = profileResponse.profile

        // Set user profile data
        setUserProfile(profile)

        setUserStats({
          posts: profile.total_posts || 0,
          followers: profile.followers_count || 0,
          following: profile.following_count || 0,
          isFollowing: false
        })

        // Check follow status
        if (!isOwnProfile) {
          const followersResponse = await getUserFollowers(userId, 100, 0)
          const isCurrentlyFollowing = followersResponse?.followers?.some(
            (follower: any) => follower.follower_id === currentUserId
          )
          setIsFollowing(isCurrentlyFollowing || false)
          if (userStats) {
            setUserStats(prev => prev ? { ...prev, isFollowing: isCurrentlyFollowing || false } : null)
          }
        }
      }
    } catch (error) {
      console.error('Failed to load user stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFollowToggle = async () => {
    if (!currentUserId || isOwnProfile) return
    
    try {
      if (isFollowing) {
        await unfollowUser(userId, { followerId: currentUserId })
        setIsFollowing(false)
        if (userStats) {
          setUserStats({ ...userStats, followers: Math.max(0, userStats.followers - 1) })
        }
      } else {
        await followUser(userId, { followerId: currentUserId })
        setIsFollowing(true)
        if (userStats) {
          setUserStats({ ...userStats, followers: userStats.followers + 1 })
        }
      }
    } catch (error) {
      console.error('❌ Failed to toggle follow:', error)
    }
  }

  const handleViewProfile = () => {
    // Store current page state and scroll position
    const currentState = {
      pathname,
      searchParams: searchParams.toString(),
      scrollY: window.scrollY,
      timestamp: Date.now()
    }

    // Store in sessionStorage for persistence across navigation
    sessionStorage.setItem('profileNavigationState', JSON.stringify(currentState))

    // Navigate to profile
    router.push(`/snaps/profile/${userId}`)
    setShowProfile(false)
  }

  const handleGiveRep = async () => {
    if (!currentUserId || isOwnProfile || isGivingRep) return

    setIsGivingRep(true)
    try {
      await giveReputation(currentUserId, userId, 'Given from profile hover')
      alert('Reputation given successfully!')
    } catch (error) {
      console.error('Failed to give reputation:', error)
      alert(error.message || 'Failed to give reputation. You may have reached your daily limit.')
    } finally {
      setIsGivingRep(false)
    }
  }

  const handleMessage = async () => {
    if (!currentUserId || isOwnProfile) return

    try {
      await apiService.createMessageThread({
        creatorId: currentUserId,
        targetUserId: userId
      })
      router.push('/snaps/messages')
      setShowProfile(false)
    } catch (error) {
      console.error('Error creating message thread:', error)
    }
  }

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full left-0 mb-2'
      case 'bottom':
        return 'top-full left-0 mt-2'
      case 'left':
        return 'right-full top-1/2 transform -translate-y-1/2 mr-2'
      case 'right':
        return 'left-full top-1/2 transform -translate-y-1/2 ml-2'
      default:
        return 'top-full left-0 mt-2'
    }
  }

  return (
    <>
      <div 
        className="relative inline-block"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
        
        {showProfile && (
          <div className={`absolute ${getPositionClasses()} z-50`}>
            <div className="bg-black border-2 border-gray-700/70 rounded-2xl shadow-custom p-0 w-80 max-w-sm overflow-hidden">
              {/* Arrow */}
              <div className={`absolute w-3 h-3 bg-black border-l border-t border-gray-700/70 transform rotate-45 ${
                position === 'top' ? 'top-full -mt-1.5' :
                position === 'bottom' ? 'bottom-full -mb-1.5' :
                position === 'left' ? 'left-full -ml-1.5' :
                'right-full -mr-1.5'
              }`} />

              {/* Header Section */}
              <div className="p-4 pb-3">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <Image
                        src={userProfile?.avatar_url || avatarUrl || '/4.png'}
                        alt={username}
                        width={56}
                        height={56}
                        className={`w-14 h-14 border-2 border-gray-600 object-cover ${userProfile?.account_type === 'community' ? 'rounded-md' : 'rounded-full'}`}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/4.png';
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <button
                          onClick={handleViewProfile}
                          className="text-white font-semibold text-sm truncate hover:text-blue-400 transition-colors cursor-pointer"
                        >
                          {userProfile?.username || username}
                        </button>
                      </div>
                      {userProfile?.website && (
                        <p className="text-gray-400 text-sm truncate">{userProfile.website}</p>
                      )}
                      <p className="text-gray-500 text-sm flex items-center">
                        <span className="mr-1">@</span>{userProfile?.username || username}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bio */}
                {userProfile?.bio && (
                  <p className="text-white text-sm mb-3 leading-relaxed">
                    {userProfile.bio}
                  </p>
                )}

                {/* Reputation Badge */}
                {userProfile?.reputation_tier && (
                  <div className="mb-3">
                    <ReputationBadge
                      tier={userProfile.reputation_tier}
                      score={userProfile.reputation_score || 0}
                      size="sm"
                      showScore={true}
                      showLabel={true}
                    />
                  </div>
                )}

                {/* Stats */}
                {userStats && (
                  <div className="grid grid-cols-3 gap-6 mb-4">
                    <div className="text-center">
                      <div className="text-white font-bold text-lg">{userStats.posts}</div>
                      <div className="text-gray-400 text-sm">posts</div>
                    </div>
                    <div className="text-center">
                      <div className="text-white font-bold text-lg">{userStats.followers}</div>
                      <div className="text-gray-400 text-sm">followers</div>
                    </div>
                    <div className="text-center">
                      <div className="text-white font-bold text-lg">{userStats.following}</div>
                      <div className="text-gray-400 text-sm">following</div>
                    </div>
                  </div>
                )}
              </div>


              {/* Action Buttons */}
              {!isOwnProfile && (
                <div className="px-4 pb-4 space-y-2">
                  <button
                    onClick={handleFollowToggle}
                    className="w-full py-1.5 text-white text-xs font-medium rounded-full transition-all duration-200"
                    style={{
                      backgroundColor: isFollowing ? "#6B7280" : "#6E54FF",
                      boxShadow: isFollowing ? "none" : "0px 1px 0.5px 0px rgba(255, 255, 255, 0.50) inset, 0px 1px 2px 0px rgba(110, 84, 255, 0.50), 0px 0px 0px 1px #6E54FF"
                    }}
                  >
                    <div className="flex items-center justify-center space-x-1.5">
                      <Users className="w-3.5 h-3.5" />
                      <span>{isFollowing ? 'Following' : 'Follow'}</span>
                    </div>
                  </button>

                  <button
                    onClick={handleGiveRep}
                    disabled={isGivingRep}
                    className="w-full py-1.5 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs font-medium rounded-full transition-all duration-200"
                  >
                    <div className="flex items-center justify-center space-x-1.5">
                      <Star className="w-3.5 h-3.5" />
                      <span>{isGivingRep ? 'Giving Rep...' : 'Give Reputation'}</span>
                    </div>
                  </button>
                </div>
              )}

              {/* Loading state */}
              {isLoading && (
                <div className="text-center py-8">
                  <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>


    </>
  )
} 