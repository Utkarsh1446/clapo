"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Heart, MessageCircle, ArrowUpFromLine, MoreVertical, Volume2, VolumeX, Pause, Play, X, Send, Trash2, Plus } from "lucide-react";
import { useMunch } from "@/app/hooks/useMunch";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { useRouter } from "next/navigation";
import { MunchComment } from "@/app/lib/munchApi";
import { MunchUpload } from "./MunchUpload";

interface VideoPlayerProps {
  videoId: string;
  videoUrl: string;
  caption?: string;
  user: {
    id: string;
    username: string;
    name?: string;
    avatar_url?: string;
  };
  likeCount: number;
  commentCount: number;
  hasLiked: boolean;
  isActive: boolean;
  isMuted: boolean;
  onLike: () => void;
  onUnlike: () => void;
  onComment: () => void;
  onShare: () => void;
  onMuteToggle: () => void;
  onRecordView: () => void;
  currentUserId: string | null;
  onDelete: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoId,
  videoUrl,
  caption,
  user,
  likeCount,
  commentCount,
  hasLiked,
  isActive,
  isMuted,
  onLike,
  onUnlike,
  onComment,
  onShare,
  onMuteToggle,
  onRecordView,
  currentUserId,
  onDelete,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const [progress, setProgress] = useState(0);
  const router = useRouter();

  // Auto-play when video becomes active
  useEffect(() => {
    if (isActive && videoRef.current) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
        onRecordView();
      }).catch((err) => {
        console.error("Error playing video:", err);
      });
    } else if (!isActive && videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isActive, onRecordView]);

  // Update progress
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateProgress = () => {
      const progress = (video.currentTime / video.duration) * 100;
      setProgress(progress);
    };

    video.addEventListener('timeupdate', updateProgress);
    return () => video.removeEventListener('timeupdate', updateProgress);
  }, []);

  // Handle single tap to pause/play
  const handleTap = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTap;

    if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
      // Double tap - like
      handleDoubleTap();
      setLastTap(0);
    } else {
      // Single tap - pause/play after delay
      setLastTap(now);
      const tapTimeout = setTimeout(() => {
        if (Date.now() - now >= 300) {
          handleSingleTap();
        }
      }, 300);

      // Clear timeout if double tap happens
      return () => clearTimeout(tapTimeout);
    }
  }, [lastTap]);

  const handleSingleTap = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
        setShowPlayIcon(true);
        setTimeout(() => setShowPlayIcon(false), 500);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
        setShowPlayIcon(true);
        setTimeout(() => setShowPlayIcon(false), 500);
      }
    }
  }, [isPlaying]);

  const handleDoubleTap = useCallback(() => {
    setShowHeartAnimation(true);
    setTimeout(() => setShowHeartAnimation(false), 1000);

    if (!hasLiked) {
      onLike();
    }
  }, [hasLiked, onLike]);

  const handleLikeClick = () => {
    if (hasLiked) {
      onUnlike();
    } else {
      onLike();
    }
  };

  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <div className="relative w-full h-full bg-black lg:rounded-2xl lg:border-2 border-gray-700/70 lg:shadow-xl lg:shadow-black/20 lg:p-1.5 overflow-hidden">
      {/* Video */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-cover lg:rounded-xl"
        loop
        playsInline
        muted={isMuted}
        onClick={handleTap}
      />

      {/* Play/Pause Icon Animation */}
      <AnimatePresence>
        {showPlayIcon && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-black/50 rounded-full p-6">
              {isPlaying ? (
                <Play size={48} className="text-white" />
              ) : (
                <Pause size={48} className="text-white" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Double Tap Heart Animation */}
      <AnimatePresence>
        {showHeartAnimation && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <Heart size={120} className="text-red-500 fill-red-500" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Gradient Overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />

      {/* Mute Button - Top Right */}
      <motion.button
        onClick={onMuteToggle}
        className="absolute top-4 right-4 p-2 bg-black/40 backdrop-blur-sm rounded-full text-white z-20"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </motion.button>

      {/* User Info & Caption - Bottom Left */}
      <div className="absolute bottom-6 left-4 right-4 z-10">
        <div className="flex items-center gap-2 mb-2">
          <img
            src={user.avatar_url || '/default-avatar.png'}
            alt={user.username}
            className="w-10 h-10 rounded-full object-cover border-2 border-white cursor-pointer"
            onClick={() => router.push(`/snaps/profile/${user.id}`)}
          />
          <p
            className="text-white font-semibold text-base cursor-pointer"
            onClick={() => router.push(`/snaps/profile/${user.id}`)}
          >
            @{user.username}
          </p>
        </div>

        {caption && (
          <p className="text-white text-sm leading-relaxed line-clamp-2">
            {caption}
          </p>
        )}
      </div>
    </div>
  );
};

const Munch: React.FC = () => {
  const {
    videos,
    loading,
    fetchMunchFeed,
    likeVideo,
    unlikeVideo,
    recordView,
    deleteVideo,
    getComments,
    addComment,
    shareVideo,
    currentUserId,
  } = useMunch();

  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<MunchComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState(0);
  const [lastScrollTime, setLastScrollTime] = useState(0);

  const formatCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  // Fetch videos on mount
  useEffect(() => {
    if (currentUserId) {
      console.log('📹 Munch: Fetching feed for user:', currentUserId);
      fetchMunchFeed();
    }
  }, [currentUserId, fetchMunchFeed]);

  // Debug: Log videos state changes
  useEffect(() => {
    console.log('📹 Munch: Videos state updated:', videos.length, 'videos');
    console.log('📹 Munch: Videos:', videos);
  }, [videos]);

  const currentVideo = videos[currentIndex];

  // Handle swipe navigation
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 100;

    if (info.offset.y < -swipeThreshold && currentIndex < videos.length - 1) {
      // Swipe up - next video
      setCurrentIndex(prev => prev + 1);
    } else if (info.offset.y > swipeThreshold && currentIndex > 0) {
      // Swipe down - previous video
      setCurrentIndex(prev => prev - 1);
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentIndex < videos.length - 1) {
          setCurrentIndex(prev => prev + 1);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentIndex > 0) {
          setCurrentIndex(prev => prev - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, videos.length]);

  // Handle scroll navigation (mobile & desktop)
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const now = Date.now();
      // Throttle scroll events to prevent rapid changes
      if (now - lastScrollTime < 800) return;

      if (e.deltaY > 50 && currentIndex < videos.length - 1) {
        // Scroll down - next video
        setLastScrollTime(now);
        setCurrentIndex(prev => prev + 1);
      } else if (e.deltaY < -50 && currentIndex > 0) {
        // Scroll up - previous video
        setLastScrollTime(now);
        setCurrentIndex(prev => prev - 1);
      }
    };

    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastScrollTime < 800) return;

      const touchEndY = e.changedTouches[0].clientY;
      const deltaY = touchStartY - touchEndY;

      if (deltaY > 50 && currentIndex < videos.length - 1) {
        // Swipe up - next video
        setLastScrollTime(now);
        setCurrentIndex(prev => prev + 1);
      } else if (deltaY < -50 && currentIndex > 0) {
        // Swipe down - previous video
        setLastScrollTime(now);
        setCurrentIndex(prev => prev - 1);
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [currentIndex, videos.length, lastScrollTime]);

  const handleLoadComments = async () => {
    if (!currentVideo) return;

    setShowComments(true);
    setLoadingComments(true);

    try {
      const commentsData = await getComments(currentVideo.id);
      setComments(commentsData);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !currentVideo) return;

    try {
      const newComment = await addComment(currentVideo.id, commentText);
      setComments(prev => [newComment, ...prev]);
      setCommentText("");
    } catch (error) {
      console.error('Failed to add comment:', error);
      alert('Failed to add comment. Please try again.');
    }
  };

  const handleShare = async () => {
    if (!currentVideo) return;

    try {
      await shareVideo(currentVideo.id);

      // Share via Web Share API if available
      if (navigator.share) {
        await navigator.share({
          title: `Watch ${currentVideo.user.username}'s Munch`,
          text: currentVideo.caption || 'Check out this video on Munch!',
          url: window.location.href,
        });
      } else {
        // Fallback - copy link
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  const handleDelete = async () => {
    if (!currentVideo) return;

    const confirmDelete = window.confirm('Are you sure you want to delete this video? This action cannot be undone.');

    if (confirmDelete) {
      try {
        await deleteVideo(currentVideo.id);

        // Move to next video or previous if at end
        if (currentIndex >= videos.length - 1 && currentIndex > 0) {
          setCurrentIndex(prev => prev - 1);
        }
      } catch (error) {
        console.error('Failed to delete video:', error);
        alert('Failed to delete video. Please try again.');
      }
    }
  };

  if (loading && videos.length === 0) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          <p className="text-white text-sm">Loading Munch...</p>
        </div>
      </div>
    );
  }

  if (!currentVideo) {
    return (
      <div className="relative flex flex-col lg:flex-row items-center justify-center gap-6 w-full h-[calc(100vh-7rem)] lg:h-auto lg:pt-6" style={{ margin: '0 auto', maxWidth: '540px' }}>
        <div className="w-full h-full lg:h-[800px] lg:w-[456px] bg-black lg:rounded-2xl lg:border-2 border-gray-700/70 lg:shadow-xl lg:shadow-black/20 lg:p-1.5 overflow-hidden flex items-center justify-center relative">
          {/* Upload Modal */}
          <AnimatePresence>
            {showUploadModal && (
              <MunchUpload onClose={() => setShowUploadModal(false)} />
            )}
          </AnimatePresence>

          <div className="text-center px-6">
            <p className="text-white text-xl mb-2">No videos yet</p>
            <p className="text-gray-400 text-sm mb-6">Start uploading short videos to see them here!</p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-6 py-3 text-white font-semibold rounded-full transition-all hover:opacity-90"
              style={{ backgroundColor: '#6E54FF' }}
            >
              Upload Your First Munch
            </button>
          </div>
        </div>

        {/* Upload Button - Always visible on right side (desktop only) */}
        <div className="hidden lg:flex flex-col items-center pt-64">
          <motion.button
            onClick={() => setShowUploadModal(true)}
            className="flex flex-col items-center gap-1"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#6E54FF' }}>
              <Plus size={20} className="text-white" strokeWidth={2} />
            </div>
            <span className="text-white text-[11px] font-semibold">Upload</span>
          </motion.button>
        </div>
      </div>
    );
  }

  const handleLikeClick = () => {
    if (currentVideo.has_liked) {
      unlikeVideo(currentVideo.id);
    } else {
      likeVideo(currentVideo.id);
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-7rem)] lg:h-auto flex flex-col lg:flex-row items-center justify-center gap-0 lg:gap-6 lg:pt-6" style={{ margin: '0 auto', maxWidth: '540px' }}>
      <motion.div
        ref={containerRef}
        className="relative w-full h-full lg:h-[800px] lg:w-[456px]"
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
      >
        <VideoPlayer
          videoId={currentVideo.id}
          videoUrl={currentVideo.video_url}
          caption={currentVideo.caption}
          user={currentVideo.user}
          likeCount={currentVideo.like_count}
          commentCount={currentVideo.comment_count}
          hasLiked={currentVideo.has_liked}
          isActive={true}
          isMuted={isMuted}
          onLike={() => likeVideo(currentVideo.id)}
          onUnlike={() => unlikeVideo(currentVideo.id)}
          onComment={handleLoadComments}
          onShare={handleShare}
          onMuteToggle={() => setIsMuted(!isMuted)}
          onRecordView={() => recordView(currentVideo.id)}
          currentUserId={currentUserId}
          onDelete={handleDelete}
        />

        {/* Comments Modal */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center"
              onClick={() => setShowComments(false)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-gray-900 border-2 border-gray-700/70 rounded-t-2xl flex flex-col w-full lg:w-[456px]"
                style={{ height: '400px' }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                  <h3 className="text-white text-lg font-semibold">
                    Comments {comments.length > 0 && `(${comments.length})`}
                  </h3>
                  <button
                    onClick={() => setShowComments(false)}
                    className="p-2 hover:bg-gray-800 rounded-full transition-colors"
                  >
                    <X size={20} className="text-gray-400" />
                  </button>
                </div>

                {/* Comments List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {loadingComments ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-400">No comments yet</p>
                      <p className="text-gray-500 text-sm mt-1">Be the first to comment!</p>
                    </div>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <img
                          src={comment.user.avatar_url || '/default-avatar.png'}
                          alt={comment.user.username}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-semibold text-sm">
                              @{comment.user.username}
                            </span>
                            <span className="text-gray-500 text-xs">
                              {new Date(comment.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-gray-300 text-sm mt-1">{comment.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Comment Input */}
                <div className="p-4 border-t border-gray-700">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a comment..."
                      className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddComment();
                        }
                      }}
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={!commentText.trim()}
                      className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Action Buttons - TikTok Style: Mobile overlay, Desktop external */}
      <div className="absolute lg:relative bottom-24 lg:bottom-0 right-3 lg:right-0 flex flex-col items-center gap-5 lg:gap-4 lg:pt-64 z-30">
        {/* User Avatar Button - Hidden on mobile */}
        <motion.div
          className="hidden lg:block relative cursor-pointer"
          whileTap={{ scale: 0.9 }}
          onClick={() => router.push(`/snaps/profile/${currentVideo.user.id}`)}
        >
          <img
            src={currentVideo.user.avatar_url || '/default-avatar.png'}
            alt={currentVideo.user.username}
            className="w-10 h-10 rounded-full object-cover border-2 border-white"
          />
        </motion.div>

        {/* Like Button - TikTok Style */}
        <motion.button
          onClick={handleLikeClick}
          className="flex flex-col items-center gap-1"
          whileTap={{ scale: 0.85 }}
        >
          <motion.div
            animate={currentVideo.has_liked ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <Heart
              size={32}
              className={`lg:w-7 lg:h-7 drop-shadow-lg ${
                currentVideo.has_liked ? 'text-red-500 fill-red-500' : 'text-white fill-white/20'
              }`}
              strokeWidth={2.5}
            />
          </motion.div>
          <span className="text-white text-xs font-bold drop-shadow-lg">
            {formatCount(currentVideo.like_count)}
          </span>
        </motion.button>

        {/* Comment Button - TikTok Style */}
        <motion.button
          onClick={handleLoadComments}
          className="flex flex-col items-center gap-1"
          whileTap={{ scale: 0.85 }}
        >
          <MessageCircle
            size={32}
            className="lg:w-7 lg:h-7 text-white drop-shadow-lg"
            strokeWidth={2.5}
            fill="white"
            fillOpacity={0.2}
          />
          <span className="text-white text-xs font-bold drop-shadow-lg">
            {formatCount(currentVideo.comment_count)}
          </span>
        </motion.button>

        {/* Share Button - TikTok Style */}
        <motion.button
          onClick={handleShare}
          className="flex flex-col items-center gap-1"
          whileTap={{ scale: 0.85 }}
        >
          <ArrowUpFromLine
            size={32}
            className="lg:w-7 lg:h-7 text-white drop-shadow-lg"
            strokeWidth={2.5}
          />
          <span className="text-white text-xs font-bold drop-shadow-lg">Share</span>
        </motion.button>

        {/* Delete Button (only for own videos) */}
        {currentUserId === currentVideo.user.id && (
          <motion.button
            onClick={handleDelete}
            className="flex flex-col items-center gap-1 mt-2"
            whileTap={{ scale: 0.85 }}
          >
            <Trash2
              size={32}
              className="lg:w-7 lg:h-7 text-red-500 drop-shadow-lg"
              strokeWidth={2.5}
            />
          </motion.button>
        )}

        {/* Upload Button - Desktop only */}
        <motion.button
          onClick={() => setShowUploadModal(true)}
          className="hidden lg:flex flex-col items-center gap-1 mt-2"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#6E54FF' }}>
            <Plus size={20} className="text-white" strokeWidth={2} />
          </div>
          <span className="text-white text-[11px] font-semibold">Upload</span>
        </motion.button>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <MunchUpload onClose={() => setShowUploadModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Munch;
