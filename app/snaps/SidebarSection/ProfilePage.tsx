"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Image from 'next/image'
import { User, Post } from "@/app/types"
import { Ellipsis, Eye, Heart, MessageCircle, Repeat2, Bookmark, ThumbsUp, FileText, X, Grid, Users, Volume2, Share2, Triangle, Video } from "lucide-react"
import { usePrivy } from "@privy-io/react-auth"
import { useApi } from "../../Context/ApiProvider"
import { UpdateProfileModal } from "@/app/components/UpdateProfileModal"
import { useCreatorToken } from "@/app/hooks/useCreatorToken"
import { generateCreatorTokenUUID } from "@/app/lib/uuid"
import { CreatorTokenDisplay } from "@/app/components/CreatorTokenDisplay"
import CreatorTokenTrading from "@/app/components/CreatorTokenTrading"
import ReputationBadge from "@/app/components/ReputationBadge"
import ReputationHistoryModal from "@/app/components/ReputationHistoryModal"
import { MunchApiService, MunchVideo } from "@/app/lib/munchApi"
import SnapCard from "../Sections/SnapCard"
import { useAuth } from "@/app/hooks/useAuth"

type Props = {
  user?: User
  posts: Post[]
}

type Tab = "Posts" | "Munchs" | "Activity" | "Followers"

export function ProfilePage({ user, posts }: Props) {
  const { getUserProfile, updateUserProfile, getUserFollowers, getUserFollowing } = useApi()
  const { createCreatorToken, checkCreatorExists, isConnected, connectWallet, isConnecting, address, switchToBaseSepolia } = useCreatorToken()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("Posts")
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [showCreateTokenModal, setShowCreateTokenModal] = useState(false)
  const [showTradingModal, setShowTradingModal] = useState(false)

  // Creator token creation state
  const [tokenName, setTokenName] = useState('')
  const [tokenDescription, setTokenDescription] = useState('')
  // freebieCount is now fixed at 50 in the contract
  const [quadraticDivisor, setQuadraticDivisor] = useState(1)
  const [isCreatingToken, setIsCreatingToken] = useState(false)

  // Creator token existence state
  const [creatorTokenExists, setCreatorTokenExists] = useState(false)
  const [checkingTokenExists, setCheckingTokenExists] = useState(false)
  const [creatorTokenUserId, setCreatorTokenUserId] = useState<string | null>(null)

  // Follower/Following lists state
  const [followersList, setFollowersList] = useState<any[]>([])
  const [followingList, setFollowingList] = useState<any[]>([])
  const [isLoadingFollowers, setIsLoadingFollowers] = useState(false)
  const [isLoadingFollowing, setIsLoadingFollowing] = useState(false)
  const [showFollowersList, setShowFollowersList] = useState(false)
  const [showFollowingList, setShowFollowingList] = useState(false)
  const [showReputationHistory, setShowReputationHistory] = useState(false)

  // Munch videos state
  const [munchVideos, setMunchVideos] = useState<MunchVideo[]>([])
  const [isLoadingMunchVideos, setIsLoadingMunchVideos] = useState(false)

  // Post engagement state for SnapCard
  const [liked, setLiked] = useState<Set<number>>(new Set())
  const [retweeted, setRetweeted] = useState<Set<number>>(new Set())
  const [bookmarked, setBookmarked] = useState<Set<number>>(new Set())

  // Get auth state from Redux store - initialized once at app level
  const { currentUserId: reduxUserId } = useAuth()
  const currentUserId = reduxUserId

  // Fetch profile using currentUserId
  useEffect(() => {
    const fetchProfile = async () => {
      if (currentUserId) {
        try {
          setLoading(true)
          const profileData = await getUserProfile(currentUserId)
          console.log('🔍 Profile data from backend:', profileData)
          console.log('🔍 Avatar URL from backend:', profileData.profile?.avatar_url)
          setProfile(profileData.profile)
        } catch (error) {
          console.error('Failed to fetch profile:', error)
        } finally {
          setLoading(false)
        }
      }
    }

    fetchProfile()
  }, [currentUserId, getUserProfile])

  // Check if creator token exists with debouncing
  useEffect(() => {
    console.log('🔍 ProfilePage useEffect triggered with:', {
      'currentUserId': currentUserId,
      'isConnected': isConnected,
      'address': address,
      'checkCreatorExists': typeof checkCreatorExists
    });

    console.log('🔍 ProfilePage: useEffect dependencies check:', {
      'hasUserId': !!currentUserId,
      'isConnected': isConnected,
      'hasAddress': !!address,
      'hasCheckFunction': typeof checkCreatorExists === 'function'
    });
    
    // Debounce the check to prevent rapid calls
    const timeoutId = setTimeout(() => {
      const checkTokenExists = async () => {
        if (currentUserId && isConnected && address) {
          try {
            console.log('🔍 ProfilePage: Starting creator token existence check');
            console.log('🔍 ProfilePage: User ID:', currentUserId);
            console.log('🔍 ProfilePage: Wallet connected:', isConnected);
            console.log('🔍 ProfilePage: Wallet address:', address);

            setCheckingTokenExists(true)
            const tokenUuid = generateCreatorTokenUUID(currentUserId)
            console.log('🔍 ProfilePage: Generated UUID:', tokenUuid);

            console.log('🔍 ProfilePage: Calling checkCreatorExists (direct token details approach)...');
            const exists = await checkCreatorExists(tokenUuid)
            console.log('🔍 ProfilePage: checkCreatorExists result:', exists);

            setCreatorTokenExists(exists)
            if (exists) {
              setCreatorTokenUserId(currentUserId)
              console.log('✅ ProfilePage: Creator token exists, setting state');
            } else {
              console.log('❌ ProfilePage: Creator token does not exist - will show create button');
            }
          } catch (error) {
            console.error('❌ ProfilePage: Failed to check creator token existence:', error)
            console.error('❌ ProfilePage: Error details:', {
              message: error.message,
              code: error.code,
              reason: error.reason
            });
            setCreatorTokenExists(false)
          } finally {
            setCheckingTokenExists(false)
          }
        } else {
          console.log('❌ ProfilePage: Conditions not met for token check:', {
            'hasUserId': !!currentUserId,
            'isConnected': isConnected,
            'hasAddress': !!address
          });
        }
      }

      checkTokenExists()
    }, 500); // 500ms debounce delay

    // Cleanup timeout on unmount or dependency change
    return () => clearTimeout(timeoutId);
  }, [currentUserId, isConnected, address, checkCreatorExists]) // Now safe to include checkCreatorExists

  const handleUpdateProfile = async (updateData: { username?: string; bio?: string; avatarUrl?: string }) => {
    if (!currentUserId) return

    try {
      console.log('🔍 Updating profile with data:', updateData)
      const response = await updateUserProfile(currentUserId, updateData)
      console.log('🔍 Update response:', response)

      if (response.profile) {
        console.log('🔍 Setting new profile:', response.profile)
        setProfile(response.profile)
        console.log('🔍 Profile updated successfully')
      }
    } catch (error) {
      console.error('Failed to update profile:', error)
      throw error
    }
  }

  const loadFollowersList = async () => {
    if (isLoadingFollowers || !currentUserId) return

    setIsLoadingFollowers(true)
    try {
      const response = await getUserFollowers(currentUserId, 100, 0)
      setFollowersList(response?.followers || [])
    } catch (error) {
      console.error('Failed to load followers:', error)
    } finally {
      setIsLoadingFollowers(false)
    }
  }

  const loadFollowingList = async () => {
    if (isLoadingFollowing || !currentUserId) return

    setIsLoadingFollowing(true)
    try {
      const response = await getUserFollowing(currentUserId, 100, 0)
      setFollowingList(response?.following || [])
    } catch (error) {
      console.error('Failed to load following:', error)
    } finally {
      setIsLoadingFollowing(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'Followers') {
      if (followersList.length === 0) {
        loadFollowersList()
      }
      if (followingList.length === 0) {
        loadFollowingList()
      }
    }
  }, [activeTab, followersList.length, followingList.length])

  // Fetch munch videos when Munchs tab is active
  useEffect(() => {
    const fetchMunchVideos = async () => {
      if (activeTab === 'Munchs' && currentUserId) {
        console.log('🎬 ProfilePage: Fetching munch videos for user:', currentUserId)
        setIsLoadingMunchVideos(true)
        try {
          const videos = await MunchApiService.getUserMunchVideos(currentUserId, 50, 0)
          console.log('🎬 ProfilePage: Fetched munch videos:', videos.length, videos)
          setMunchVideos(videos)
        } catch (error) {
          console.error('❌ ProfilePage: Failed to load munch videos:', error)
        } finally {
          setIsLoadingMunchVideos(false)
        }
      }
    }

    fetchMunchVideos()
  }, [activeTab, currentUserId])

  // Helper function to toggle sets
  const toggleSet = (set: Set<number>, id: number): Set<number> => {
    const newSet = new Set(set)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    return newSet
  }

  const handleCreateCreatorToken = async () => {
    if (!isConnected) {
      await connectWallet()
      return
    }

    if (!tokenName.trim() || !tokenDescription.trim()) {
      alert('Please fill in all required fields')
      return
    }

    setIsCreatingToken(true)
    try {
      // Use the user ID directly as the UUID (consistent with generateCreatorTokenUUID)
      const creatorUuid = currentUserId || ''
      console.log('🎯 Using user ID as creator token UUID:', creatorUuid)

      const tokenTxHash = await createCreatorToken(
        creatorUuid, // Use the user ID directly
        tokenName.trim(),
        profile?.avatar_url || '',
        tokenDescription.trim(),
        quadraticDivisor,
        currentUserId // Pass user ID for updating creator_token_uuid field
      )

      alert(`Creator token created successfully! TX: ${tokenTxHash.slice(0, 10)}...`)

      setTokenName('')
      setTokenDescription('')
      setQuadraticDivisor(1)
      setShowCreateTokenModal(false)

      setCreatorTokenExists(true)
      setCreatorTokenUserId(currentUserId || null)
      
    } catch (error) {
      console.error('Failed to create creator token:', error)
      let errorMessage = 'Failed to create creator token'
      
      if (error.message?.includes('Creator with this UUID already exists')) {
        errorMessage = 'Creator token already exists for this user'
      } else if (error.message?.includes('Insufficient')) {
        errorMessage = 'Insufficient USDC for token creation'
      } else if (error.message?.includes('reverted')) {
        errorMessage = 'Token creation transaction failed'
      }
      
      alert(errorMessage)
    } finally {
      setIsCreatingToken(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  if (loading) {
    return (
      <div className="flex-col max-w-3xl md:flex-row text-white flex mx-auto">
        <div className="flex-1 md:m-4 md:mt-1 rounded-2xl sticky bg-black p-4">
          <div className="animate-pulse">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-20 h-20 bg-gray-700 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-6 bg-gray-700 rounded w-32"></div>
                <div className="h-4 bg-gray-700 rounded w-48"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex-col md:flex-row text-white flex mx-auto">
        <div className="flex-1 md:m-4 md:mt-1 rounded-2xl sticky bg-black p-4">
          <div className="text-center py-8 text-gray-400">
            Failed to load profile
          </div>
        </div>
      </div>
    )
  }

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'like': return <Heart className="w-4 h-4 text-red-500" />
      case 'comment': return <MessageCircle className="w-4 h-4 text-blue-500" />
      case 'retweet': return <Repeat2 className="w-4 h-4 text-green-500" />
      case 'post_created': return <FileText className="w-4 h-4 text-purple-500" />
      default: return <Eye className="w-4 h-4 text-gray-500" />
    }
  }

  const getActivityText = (activityType: string) => {
    switch (activityType) {
      case 'like': return 'Liked a post'
      case 'comment': return 'Commented on a post'
      case 'retweet': return 'Retweeted a post'
      case 'post_created': return 'Created a post'
      default: return 'Activity'
    }
  }

  return (
    <div className="flex-col md:flex-row max-w-3xl border-gray-700/70 text-white flex mx-auto">
      <div className="flex-1 md:m-4 md:mt-1 rounded-2xl sticky bg-black py-4">

        {/* Main Profile Card */}
        <div className="border border-gray-700/50 rounded-2xl">
          <div className="p-6 border-b border-gray-700/30">
            {/* Top Row: Avatar and Action Buttons */}
            <div className="flex items-start justify-between mb-3">
              {/* Avatar and Bio Section */}
              <div className="flex flex-col items-start space-y-3">
                <div className="flex items-start space-x-4">
                  <Image
                    src={profile.avatar_url || '/4.png'}
                    alt={profile.username}
                    width={80}
                    height={80}
                    className={`w-16 h-16 border-2 border-gray-600 object-cover ${profile.account_type === 'community' ? 'rounded-md' : 'rounded-full'}`}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/4.png';
                    }}
                  />

                  {/* Username and Handle */}
                  <div className="flex flex-col">
                    <h1 className="text-white text-lg font-bold mb-1">
                      {profile.username}
                    </h1>
                    <p className="text-gray-400 text-sm mb-2">@{profile.username}</p>
                    {/* Reputation Badge with History Button */}
                    {profile.reputation_tier && (
                      <div className="mt-1 flex items-center space-x-2">
                        <ReputationBadge
                          tier={profile.reputation_tier}
                          score={profile.reputation_score || 0}
                          size="md"
                          showScore={true}
                          showLabel={true}
                        />
                        <button
                          onClick={() => setShowReputationHistory(true)}
                          className="text-blue-400 hover:text-blue-300 text-xs transition-colors"
                        >
                          View History
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bio Section */}
                {profile.bio && (
                  <div>
                    <p className="text-white text-base leading-relaxed">
                      {profile.bio}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col items-end space-y-6">
                <div className="flex items-center space-x-3">
                  {checkingTokenExists ? (
                    <div className="bg-gray-600 text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Checking...
                    </div>
                  ) : creatorTokenExists ? (
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full px-6 py-2 text-sm font-medium flex items-center">
                      <span>Buy Ticket 📈 0.0823</span>
                    </div>
                  ) : !isConnected ? (
                    <button
                      onClick={connectWallet}
                      disabled={isConnecting}
                      className="text-white rounded-full px-6 py-2 text-sm font-medium transition-all duration-200 disabled:opacity-50"
                      style={{
                        backgroundColor: "#6E54FF",
                        boxShadow: "0px 1px 0.5px 0px rgba(255, 255, 255, 0.50) inset, 0px 1px 2px 0px rgba(110, 84, 255, 0.50), 0px 0px 0px 1px #6E54FF"
                      }}
                    >
                      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowCreateTokenModal(true)}
                      className="text-white rounded-full px-6 py-2 text-sm font-medium transition-all duration-200"
                      style={{
                        backgroundColor: "#6E54FF",
                        boxShadow: "0px 1px 0.5px 0px rgba(255, 255, 255, 0.50) inset, 0px 1px 2px 0px rgba(110, 84, 255, 0.50), 0px 0px 0px 1px #6E54FF"
                      }}
                    >
                      Create Creator Token
                    </button>
                  )}

                  <button
                    onClick={() => setShowUpdateModal(true)}
                    className="bg-gray-700 hover:bg-gray-600 text-white border border-gray-600 rounded-full px-6 py-2 text-sm font-medium transition-all duration-200"
                  >
                    Edit Profile
                  </button>
                </div>

                {/* Pool Rewards Section */}
                <div className="bg-gray-700/30 border-2 border-[#6e54ff] rounded-2xl px-4 py-3 min-w-[200px] hover:bg-gray-700/50 transition-colors mt-4">
                  <div className="flex flex-col items-center justify-center text-center">
                    <h3 className="text-white text-xs font-medium mb-2">POOL REWARDS</h3>
                    <div className="text-lg font-semibold text-white mb-1">$0</div>
                    <div className="text-xs text-gray-400">Total Pool</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="flex items-center space-x-8 -mt-8">
              <div className="flex items-center space-x-2">
                <span className="text-white font-bold text-lg">{profile.total_posts || 0}</span>
                <span className="text-gray-400 text-sm">Posts</span>
              </div>
              <div
                className={`flex items-center space-x-2 transition-colors ${
                  isLoadingFollowers ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:text-blue-400'
                }`}
                onClick={!isLoadingFollowers ? loadFollowersList : undefined}
              >
                <span className="text-white font-bold text-lg">
                  {isLoadingFollowers ? '...' : profile.followers_count || 0}
                </span>
                <span className="text-gray-400 text-sm">Followers</span>
              </div>
              <div
                className={`flex items-center space-x-2 transition-colors ${
                  isLoadingFollowing ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:text-blue-400'
                }`}
                onClick={!isLoadingFollowing ? loadFollowingList : undefined}
              >
                <span className="text-white font-bold text-lg">
                  {isLoadingFollowing ? '...' : profile.following_count || 0}
                </span>
                <span className="text-gray-400 text-sm">Following</span>
              </div>
            </div>
          </div>

        </div>

        {/* Tabs */}
        <div className="mb-4 mt-4">
          <div className="bg-gray-700/50 rounded-full p-0.5">
            <div className="bg-black m-0.5 p-1 rounded-full relative flex">
              {[
                { id: 'Posts', label: 'Posts', icon: Grid },
                { id: 'Munchs', label: 'Munchs', icon: Video },
                { id: 'Activity', label: 'Activity', icon: MessageCircle },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as Tab)}
                  className={`flex items-center justify-center space-x-1 px-3 py-2 text-xs font-medium transition-all duration-200 rounded-full relative z-10 flex-1 ${
                    activeTab === id
                      ? 'text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{label}</span>
                </button>
              ))}

              {/* Animated background */}
              <motion.div
                className="absolute rounded-full"
                style={{
                  height: "32px",
                  boxShadow:
                    "0px 1px 0.5px 0px rgba(255, 255, 255, 0.50) inset, 0px 1px 2px 0px rgba(110, 84, 255, 0.50), 0px 0px 0px 1px #6E54FF",
                  backgroundColor: "#6E54FF",
                  top: "4px",
                  left: "4px",
                }}
                initial={false}
                animate={{
                  x: activeTab === "Posts" ? "0%" : activeTab === "Munchs" ? "100%" : "200%",
                  width: "calc(33.333% - 8px)",
                }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            </div>
          </div>
        </div>
         {creatorTokenExists && creatorTokenUserId && (
        <div className="pb-6">
          <CreatorTokenDisplay 
            userId={creatorTokenUserId}
            username={profile.username}
            avatarUrl={profile.avatar_url}
            isOwnProfile={true}
            forceShow={true}
          />
        </div>
      )}
        {/* Tab Content */}
        <div className="">
          {activeTab === "Posts" && (
            <div className="space-y-4">
              {profile.posts && profile.posts.length > 0 ? (
                profile.posts.map((post: any) => (
                  <SnapCard
                    key={post.id}
                    post={post}
                    liked={liked.has(parseInt(post.id))}
                    bookmarked={bookmarked.has(parseInt(post.id))}
                    retweeted={retweeted.has(parseInt(post.id))}
                    onLike={(id) => setLiked(toggleSet(liked, typeof id === "string" ? parseInt(id) : id))}
                    onBookmark={(id) => setBookmarked(toggleSet(bookmarked, typeof id === "string" ? parseInt(id) : id))}
                    onRetweet={(id) => setRetweeted(toggleSet(retweeted, typeof id === "string" ? parseInt(id) : id))}
                  />
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-400 text-lg">No posts yet</p>
                  <p className="text-gray-500 text-sm mt-1">Start sharing your thoughts with the world!</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "Activity" && (
            <div className="space-y-3">
              {profile.recent_activity && profile.recent_activity.length > 0 ? (
                <div className="space-y-3">
                  {profile.recent_activity.map((activity: any, index: number) => (
                    <div key={index} className="bg-black border border-gray-700/50 p-3 rounded-xl">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gray-600 border border-gray-600 flex items-center justify-center flex-shrink-0">
                          {getActivityIcon(activity.activity_type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-white text-sm font-medium capitalize">
                              {getActivityText(activity.activity_type)}
                            </span>
                            <span className="text-gray-500 text-xs">
                              {formatDate(activity.created_at)}
                            </span>
                          </div>
                          <p className="text-white text-xs">{activity.post_content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
                    <ThumbsUp className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-400 text-lg">No recent activity</p>
                  <p className="text-gray-500 text-sm mt-1">Your interactions will appear here</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "Munchs" && (
            <div className="space-y-4">
              {isLoadingMunchVideos ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
                    <Video className="w-8 h-8 text-gray-400 animate-pulse" />
                  </div>
                  <p className="text-gray-400 text-lg">Loading videos...</p>
                </div>
              ) : munchVideos.length > 0 ? (
                <div className="grid grid-cols-3 gap-1">
                  {munchVideos.map((video) => (
                    <div
                      key={video.id}
                      className="relative aspect-[9/16] bg-gray-800 rounded-lg overflow-hidden cursor-pointer group"
                      onClick={() => {
                        // Navigate to munch page with this video
                        window.location.href = `/snaps?page=munch&videoId=${video.id}`;
                      }}
                    >
                      {/* Video thumbnail */}
                      {video.thumbnail_url ? (
                        <Image
                          src={video.thumbnail_url}
                          alt={video.caption || 'Munch video'}
                          fill
                          className="object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <video
                          src={video.video_url}
                          className="w-full h-full object-cover"
                          muted
                        />
                      )}

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="text-white text-center">
                          <Heart className="w-6 h-6 mx-auto mb-1" />
                          <span className="text-sm font-semibold">{video.like_count}</span>
                        </div>
                      </div>

                      {/* Video indicator */}
                      <div className="absolute top-2 right-2">
                        <Video className="w-4 h-4 text-white drop-shadow-lg" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
                    <Video className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-400 text-lg">No videos yet</p>
                  <p className="text-gray-500 text-sm mt-1">Share your first Munch video!</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "Followers" && (
            <div className="space-y-4">
              {/* Followers Section */}
              <div className="bg-black rounded-xl p-3 border border-gray-700/50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white text-sm font-medium">Followers ({profile.followers_count || 0})</h3>
                  <button
                    onClick={loadFollowersList}
                    disabled={isLoadingFollowers}
                    className="text-blue-400 hover:text-blue-300 text-xs transition-colors disabled:opacity-50"
                  >
                    {isLoadingFollowers ? 'Loading...' : 'Refresh'}
                  </button>
                </div>
                
                {isLoadingFollowers ? (
                  <div className="text-center py-8 text-gray-400">Loading followers...</div>
                ) : (
                  <div className="space-y-2">
                    {/* Show first 5 followers as preview */}
                    {followersList.slice(0, 5).map((follower: any) => (
                      <div key={follower.follower_id} className="flex items-center space-x-3 p-2 bg-gray-800/50 rounded-lg">
                        <Image
                          src={follower.avatar_url || "/4.png"}
                          alt={follower.username || 'User'}
                          width={32}
                          height={32}
                          className="w-8 h-8 rounded-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/4.png";
                          }}
                        />
                        <div className="flex-1">
                          <div className="text-white text-sm font-medium">{follower.username || 'Unknown User'}</div>
                          <div className="text-gray-400 text-xs">{follower.email || ''}</div>
                        </div>
                      </div>
                    ))}
                    
                    {followersList.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        No followers yet
                      </div>
                    )}
                    
                    {followersList.length > 5 && (
                      <div className="text-center pt-4">
                        <button
                          onClick={() => setShowFollowersList(true)}
                          className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                        >
                          View All {profile.followers_count || 0} Followers
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Following Section */}
              <div className="bg-black rounded-xl p-3 border border-gray-700/50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white text-sm font-medium">Following ({profile.following_count || 0})</h3>
                  <button
                    onClick={loadFollowingList}
                    disabled={isLoadingFollowing}
                    className="text-blue-400 hover:text-blue-300 text-xs transition-colors disabled:opacity-50"
                  >
                    {isLoadingFollowing ? 'Loading...' : 'Refresh'}
                  </button>
                </div>
                
                {isLoadingFollowing ? (
                  <div className="text-center py-8 text-gray-400">Loading following...</div>
                ) : (
                  <div className="space-y-2">
                    {/* Show first 5 following as preview */}
                    {followingList.slice(0, 5).map((following: any) => (
                      <div key={following.following_id} className="flex items-center space-x-3 p-2 bg-gray-800/50 rounded-lg">
                        <Image
                          src={following.avatar_url || "/4.png"}
                          alt={following.username || 'User'}
                          width={32}
                          height={32}
                          className="w-8 h-8 rounded-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/4.png";
                          }}
                        />
                        <div className="flex-1">
                          <div className="text-white text-sm font-medium">{following.username || 'Unknown User'}</div>
                          <div className="text-gray-400 text-xs">{following.email || ''}</div>
                        </div>
                      </div>
                    ))}
                    
                    {followingList.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        Not following anyone yet
                      </div>
                    )}
                    
                    {followingList.length > 5 && (
                      <div className="text-center pt-4">
                        <button
                          onClick={() => setShowFollowingList(true)}
                          className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                        >
                          View All {profile.following_count || 0} Following
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
          
      </div>

      {/* Update Profile Modal */}
      <UpdateProfileModal
        show={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        onUpdate={handleUpdateProfile}
        currentProfile={profile}
      />

      {/* Followers List Modal */}
      {showFollowersList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowFollowersList(false)}>
          <div className="bg-black rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-lg font-semibold">Followers</h3>
              <button
                onClick={() => setShowFollowersList(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {isLoadingFollowers ? (
              <div className="text-center py-4 text-gray-400">Loading...</div>
            ) : followersList.length > 0 ? (
              <div className="space-y-3">
                {followersList.map((follower: any) => (
                  <div key={follower.follower_id} className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg">
                    <Image
                      src={follower.avatar_url || "/4.png"}
                      alt={follower.username || 'User'}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/4.png";
                      }}
                    />
                    <div className="flex-1">
                      <div className="text-white font-medium">{follower.username || 'Unknown User'}</div>
                      <div className="text-gray-400 text-sm">{follower.email || ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-400">No followers yet</div>
            )}
          </div>
        </div>
      )}

      {/* Following List Modal */}
      {showFollowingList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowFollowingList(false)}>
          <div className="bg-black rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-lg font-semibold">Following</h3>
              <button
                onClick={() => setShowFollowingList(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {isLoadingFollowing ? (
              <div className="text-center py-4 text-gray-400">Loading...</div>
            ) : followingList.length > 0 ? (
              <div className="space-y-3">
                {followingList.map((following: any) => (
                  <div key={following.following_id} className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg">
                    <Image
                      src={following.avatar_url || "/4.png"}
                      alt={following.username || 'User'}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/4.png";
                      }}
                    />
                    <div className="flex-1">
                      <div className="text-white font-medium">{following.username || 'Unknown User'}</div>
                      <div className="text-gray-400 text-sm">{following.email || ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-400">Not following anyone yet</div>
            )}
          </div>
        </div>
      )}

      {/* Create Creator Token Modal */}
      {showCreateTokenModal && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" 
          onClick={() => setShowCreateTokenModal(false)}
        >
          <div 
            className="bg-black/90 backdrop-blur-sm rounded-2xl border-2 border-gray-700/70 p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto shadow-2xl" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-700/70">
              <h3 className="text-white text-xl font-bold tracking-tight">Create Creator Token</h3>
              <button
                onClick={() => setShowCreateTokenModal(false)}
                className="p-2 hover:bg-gray-800/50 rounded-xl transition-colors border border-gray-700/50"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Token Name */}
              <div>
                <label className="block text-gray-400 text-sm font-bold tracking-wide mb-2">TOKEN NAME *</label>
                <input
                  type="text"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  className="w-full px-4 py-3 bg-black/50 backdrop-blur-sm border-2 border-gray-700/70 rounded-2xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter token name"
                  maxLength={50}
                />
              </div>

              {/* Token Description */}
              <div>
                <label className="block text-gray-400 text-sm font-bold tracking-wide mb-2">DESCRIPTION *</label>
                <textarea
                  value={tokenDescription}
                  onChange={(e) => setTokenDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-black/50 backdrop-blur-sm border-2 border-gray-700/70 rounded-2xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Describe your creator token"
                  rows={3}
                  maxLength={200}
                />
              </div>

              {/* Token Parameters */}
              <div>
                {/* Quadratic Divisor */}
                <div>
                  <label className="block text-gray-400 text-sm font-bold tracking-wide mb-2">PRICE CURVE</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={quadraticDivisor}
                    onChange={(e) => setQuadraticDivisor(parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-3 bg-black/50 backdrop-blur-sm border-2 border-gray-700/70 rounded-2xl text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="1"
                  />
                </div>
              </div>

              {/* Info Text */}
              <div className="bg-black/50 backdrop-blur-sm border-2 border-gray-700/70 rounded-2xl p-4">
                <p className="text-gray-400 text-xs font-medium mb-1">
                  Uses quadratic pricing: Price = (Tokens Held)² / {quadraticDivisor}
                </p>
                <p className="text-gray-400 text-xs font-medium">
                  50 free shares available (fixed). Lower divisor = steeper price curve.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setShowCreateTokenModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-2xl font-bold tracking-tight transition-colors border-2 border-gray-500/30"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCreatorToken}
                  disabled={isCreatingToken || !tokenName.trim() || !tokenDescription.trim()}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-2xl font-bold tracking-tight transition-colors border-2 border-blue-500/30 disabled:border-gray-500/30"
                >
                  {isCreatingToken ? 'Creating...' : isConnected ? 'Create Token' : 'Connect Wallet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      

      {/* Creator Token Trading Modal */}
      {showTradingModal && profile && (
        <CreatorTokenTrading
          creatorUuid={currentUserId}
          creatorName={profile.username}
          creatorImageUrl={profile.avatar_url}
          isOpen={showTradingModal}
          onClose={() => setShowTradingModal(false)}
        />
      )}

      {/* Reputation History Modal */}
      {showReputationHistory && currentUserId && (
        <ReputationHistoryModal
          isOpen={showReputationHistory}
          onClose={() => setShowReputationHistory(false)}
          userId={currentUserId}
          username={profile?.username || ''}
        />
      )}
    </div>
  )
}