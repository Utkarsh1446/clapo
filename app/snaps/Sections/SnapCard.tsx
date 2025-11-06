/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client'
import React, { useState, useEffect, useRef } from 'react'
import { MessageCircle, Repeat2, Heart, Bookmark, Eye, X, MoreHorizontal, Volume2, Paperclip, Smile, Send, ExternalLink, Blocks, Triangle, Repeat, HandMetal, ArrowUpFromLine, HandHeart } from 'lucide-react'
import { Post, ApiPost } from '@/app/types'
import { useApi } from '../../Context/ApiProvider'
import { useSession } from 'next-auth/react'
import { usePrivy } from '@privy-io/react-auth'
import EngagementDetails from '../../components/EngagementDetails'
import CommentSection from '../../components/CommentSection'
import Toast from '../../components/Toast'
import { AnimatePresence, motion } from "framer-motion"
import CommentInputBar from './CommentInputBar'
import { UserProfileHover } from '../../components/UserProfileHover'
import PostTokenTrading from '../../components/PostTokenTrading'
import ReputationBadge from '../../components/ReputationBadge'
import { usePostTokenPrice } from '@/app/hooks/useGlobalPrice'
import { renderTextWithMentions } from '@/app/lib/mentionUtils.tsx'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/hooks/useAuth'
import Image from 'next/image'

type Props = {
  post: Post | ApiPost
  liked?: boolean
  bookmarked?: boolean
  retweeted?: boolean
  onLike?: (id: number | string) => void
  onRetweet?: (id: number | string) => void
  onBookmark?: (id: number | string) => void
}

export default function SnapCard({ post, liked, bookmarked, retweeted, onLike, onRetweet, onBookmark }: Props) {
  const [visibleCount, setVisibleCount] = useState(2)
  const [showImageModal, setShowImageModal] = useState(false)
  const [showCommentSection, setShowCommentSection] = useState(false)
  const [showEngagement, setShowEngagement] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: any } | null>(null)
  const [isLoading, setIsLoading] = useState({ like: false, retweet: false, bookmark: false, comment: false })
  const [localEngagement, setLocalEngagement] = useState({ likes: 0, comments: 0, retweets: 0, bookmarks: 0 })
  const [userEngagement, setUserEngagement] = useState({ liked: false, retweeted: false, bookmarked: false })
  const [commentText, setCommentText] = useState('')
  const [showInlineComments, setShowInlineComments] = useState(false)
  const [comments, setComments] = useState<any[]>([])
  const [showTokenTrading, setShowTokenTrading] = useState(false)
  const hasInitialized = useRef(false)
  

  const { likePost, unlikePost, retweetPost, bookmarkPost, unbookmarkPost, viewPost, addComment, getPostComments, state } = useApi()
  const { data: session, status } = useSession()
  const { user: privyUser } = usePrivy()
  const router = useRouter()

  // Get auth state from Redux store - no more API calls!
  const { currentUserId: reduxUserId } = useAuth()

  // Support both NextAuth (legacy) and Privy auth
  const currentUserId = status === "authenticated" && session?.dbUser?.id
    ? session.dbUser.id
    : reduxUserId

  // Check if it's an API post by multiple indicators
  const isApiPost = 'user_id' in post || 'media_url' in post || ('username' in post && 'avatar_url' in post)
  const postId = post.id?.toString() || ''
  const postContent = post.content || ''

  // Handle media_url for both API posts and any object with media_url
  const postImage = ('media_url' in post && post.media_url) ? post.media_url :
                    ('image' in post && post.image) ? post.image : undefined

  const postAuthor = ('username' in post && post.username) ? post.username :
                     ('author' in post && post.author) ? post.author : 'Unknown'

  const postHandle = ('username' in post && post.username) ? `@${post.username}` :
                     ('handle' in post && post.handle) ? post.handle : '@unknown'

  const authorReputation = ('author_reputation' in post) ? post.author_reputation : undefined
  const authorReputationTier = ('author_reputation_tier' in post) ? post.author_reputation_tier : undefined
  const [accountType, setAccountType] = useState<'individual' | 'community' | undefined>(
    ('account_type' in post) ? post.account_type : undefined
  )

  // Fetch account type if not provided by backend
  useEffect(() => {
    const fetchAccountType = async () => {
      // Skip if we already have account_type from the post
      if ('account_type' in post && post.account_type) {
        setAccountType(post.account_type)
        return
      }

      // Skip if no user_id
      if (!('user_id' in post) || !post.user_id) return

      const userId = post.user_id

      // Check cache first
      const cacheKey = `account_type_${userId}`
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) {
        setAccountType(cached as 'individual' | 'community')
        return
      }

      // Fetch from API
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${userId}/profile/posts`)
        const data = await response.json()
        console.log('Fetched profile data for account type:', { userId, data })
        if (data.profile?.account_type) {
          const type = data.profile.account_type
          console.log('Setting account type:', type)
          setAccountType(type)
          // Cache it
          sessionStorage.setItem(cacheKey, type)
        } else {
          console.log('No account_type in profile data:', data.profile)
        }
      } catch (error) {
        console.error('Failed to fetch account type:', error)
      }
    }

    fetchAccountType()
  }, [post])
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'now';

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays}d ago`;

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `${diffInMonths}mo ago`;

    const diffInYears = Math.floor(diffInMonths / 12);
    return `${diffInYears}y ago`;
  };

  const postTime = isApiPost
    ? getRelativeTime(post.created_at)
    : (post.time || 'Unknown')
  const postAvatar = isApiPost ? post.avatar_url : undefined
  const currentUserAvatar = session?.dbUser?.avatar_url || privyUser?.email?.address
  const [profile, setProfile] = useState<any | null>(null)
const [loading, setLoading] = useState(false)
  const { getUserProfile, getUserFollowers, getUserFollowing, followUser, unfollowUser } = useApi()
const [commentDropdownOpen, setCommentDropdownOpen] = useState(false)

// Replace the toggleInlineComments function
const toggleCommentDropdown = async (e: React.MouseEvent) => {
  e.stopPropagation()
  
  const willOpen = !commentDropdownOpen
  setCommentDropdownOpen(willOpen)
  
  if (willOpen && comments.length === 0 && isApiPost) {
    try {
      if (getPostComments) {
        const fetchedComments = await getPostComments(postId)
        setComments(fetchedComments || [])
      }
    } catch (error) {
      console.error('Failed to load comments:', error)
    }
  }
  
  // Close inline comments if open
  if (showInlineComments) {
    setShowInlineComments(false)
  }
}
useEffect(() => {
  const fetchProfile = async () => {
    if (currentUserId) {
      try {
        setLoading(true)
        const profileData = await getUserProfile(currentUserId)
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


  const isUserInLikes = isApiPost && post.likes?.some(u => u.user_id === currentUserId)
  const isUserInRetweets = isApiPost && post.retweets?.some(u => u.user_id === currentUserId)
  const isUserInBookmarks = isApiPost && post.bookmarks?.some(u => u.user_id === currentUserId)

  useEffect(() => {
    if (!hasInitialized.current && post && post.id) {
      hasInitialized.current = true
      
      const initialLikes = isApiPost ? (post.like_count || 0) : (post.likes || 0)
      const initialComments = isApiPost ? (post.comment_count || 0) : (post.comments || 0)
      const initialRetweets = isApiPost ? (post.retweet_count || 0) : (post.retweets || 0)
      const initialBookmarks = isApiPost ? (post.bookmarks?.length || 0) : 0

      setLocalEngagement({
        likes: initialLikes,
        comments: initialComments,
        retweets: initialRetweets,
        bookmarks: initialBookmarks
      })

      const userLiked = isUserInLikes || liked || state.engagement?.likedPosts?.has(postId) || false
      const userRetweeted = isUserInRetweets || retweeted || state.engagement?.retweetedPosts?.has(postId) || false
      const userBookmarked = isUserInBookmarks || bookmarked || state.engagement?.bookmarkedPosts?.has(postId) || false

      setUserEngagement({
        liked: userLiked,
        retweeted: userRetweeted,
        bookmarked: userBookmarked
      })

      if (isApiPost && post.comments) {
        setComments(post.comments)
      }
    }
  }, [postId, post, isApiPost, liked, retweeted, bookmarked, state.engagement])

  // Close modal when clicking outside or pressing Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowImageModal(false)
      }
    }

    if (showImageModal) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden' // Prevent background scrolling
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [showImageModal])

const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null)

const handleImageClick = (e: React.MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()
  const rect = (e.target as HTMLElement).getBoundingClientRect()
  setClickPosition({
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  })
  setShowImageModal(true)
}


  const handleModalClose = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setShowImageModal(false)
  }

  const handleModalBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking the backdrop, not the image itself
    if (e.target === e.currentTarget) {
      handleModalClose(e)
    }
  }

  const handleLike = async () => {
    if (!currentUserId || isLoading.like) return
    
    setIsLoading(prev => ({ ...prev, like: true }))
    
    try {
      const currentLiked = userEngagement.liked
      const currentCount = localEngagement.likes
      
      if (currentLiked) {
        const newCount = Math.max(0, currentCount - 1)
        setLocalEngagement(prev => ({ ...prev, likes: newCount }))
        setUserEngagement(prev => ({ ...prev, liked: false }))
        setToast({ message: 'Post unliked', type: 'unlike' })
        
        await unlikePost(postId, currentUserId)
        
        if (state.engagement?.likedPosts) {
          state.engagement.likedPosts.delete(postId)
        }
        
        onLike?.(isApiPost ? postId : parseInt(postId))
      } else {
        const newCount = currentCount + 1
        setLocalEngagement(prev => ({ ...prev, likes: newCount }))
        setUserEngagement(prev => ({ ...prev, liked: true }))
        
        await likePost(postId, currentUserId)
        
        if (state.engagement?.likedPosts) {
          state.engagement.likedPosts.add(postId)
        }
        
        onLike?.(isApiPost ? postId : parseInt(postId))
      }
    } catch (error) {
      console.error('Failed to handle like:', error)
      
      const currentLiked = userEngagement.liked
      const currentCount = localEngagement.likes
      
      if (currentLiked) {
        setLocalEngagement(prev => ({ ...prev, likes: currentCount + 1 }))
        setUserEngagement(prev => ({ ...prev, liked: true }))
      } else {
        setLocalEngagement(prev => ({ ...prev, likes: Math.max(0, currentCount - 1) }))
        setUserEngagement(prev => ({ ...prev, liked: false }))
      }
    } finally {
      setIsLoading(prev => ({ ...prev, like: false }))
    }
  }

  const handleRetweet = async () => {
    if (!currentUserId || isLoading.retweet || userEngagement.retweeted) return
    
    setIsLoading(prev => ({ ...prev, retweet: true }))
    
    try {
      const currentCount = localEngagement.retweets
      
      const newCount = currentCount + 1
      setLocalEngagement(prev => ({ ...prev, retweets: newCount }))
      setUserEngagement(prev => ({ ...prev, retweeted: true }))
      await retweetPost(postId, currentUserId)
      
      if (state.engagement?.retweetedPosts) {
        state.engagement.retweetedPosts.add(postId)
      }
      
      onRetweet?.(isApiPost ? postId : parseInt(postId))
    } catch (error) {
      console.error('Failed to retweet:', error)
      
      const currentCount = localEngagement.retweets
      setLocalEngagement(prev => ({ ...prev, retweets: Math.max(0, currentCount - 1) }))
      setUserEngagement(prev => ({ ...prev, retweeted: false }))
    } finally {
      setIsLoading(prev => ({ ...prev, retweet: false }))
    }
  }

  const { price: postTokenPrice, loading: priceLoading } = usePostTokenPrice(postId)

  const handleBookmark = async () => {
    if (!currentUserId || isLoading.bookmark) return
    
    setIsLoading(prev => ({ ...prev, bookmark: true }))
    
    try {
      const currentBookmarked = userEngagement.bookmarked
      const currentCount = localEngagement.bookmarks
      
      if (currentBookmarked) {
        const newCount = Math.max(0, currentCount - 1)
        setLocalEngagement(prev => ({ ...prev, bookmarks: newCount }))
        setUserEngagement(prev => ({ ...prev, bookmarked: false }))
        
        await unbookmarkPost(postId, currentUserId)
        
        if (state.engagement?.bookmarkedPosts) {
          state.engagement.bookmarkedPosts.delete(postId)
        }
        
        onBookmark?.(isApiPost ? postId : parseInt(postId))
      } else {
        const newCount = currentCount + 1
        setLocalEngagement(prev => ({ ...prev, bookmarks: newCount }))
        setUserEngagement(prev => ({ ...prev, bookmarked: true }))
        
        await bookmarkPost(postId, currentUserId)
        
        if (state.engagement?.bookmarkedPosts) {
          state.engagement.bookmarkedPosts.add(postId)
        }
        
        onBookmark?.(isApiPost ? postId : parseInt(postId))
      }
    } catch (error) {
      console.error('Failed to handle bookmark:', error)
      
      const currentBookmarked = userEngagement.bookmarked
      const currentCount = localEngagement.bookmarks
      
      if (currentBookmarked) {
        setLocalEngagement(prev => ({ ...prev, bookmarks: currentCount + 1 }))
        setUserEngagement(prev => ({ ...prev, bookmarked: true }))
      } else {
        setLocalEngagement(prev => ({ ...prev, bookmarks: Math.max(0, currentCount - 1) }))
        setUserEngagement(prev => ({ ...prev, bookmarked: false }))
      }
    } finally {
      setIsLoading(prev => ({ ...prev, bookmark: false }))
    }
  }

  const handleView = () => currentUserId && viewPost(postId, currentUserId).catch(() => {})

  const handleCommentAdded = (newComments: any[]) => {
    const newCommentCount = newComments.length
    setComments(newComments)
    setLocalEngagement(prev => ({ ...prev, comments: newCommentCount }))
  }

  const [expanded, setExpanded] = useState(false)

  const words = postContent?.trim().split(/\s+/) || []
  const isLong = words.length > 50
  const displayedText = expanded ? postContent : words.slice(0, 50).join(" ") + (isLong ? "..." : "")

  const handleCommentSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!commentText.trim() || !currentUserId || isLoading.comment) return

    setIsLoading(prev => ({ ...prev, comment: true }))
    
    const currentCommentCount = localEngagement.comments
    
    try {
      const newComment = {
        id: Date.now().toString(),
        content: commentText.trim(),
        created_at: new Date().toISOString(),
        user_id: currentUserId,
        username: profile?.username || session?.dbUser?.username || 'Unknown',
        avatar_url: profile?.avatar_url || currentUserAvatar
      }

      const updatedComments = [...comments, newComment]
      const newCommentCount = updatedComments.length
      setComments(updatedComments)
      setLocalEngagement(prev => ({ ...prev, comments: newCommentCount }))
      setCommentText('')
      setToast({ message: 'Comment added', type: 'success' })
      if (!showInlineComments) {
        setShowInlineComments(true)
      }

      if (addComment) {
        await addComment(postId, commentText.trim(), currentUserId)
      }

    } catch (error) {
      setComments(comments)
      setLocalEngagement(prev => ({ ...prev, comments: currentCommentCount }))
      setCommentText(commentText)
      setToast({ message: 'Failed to add comment', type: 'error' })
      console.error('Failed to add comment:', error)
    } finally {
      setIsLoading(prev => ({ ...prev, comment: false }))
    }
  }

  const toggleInlineComments = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!showInlineComments && comments.length === 0 && isApiPost) {
      try {
        if (getPostComments) {
          const fetchedComments = await getPostComments(postId)
          setComments(fetchedComments || [])
        }
      } catch (error) {
        console.error('Failed to load comments:', error)
      }
    }
    
    setShowInlineComments(prev => !prev)
  }

  const formatCommentTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'now'
    if (diffInMinutes < 60) return `${diffInMinutes}m`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`
    return `${Math.floor(diffInMinutes / 1440)}d`
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on interactive elements
    const target = e.target as HTMLElement
    const isInteractive = target.closest('button, a, input, video, audio')

    if (!isInteractive) {
      router.push(`/snaps/post/${postId}`)
    }
  }

  return (
    <>
      <div
        className="border-2 border-gray-700/70 rounded-xl mt-2 md:mt-4 bg-black cursor-pointer hover:bg-gray-900/30 transition-colors"
        onClick={handleCardClick}
      >
        {/* Twitter-style Layout */}
        <div className="flex gap-2 md:gap-3 p-2 md:p-4">
          {/* Left: Avatar */}
          <div className="flex-shrink-0">
            <UserProfileHover
              userId={('user_id' in post && post.user_id) ? post.user_id.toString() : post.id.toString()}
              username={postAuthor}
              avatarUrl={postAvatar}
              position="bottom"
            >
              <div className={`w-8 h-8 md:w-10 md:h-10 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity ${accountType === 'community' ? 'rounded-md' : 'rounded-full'} relative`} onClick={(e) => e.stopPropagation()}>
                {postAvatar ? (
                  <Image
                    src={postAvatar}
                    alt={postAuthor}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={e => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${postAuthor}`
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-700 flex items-center justify-center text-xs md:text-sm font-semibold text-white">
                    {postAuthor?.substring(0, 2)?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
            </UserProfileHover>
          </div>

          {/* Right: Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-1 md:gap-2 mb-0.5 md:mb-1">
              <UserProfileHover
                userId={('user_id' in post && post.user_id) ? post.user_id.toString() : post.id.toString()}
                username={postAuthor}
                avatarUrl={postAvatar}
                position="bottom"
              >
                <span className="font-semibold text-white text-xs md:text-sm hover:underline cursor-pointer" onClick={(e) => e.stopPropagation()}>
                  {postAuthor}
                </span>
              </UserProfileHover>
              {authorReputation !== undefined && (
                <ReputationBadge
                  score={authorReputation}
                  tier={authorReputationTier}
                  size="sm"
                  showScore={false}
                />
              )}
              <span className="text-gray-500 text-xs md:text-sm">·</span>
              <span className="text-gray-500 text-xs md:text-sm">{postTime}</span>
            </div>

            {/* Post Content */}
          {postContent && (
  <div className="mb-2 mt-2 md:mb-3">
    <div
      className={`${
        !postImage
          ? "bg-gradient-to-br from-gray-800/50  to-gray-900/50 mt-1 md:mt-2 border border-gray-700/50 rounded-2xl px-3 py-4 md:px-4 md:py-6 h-64 md:h-96 w-auto flex items-center justify-center text-center"
          : ""
      }`}
    >
      <p
        className={`text-white text-xs md:text-sm leading-normal whitespace-pre-wrap ${
          !postImage ? "text-base md:text-xl" : ""
        }`}
      >
        {renderTextWithMentions(
          displayedText,
          isApiPost ? post.mentions : undefined,
          (userId, username) => {
            router.push(`/snaps/profile/${userId}`)
          }
        )}
      </p>
    </div>

    {isLong && (
      <button
        onClick={(e) => {
          e.stopPropagation()
          setExpanded(prev => !prev)
        }}
        className="text-blue-400 hover:text-blue-300 text-xs md:text-sm mt-0.5 md:mt-1"
      >
        {expanded ? "Show less" : "Show more"}
      </button>
    )}
  </div>
)}


            {/* Media Section - Twitter Style */}
            {postImage && (
              <div className="mb-2 md:mb-3">
                <div className="border border-gray-700/50 rounded-2xl overflow-hidden bg-black flex items-center justify-center max-h-[400px] md:max-h-[506px] relative">
                  {/\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff|ico)$/i.test(postImage) ? (
                    <Image
                      src={postImage}
                      alt="Post content"
                      width={600}
                      height={400}
                      className="w-full h-auto object-contain cursor-pointer max-h-[400px] md:max-h-[506px]"
                      onClick={handleImageClick}
                      loading="lazy"
                      quality={75}
                      sizes="(max-width: 768px) 100vw, 600px"
                    />
                  ) : /\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv|m4v|3gp|ts|mts|m2ts)$/i.test(postImage) ? (
                    <video
                      src={postImage}
                      autoPlay
                      muted
                      loop
                      playsInline
                      controls
                      className="w-full h-auto object-contain max-h-[400px] md:max-h-[506px]"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : /\.(mp3|wav|ogg|m4a|aac|flac|wma|opus|aiff|pcm)$/i.test(postImage) ? (
                    <div className="bg-gray-900 p-3 md:p-4 flex items-center justify-center w-full">
                      <audio src={postImage} controls className="w-full" />
                    </div>
                  ) : (
                    <div className="bg-gray-900 p-3 md:p-4 text-center w-full">
                      <p className="text-gray-400 text-xs md:text-sm mb-2">Media file</p>
                      <a href={postImage} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-xs md:text-sm font-medium">
                        View media
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons - Twitter Style */}
            <div className="flex items-center justify-between mt-1 md:mt-2 -ml-1 md:-ml-2">
              {/* Left: Main actions close together */}
              <div className="flex items-center gap-0 md:gap-1">
          <button
  onClick={e => {
    e.stopPropagation()
    handleLike()
  }}
  disabled={isLoading.like || !currentUserId}
  className={`flex items-center gap-0.5 transition-colors group disabled:opacity-50 ${
    userEngagement.liked ? 'text-gray-400' : 'text-gray-500 hover:text-pink-500'
  }`}
>
  <div className="p-1.5 md:p-2 rounded-full group-hover:bg-pink-500/10 transition-colors">
    <HandMetal
      className="w-[15px] h-[15px] md:w-[18px] md:h-[18px]"
      style={{
        // strokeWidth: userEngagement.liked ? 2.5 : 2,
        fill: userEngagement.liked ? 'gray' : 'none',
      }}
    />
  </div>
  <span className="text-[11px] md:text-xs">{localEngagement.likes}</span>
</button>


                <button
                  onClick={e => {
                    e.stopPropagation()
                    toggleCommentDropdown(e)
                  }}
                  className="flex items-center gap-0.5 md:gap-1.5 text-gray-500 hover:text-blue-400 transition-colors group"
                >
                  <div className="p-1.5 md:p-2 rounded-full group-hover:bg-blue-400/10 transition-colors">
                    <MessageCircle className="w-[15px] h-[15px] md:w-[18px] md:h-[18px]" />
                  </div>
                  <span className="text-[11px] md:text-xs">{localEngagement.comments}</span>
                </button>

                <button
                  onClick={e => {
                    e.stopPropagation()
                    handleRetweet()
                  }}
                  disabled={isLoading.retweet || !currentUserId || userEngagement.retweeted}
                  className={`flex items-center gap-0.5 md:gap-1.5 transition-colors group disabled:opacity-50 ${userEngagement.retweeted ? 'text-green-500' : 'text-gray-500 hover:text-green-500'}`}
                >
                  <div className="p-1.5 md:p-2 rounded-full group-hover:bg-green-500/10 transition-colors">
                    <Repeat className="w-[15px] h-[15px] md:w-[18px] md:h-[18px] rotate-90" />
                  </div>
                  <span className="text-[11px] md:text-xs">{localEngagement.retweets}</span>
                </button>
              </div>

              {/* Right: Price and Share */}
              <div className="flex items-center gap-1 md:gap-2">
                <button
                  onClick={e => {
                    e.stopPropagation()
                    setShowTokenTrading(true)
                  }}
                  className="flex items-center gap-0.5 md:gap-1 text-green-500 hover:text-green-400 transition-colors px-1 md:px-2"
                >
                  <Triangle className={`w-[12px] h-[12px] md:w-[14px] md:h-[14px] ${priceLoading ? 'opacity-50' : ''}`} />
                  <span className={`text-[11px] md:text-xs font-medium ${priceLoading ? 'opacity-50' : ''}`}>
                    {priceLoading ? '...' : `$${postTokenPrice.toFixed(2)}`}
                  </span>
                </button>

                <button
                  onClick={e => {
                    e.stopPropagation()
                    handleBookmark()
                  }}
                  disabled={isLoading.bookmark || !currentUserId}
                  className={`transition-colors group disabled:opacity-50 ${userEngagement.bookmarked ? 'text-blue-400' : 'text-gray-500 hover:text-blue-400'}`}
                >
                  <div className="p-1.5 md:p-2 rounded-full group-hover:bg-blue-400/10 transition-colors">
                    <ArrowUpFromLine className="w-[15px] h-[15px] md:w-[18px] md:h-[18px]" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Comments Dropdown */}
        <AnimatePresence>
          {commentDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="px-2 pb-2 md:px-4 md:pb-4 border-t border-gray-700/70 pt-2 md:pt-3"
            >
              <div className="max-h-56 overflow-y-auto space-y-2 md:space-y-3 mb-2 md:mb-3">
                {comments.length > 0 ? (
                  comments.slice(0, visibleCount).map((comment) => (
                    <div key={comment.id} className="flex gap-2 md:gap-2.5">
                      <div className="w-6 h-6 md:w-7 md:h-7 rounded-full flex-shrink-0 relative overflow-hidden">
                        <Image
                          src={comment.avatar_url || `https://ui-avatars.com/api/?name=${comment.username}`}
                          alt={comment.username}
                          width={28}
                          height={28}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs md:text-sm">
                          <span className="font-semibold text-white mr-1.5 md:mr-2">{comment.username}</span>
                          <span className="text-gray-400">{comment.content}</span>
                        </div>
                        <div className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1">
                          {formatCommentTime(comment.created_at)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-xs md:text-sm text-center py-3 md:py-4">
                    No comments yet. Be the first to comment!
                  </p>
                )}

                {visibleCount < comments.length && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setVisibleCount((prev) => prev + 8)
                    }}
                    className="text-xs md:text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    View more comments
                  </button>
                )}
              </div>

              {/* Add Comment Input */}
              <div className="pt-2 md:pt-3">
                <form onSubmit={handleCommentSubmit} className="flex items-center gap-1.5 md:gap-2">
                  <div className="flex-shrink-0 w-5 h-5 md:w-6 md:h-6 rounded-full overflow-hidden relative">
                    {profile?.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        alt="Your avatar"
                        width={24}
                        height={24}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-700 flex items-center justify-center text-[10px] md:text-xs font-semibold text-white">
                        {session?.dbUser?.username?.substring(0, 2)?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 flex items-center bg-transparent rounded-full px-0.5 md:px-1 py-0.5 border border-gray-700/50">
                    <input
                      type="text"
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      disabled={isLoading.comment || !currentUserId}
                      className="flex-1 px-2 md:px-3 py-1 md:py-1.5 bg-transparent text-xs md:text-sm text-white rounded-full focus:outline-none transition-all duration-200 placeholder:text-gray-500 disabled:opacity-50"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      type="submit"
                      disabled={!commentText.trim() || isLoading.comment || !currentUserId}
                      className="p-1 md:p-1.5 bg-[#6E54FF] hover:bg-[#5940cc] rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mr-0.5 flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isLoading.comment ? (
                        <div className="w-3 h-3 md:w-3.5 md:h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-3 h-3 md:w-3.5 md:h-3.5 text-white" />
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals - Image Modal */}
      <AnimatePresence>
        {showImageModal && postImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[9999] p-4" 
            onClick={handleModalBackdropClick}
          >
            <div className="relative max-w-5xl max-h-full flex items-center justify-center">
              <button 
                onClick={handleModalClose}
                className="absolute -top-12 right-0 text-white bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full p-2 z-10 transition-all duration-200"
              >
                <X className="w-6 h-6" />
              </button>
              <motion.img
                src={postImage}
                alt="Post content"
                className="max-w-full max-h-full object-contain rounded-lg cursor-pointer"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image
                loading="eager"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCommentSection && isApiPost && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-3"
          >
            <CommentSection
              post={post}
              onClose={() => setShowCommentSection(false)}
              onCommentAdded={handleCommentAdded}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {showEngagement && isApiPost && (
        <EngagementDetails likes={post.likes} retweets={post.retweets} bookmarks={post.bookmarks} onClose={() => setShowEngagement(false)} />
      )}

      {toast && <Toast id="snap-toast" title="Notification" message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Post Token Trading Modal */}
      <PostTokenTrading
        postId={postId}
        postContent={postContent}
        isOpen={showTokenTrading}
        onClose={() => setShowTokenTrading(false)}
      />
    </>
  )
}