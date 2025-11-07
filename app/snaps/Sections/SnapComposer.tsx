'use client'

import React, { useState, useRef, useEffect } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  Image as ImageIcon,
  Video,
  File,
  Mic,
  SendHorizonal,
  X,
  CheckCircle,
  Wallet,
  AtSign,
} from 'lucide-react'
import MediaUpload, { MediaUploadHandle } from '@/app/components/MediaUpload'
import { usePrivy } from '@privy-io/react-auth'
import { useApi } from '@/app/Context/ApiProvider'
import { usePostToken } from '@/app/hooks/usePostToken'
import { generatePostTokenUUID } from '@/app/lib/uuid'
import MentionAutocomplete from '@/app/components/MentionAutocomplete'
// import { getMentionTriggerInfo } from ''
import { getMentionTriggerInfo, replaceMentionText, extractMentions } from '@/app/lib/mentionUtils'
import { useAura } from '@/app/Context/AppProviders'
import { DailyPostLimitIndicator } from '@/app/components/Aura/DailyPostLimitIndicator'
import { useAppSelector } from '@/app/store/hooks'

// Toast Component
const Toast = ({ 
  message, 
  isVisible, 
  onClose 
}: { 
  message: string
  isVisible: boolean
  onClose: () => void 
}) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose()
      }, 3000) // Auto-dismiss after 3 seconds
      
      return () => clearTimeout(timer)
    }
  }, [isVisible, onClose])

  if (!isVisible) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
      <div className="bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 min-w-[300px]">
        <CheckCircle className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm font-medium">{message}</span>
        <button
          onClick={onClose}
          className="ml-2 hover:bg-green-700 rounded p-1 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export function SnapComposer({ close }: { close: () => void }) {
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mediaUrl, setMediaUrl] = useState<string | undefined>()
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // Mention state
  const [showMentionAutocomplete, setShowMentionAutocomplete] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 })
  const [cursorPosition, setCursorPosition] = useState(0)
  const [mentionStartPos, setMentionStartPos] = useState(0)
  const [mentionedUsers, setMentionedUsers] = useState<Array<{ user_id: string; username: string }>>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Submission guard to prevent duplicate posts
  const submissionInProgressRef = useRef(false)

  // Token creation parameters (quadratic pricing system)
  const [freebieCount, setFreebieCount] = useState(1) // Number of free tokens
  const [quadraticDivisor, setQuadraticDivisor] = useState(1) // Price curve steepness (1 = steep, higher = flatter)
  
  const { createPost, fetchPosts } = useApi();
  const { createPostToken, isConnected, connectWallet, isConnecting, address } = usePostToken();
  const { getUserProfile, updateUserProfile } = useApi()
  const { canPost: canPostAura, postsRemaining, incrementPostCount } = useAura();
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)

  // Get auth state from Redux store - no more API calls!
  const { backendUser } = useAppSelector((state) => state.auth)
  const currentUserId = backendUser?.id || null

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

  // Profile data loaded

  const [uploadedMedia, setUploadedMedia] = useState<{
    url: string
    name: string
    type: 'image' | 'video' | 'audio' | 'other'
  } | null>(null)

  const mediaUploadRef = useRef<MediaUploadHandle>(null)
  const userId = currentUserId
  const { authenticated, ready, user: privyUser } = usePrivy()

  React.useEffect(() => {
    console.log('🔍 SnapComposer Auth State:', {
      privyAuthenticated: authenticated,
      privyUserId: privyUser?.id,
      privyReady: ready,
      currentUserId: userId,
    })
  }, [userId, authenticated, privyUser, ready])

  const actions = [
    { icon: ImageIcon, label: 'Photo', color: 'text-blue-400', type: 'image' as const },
    { icon: Video, label: 'Video', color: 'text-purple-400', type: 'video' as const },
  ]

  const showSuccessToast = (message: string) => {
    setToastMessage(message)
    setShowToast(true)
  }

  const showErrorToast = (message: string) => {
    setToastMessage(message)
    setShowToast(true)
  }

  const handleCloseToast = () => {
    setShowToast(false)
  }

  const handleMediaUpload = (url: string) => {
    setMediaUrl(url)
    
    const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i)
    const isVideo = url.match(/\.(mp4|webm|ogg|mov)$/i)
    const isAudio = url.match(/\.(mp3|wav|ogg|m4a)$/i)
    
    let mediaType: 'image' | 'video' | 'audio' | 'other' = 'other'
    if (isImage) mediaType = 'image'
    else if (isVideo) mediaType = 'video'
    else if (isAudio) mediaType = 'audio'

    setUploadedMedia({
      url,
      name: 'uploaded-file',
      type: mediaType,
    })
  }

  const handleRemoveMedia = () => {
    setMediaUrl(undefined)
    setUploadedMedia(null)
  }

  // Handle content change and mention detection
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    const newCursorPosition = e.target.selectionStart || 0

    setContent(newContent)
    setCursorPosition(newCursorPosition)

    // Check for mention trigger
    const mentionInfo = getMentionTriggerInfo(newContent, newCursorPosition)

    if (mentionInfo && mentionInfo.triggered) {
      setShowMentionAutocomplete(true)
      setMentionSearch(mentionInfo.searchText)
      setMentionStartPos(mentionInfo.startPos)

      // Calculate position for autocomplete dropdown
      if (textareaRef.current) {
        const textBeforeCursor = newContent.slice(0, newCursorPosition)
        const lines = textBeforeCursor.split('\n')
        const currentLineIndex = lines.length - 1
        const rect = textareaRef.current.getBoundingClientRect()

        setMentionPosition({
          top: rect.top + (currentLineIndex * 20) + 40,
          left: rect.left + 10,
        })
      }
    } else {
      setShowMentionAutocomplete(false)
    }
  }

  // Handle mention selection
  const handleMentionSelect = (user: { id: string; username: string }) => {
    const { newText, newCursorPosition } = replaceMentionText(
      content,
      mentionStartPos,
      cursorPosition,
      user.username
    )

    setContent(newText)
    setShowMentionAutocomplete(false)

    // Add to mentioned users list
    if (!mentionedUsers.find(u => u.user_id === user.id)) {
      setMentionedUsers([...mentionedUsers, { user_id: user.id, username: user.username }])
    }

    // Set cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = newCursorPosition
        textareaRef.current.selectionEnd = newCursorPosition
        textareaRef.current.focus()
      }
    }, 0)
  }

  const handleSubmit = async () => {
    console.log('🚀 handleSubmit function called!')

    // Prevent duplicate submissions
    if (submissionInProgressRef.current) {
      console.warn('⚠️ Submission already in progress, ignoring duplicate call')
      return
    }

    // Check if there's any content or media
    if (!hasContent && !mediaUrl) {
      alert('Please add some content or media before posting')
      return
    }

    // Check Aura daily post limit
    if (!canPostAura) {
      alert(`Daily post limit reached! You can create up to 5 posts per day. You have ${postsRemaining} posts remaining today.`)
      return
    }

    // Check wallet connection for token creation
    if (!isConnected) {
      try {
        await connectWallet()
        // Continue with post creation after wallet connection
      } catch (error) {
        console.error('Failed to connect wallet:', error)
        alert('Failed to connect wallet. Post will be created without token trading.')
      }
    }
    
    console.log('🔍 Submit Debug:', {
      privyAuthenticated: authenticated,
      privyUserId: privyUser?.id,
      currentUserId: userId,
      content: content.trim(),
      mediaUrl,
      createPostToken: !!createPostToken,
      isConnected
    })

    if (!userId) {
      console.error('❌ User ID is missing - not authenticated with Privy')
      console.error('Debug:', {
        authenticated,
        privyReady: ready,
        privyUser,
        currentUserId
      })
      alert('Please log in with Privy to create a post. Make sure you completed the signup process.')
      return
    }

    // Set both guards
    submissionInProgressRef.current = true
    setIsSubmitting(true)

    try {
      // Generate ONE UUID that will be used for everything
      const postUuid = crypto.randomUUID()
      console.log('🎯 Generated consistent UUID for post and token:', postUuid)
      
      // Extract mentions from content for logging
      const mentions = extractMentions(content.trim())
      console.log('🚀 Submitting post with data:', {
        userId,
        content: content.trim(),
        mediaUrl,
        uuid: postUuid,
        detectedMentions: mentions
      })

      // Backend automatically detects @username mentions from content
      // No need to extract and send mentions separately
      const postData: any = {
        userId,
        content: content.trim(),
        uuid: postUuid, // Add the UUID to ensure consistency
      }

      // Only add mediaUrl if it exists
      if (mediaUrl) {
        postData.mediaUrl = mediaUrl
      }

      console.log('🚀 About to call createPost with data:', postData)
      console.log('📝 Content contains @mentions:', mentions.length > 0 ? mentions : 'none')
      const response = await createPost(postData)
      console.log('✅ createPost completed successfully', response)
      console.log('📬 Check backend for mention notifications for:', mentions.join(', '))

      // Increment post count and award Aura
      try {
        console.log('🎯 Calling incrementPostCount with:', { postUuid, contentType: 'post' })
        const auraSuccess = await incrementPostCount(postUuid, 'post')
        if (auraSuccess) {
          console.log('✨ Aura: Post count incremented successfully, +10 Aura awarded')
        } else {
          console.error('⚠️ Aura: Failed to increment post count (returned false)')
        }
      } catch (auraError) {
        console.error('⚠️ Aura: Failed to increment post count (exception):', auraError)
        // Don't fail the post creation if Aura update fails
      }

      // Enrich the response with current user's profile data to prevent "Unknown" display
      if (response.post && profile) {
        response.post.username = profile.username || profile.display_name
        response.post.avatar_url = profile.avatar_url
        response.post.author_reputation = profile.reputation_score
        response.post.author_reputation_tier = profile.reputation_tier
        console.log('✅ Enriched post with user data:', {
          username: response.post.username,
          avatar_url: response.post.avatar_url
        })
      }

      // Always create post token if wallet is connected
      if (isConnected) {
        try {
          console.log('🚀 Creating post token with same UUID:', postUuid)
          console.log('📝 Using Privy user ID for gas sponsorship:', privyUser?.id)

          const tokenTxHash = await createPostToken(
            postUuid, // Use the SAME UUID
            content.trim(),
            mediaUrl || '',
            quadraticDivisor,
            privyUser?.id, // Pass Privy user ID for gas sponsorship
            true // Enable gas sponsorship
          )
          // Post token created successfully
          showSuccessToast(`✨ Snap posted! +10 Aura earned | Token created with sponsored gas! TX: ${tokenTxHash.slice(0, 10)}...`)
        } catch (tokenError) {
          console.error('Failed to create post token:', tokenError)
          let errorMessage = 'Snap posted successfully! +10 Aura earned, but token creation failed'

          if (tokenError.message?.includes('Post with this UUID already exists')) {
            errorMessage = 'Snap posted successfully! +10 Aura earned, but token already exists for this post'
          } else if (tokenError.message?.includes('Insufficient')) {
            errorMessage = 'Snap posted successfully! +10 Aura earned, but insufficient USDC for token creation'
          } else if (tokenError.message?.includes('reverted')) {
            errorMessage = 'Snap posted successfully! +10 Aura earned, but token creation transaction failed'
          }

          showErrorToast(errorMessage)
        }
      } else {
        showSuccessToast('✨ Snap posted successfully! +10 Aura earned (Connect wallet to enable token trading)')
      }

      // Reset form and close dialog after successful post creation
      setContent('')
      setMediaUrl(undefined)
      setUploadedMedia(null)

      // Reset loading state and submission guard immediately
      setIsSubmitting(false)
      submissionInProgressRef.current = false

      // Close the dialog
      close()

      // Fetch posts in background (don't wait for it)
      fetchPosts(userId).catch(error => {
        console.error('Failed to fetch posts after creation:', error)
      })

    } catch (error) {
      console.error('Failed to create post:', error)
      alert('Failed to create post. Please try again.')
      // Reset loading state and submission guard on error
      setIsSubmitting(false)
      submissionInProgressRef.current = false
    }
  }

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'image': return <ImageIcon className="w-8 h-8 text-dark-400" />
      case 'video': return <Video className="w-8 h-8 text-dark-400" />
      case 'audio': return <Mic className="w-8 h-8 text-dark-400" />
      default: return <File className="w-8 h-8 text-dark-400" />
    }
  }

  const renderMediaPreview = () => {
    if (!uploadedMedia || !uploadedMedia.url) return null

    return (
      <div className="relative group mt-3">
        <div className="relative overflow-hidden rounded-lg flex justify-center bg-black/50 border border-dark-700/50">
          {uploadedMedia.type === 'image' && (
            <Image
              src={uploadedMedia.url}
              alt={uploadedMedia.name || 'Uploaded image'}
              width={400}
              height={192}
              className="w-auto h-48 object-cover rounded-lg"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
            />
          )}
          {uploadedMedia.type === 'video' && uploadedMedia.url && (
            <video
              src={uploadedMedia.url}
              className="w-auto h-48 object-cover rounded-lg"
              controls
            />
          )}
          {uploadedMedia.type === 'audio' && uploadedMedia.url && (
            <div className="p-6 flex items-center justify-center">
              <audio src={uploadedMedia.url} controls className="w-full" />
            </div>
          )}
          {uploadedMedia.type === 'other' && (
            <div className="p-6 flex items-center justify-center">
              <div className="text-center">
                {getMediaIcon(uploadedMedia.type)}
                <p className="mt-3 text-sm text-dark-400">
                  {uploadedMedia.name || 'Uploaded file'}
                </p>
              </div>
            </div>
          )}
        </div>
        <button
          onClick={handleRemoveMedia}
          className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  const charCount = content.length
  const isOverLimit = charCount > 200
  const hasContent = content.trim().length > 0
  const canSubmit = (hasContent || mediaUrl) && !isSubmitting && !isOverLimit
  const canClickButton = (hasContent || mediaUrl) && !isSubmitting && !isOverLimit

  // Get button text and styling based on state
  const getSnapButtonContent = () => {
    if (isSubmitting) {
      return {
        text: isConnected ? 'Posting...' : 'Posting...',
        icon: <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />,
        className: 'bg-blue-600/80 text-white cursor-not-allowed'
      }
    }
    
    if (!isConnected) {
      return {
        text: 'Connect & Snap',
        icon: <Wallet className="w-4 h-4" />,
        className: 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-blue-500/25'
      }
    }
    
    return {
      text: 'Snap',
      icon: <SendHorizonal className="w-4 h-4" />,
      className: 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-blue-500/25'
    }
  }

  const snapButton = getSnapButtonContent()

  return (
    <>
      {/* Toast Component */}
      <Toast 
        message={toastMessage}
        isVisible={showToast}
        onClose={handleCloseToast}
      />
      
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        {/* Dialog Container */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-black border-2 border-gray-700/70 rounded-xl w-full max-w-2xl shadow-custom relative p-4"
        >
          {/* Header with Close Button */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{
                backgroundColor: "#6E54FF",
                boxShadow: "0px 1px 0.5px 0px rgba(255, 255, 255, 0.50) inset, 0px 1px 2px 0px rgba(110, 84, 255, 0.50), 0px 0px 0px 1px #6E54FF"
              }}>
                <SendHorizonal className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Create a Snap</h3>
                <p className="text-sm text-gray-400">Share what's happening</p>
              </div>
            </div>
            <button
              onClick={close}
              disabled={isSubmitting}
              className="w-8 h-8 rounded-full bg-gray-700/50 hover:bg-gray-600/50 flex items-center justify-center transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Aura Post Limit Indicator */}
          <div className="mb-4">
            <DailyPostLimitIndicator />
          </div>

        {/* Dialog Content */}
        <div className="space-y-4">
          {/* Text Input */}
          <div className='flex gap-3'>
            <div className='rounded-full h-12 w-12 flex-shrink-0'>
              <Image
                src={profile?.avatar_url && profile.avatar_url.trim() !== "" ? profile.avatar_url : "/4.png"}
                alt="profile avatar"
                width={48}
                height={48}
                className="w-12 h-12 rounded-full object-cover border-2 border-gray-600"
              />
            </div>
            <div className="flex-1">
              <TextareaAutosize
                ref={textareaRef}
                minRows={2}
                maxRows={6}
                value={content}
                onChange={handleContentChange}
                placeholder="What's happening? Type @ to mention someone"
                className="w-full resize-none bg-black border-2 border-gray-700/70 p-2 sm:p-3 rounded-xl text-white placeholder-gray-500 text-sm sm:text-base leading-relaxed focus:outline-none focus:border-[#6E54FF]/50 transition-all duration-200"
              />
              <div className="text-right mt-1">
                <span className={`text-xs ${
                  isOverLimit
                    ? 'text-red-400'
                    : charCount > 180
                      ? 'text-amber-400'
                      : 'text-gray-400'
                }`}>
                  {charCount}/200
                </span>
              </div>
            </div>
          </div>

            {/* Hidden Media Upload Component */}
            <MediaUpload
              ref={mediaUploadRef}
              onMediaUploaded={handleMediaUpload}
              onMediaRemoved={handleRemoveMedia}
              userId={userId || ''}
              className="hidden"
            />

            {/* Media Preview */}
            {renderMediaPreview()}

          {/* Actions Bar */}
          <div className="flex items-center justify-between pt-2">
            {/* Media Actions */}
            <div className="flex items-center gap-2">
              {actions.map(({ icon: Icon, label, color, type }) => (
                <button
                  key={label}
                  onClick={() => mediaUploadRef.current?.openFileDialog(type)}
                  disabled={isSubmitting}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-700/50 hover:bg-gray-600/50 disabled:bg-gray-800/50 border border-gray-600/30 transition-all duration-200 ${color} disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={label}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium hidden sm:inline">
                    {label}
                  </span>
                </button>
              ))}
            </div>

            {/* Submit Button */}
            <button
              onClick={() => {
                console.log('🔍 Submit button clicked!')
                console.log('🔍 Button state:', { canClickButton, content, mediaUrl, isSubmitting, isOverLimit })
                handleSubmit()
              }}
              disabled={!canClickButton}
              className="px-6 py-2 text-white text-sm font-medium rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                backgroundColor: canClickButton ? "#6E54FF" : "#6B7280",
                boxShadow: canClickButton ? "0px 1px 0.5px 0px rgba(255, 255, 255, 0.50) inset, 0px 1px 2px 0px rgba(110, 84, 255, 0.50), 0px 0px 0px 1px #6E54FF" : "none"
              }}
              title={isOverLimit ? 'Message exceeds 200 character limit' : ''}
            >
              {snapButton.icon}
              <span>{snapButton.text}</span>
            </button>
          </div>
        </div>

          {/* Mention Autocomplete */}
          {showMentionAutocomplete && (
            <MentionAutocomplete
              searchText={mentionSearch}
              onSelect={handleMentionSelect}
              onClose={() => setShowMentionAutocomplete(false)}
              position={mentionPosition}
            />
          )}
        </motion.div>
      </div>
    </>
  )
}