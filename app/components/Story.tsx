"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X, Play, Pause, Volume2, VolumeX, Plus, Eye, Trash2 } from "lucide-react";
import { useStories } from "@/app/hooks/useStories";
import { StoryUpload } from "./StoryUpload";
import { usePrivy } from "@privy-io/react-auth";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { renderTextWithMentions } from "@/app/lib/mentionUtils";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";

type Story = {
  id: string;
  media_url: string;
  media_type: "video" | "image";
  caption?: string;
  created_at: string;
  user: {
    id: string;
    username: string;
    name?: string;
    avatar_url?: string;
  };
  view_count: number;
  has_viewed: boolean;
};

type GroupedStory = {
  user: {
    id: string;
    username: string;
    name?: string;
    avatar_url?: string;
  };
  stories: Story[];
  has_viewed: boolean;
};

const Stories: React.FC = () => {
  const { authenticated, ready, user: privyUser } = usePrivy();
  const { stories, loading, error, fetchFollowingStories, recordStoryView, getStoryViewers, deleteStory } = useStories();
  const router = useRouter();
  const [currentUserIndex, setCurrentUserIndex] = useState<number>(0);
  const [currentStoryIndex, setCurrentStoryIndex] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [showBottomSheet, setShowBottomSheet] = useState<boolean>(false);
  const [storyViewers, setStoryViewers] = useState<any[]>([]);
  const [loadingViewers, setLoadingViewers] = useState<boolean>(false);
  const [viewedStories, setViewedStories] = useState<Set<string>>(new Set());
  const [dragY, setDragY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const bottomSheetRef = useRef<HTMLDivElement | null>(null);

  // Get auth from centralized Redux store
  const { currentUserId: reduxUserId } = useAuth()
  const currentUserId = reduxUserId

  // Group stories by user
  const groupedStories: GroupedStory[] = React.useMemo(() => {
    const grouped = stories.reduce((acc: { [key: string]: GroupedStory }, story) => {
      const userId = story.user.id;
      if (!acc[userId]) {
        acc[userId] = {
          user: story.user,
          stories: [],
          has_viewed: true,
        };
      }
      acc[userId].stories.push(story);
      if (!story.has_viewed) {
        acc[userId].has_viewed = false;
      }
      return acc;
    }, {});

    return Object.values(grouped);
  }, [stories]);

  const currentUserStories = groupedStories[currentUserIndex]?.stories || [];
  const currentStory = currentUserStories[currentStoryIndex];

  // Fetch stories when authenticated
  useEffect(() => {
    if (authenticated && ready) {
      console.log('📊 Stories: Fetching following stories...');
      fetchFollowingStories();
    }
  }, [authenticated, ready, fetchFollowingStories]);

  // Auto-refresh stories every 30 seconds (silent refresh - no loading state)
  useEffect(() => {
    if (!authenticated || !ready) return;

    const refreshInterval = setInterval(() => {
      console.log('🔄 Stories: Auto-refreshing stories silently...');
      fetchFollowingStories(50, true); // Pass true for silent refresh
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(refreshInterval);
  }, [authenticated, ready, fetchFollowingStories]);

 useEffect(() => {
  let interval: NodeJS.Timeout | undefined;
  if (isModalOpen && isPlaying && currentStory) {
    // Record view when story is opened
    if (!viewedStories.has(currentStory.id)) {
      recordStoryView(currentStory.id);
      setViewedStories(prev => new Set(prev).add(currentStory.id));
    }

    const duration = currentStory.media_type === "video" ? 15000 : 5000;

    interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          goToNextStory();
          return 0;
        }
        return prev + 100 / (duration / 100);
      });
    }, 100);
  }
  return () => {
    if (interval) clearInterval(interval);
  };
}, [isModalOpen, isPlaying, currentStory, recordStoryView, viewedStories]);


  const openStory = (userIndex: number) => {
    setCurrentUserIndex(userIndex);
    setCurrentStoryIndex(0);
    setIsModalOpen(true);
    setProgress(0);
    setIsPlaying(true);
  };

  const closeStory = () => {
    setIsModalOpen(false);
    setProgress(0);
    setIsPlaying(false);
    setCurrentStoryIndex(0);
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

const goToNextStory = () => {
  if (currentStoryIndex < currentUserStories.length - 1) {
    setCurrentStoryIndex(prev => prev + 1);
    setProgress(0);
  } else if (currentUserIndex < groupedStories.length - 1) {
    setCurrentUserIndex(prev => prev + 1);
    setCurrentStoryIndex(0);
    setProgress(0);
  } else {
    // Loop to first user's first story
    setCurrentUserIndex(0);
    setCurrentStoryIndex(0);
    setProgress(0);
  }
};


  const goToPrevStory = () => {
    // Check if there's a previous story for current user
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex((prev) => prev - 1);
      setProgress(0);
    } 
    // Move to previous user's last story
    else if (currentUserIndex > 0) {
      setCurrentUserIndex((prev) => prev - 1);
      const prevUserStories = groupedStories[currentUserIndex - 1].stories;
      setCurrentStoryIndex(prevUserStories.length - 1);
      setProgress(0);
    }
  };

  const togglePlayPause = () => {
    setIsPlaying((prev) => !prev);
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
    }
  };

  const handleViewStoryViewers = async (storyId: string) => {
    setIsPlaying(false);
    setShowBottomSheet(true);
    setDragY(0);
    setLoadingViewers(true);
    
    try {
      const viewers = await getStoryViewers(storyId);
      setStoryViewers(viewers);
    } catch (error) {
      console.error('Failed to fetch story viewers:', error);
    } finally {
      setLoadingViewers(false);
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return "now";
    if (diffInHours < 24) return `${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d`;
    return `${Math.floor(diffInDays / 7)}w`;
  };

  // Handle swipe gestures for stories
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 50;
    
    // Swipe left for next story
    if (info.offset.x < -swipeThreshold) {
      goToNextStory();
    }
    // Swipe right for previous story
    else if (info.offset.x > swipeThreshold) {
      goToPrevStory();
    }
    // Swipe down to close
    else if (info.offset.y > swipeThreshold) {
      closeStory();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const newY = Math.max(0, Math.min(300, touch.clientY - window.innerHeight + 200));
    setDragY(newY);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    if (dragY > 150) {
      setShowBottomSheet(false);
      setDragY(0);
      setIsPlaying(true);
    } else if (dragY > 50) {
      setDragY(100);
    } else {
      setDragY(0);
    }
  };

  const closeBottomSheet = () => {
    setShowBottomSheet(false);
    setDragY(0);
    setIsPlaying(true);
  };

  const handleDeleteStory = async () => {
    if (!currentStory) return;

    const confirmDelete = window.confirm('Are you sure you want to delete this story? This action cannot be undone.');

    if (confirmDelete) {
      try {
        await deleteStory(currentStory.id);

        // Navigate to next story or close modal if no more stories
        if (currentUserStories.length > 1) {
          // If there are more stories from this user, show the next one
          if (currentStoryIndex < currentUserStories.length - 1) {
            // Stay on current index (which will now show the next story after deletion)
            setProgress(0);
          } else {
            // Was the last story of this user, go to previous
            setCurrentStoryIndex(Math.max(0, currentStoryIndex - 1));
            setProgress(0);
          }
        } else if (groupedStories.length > 1) {
          // No more stories from this user, move to next user or close
          if (currentUserIndex < groupedStories.length - 1) {
            setCurrentUserIndex(prev => prev + 1);
            setCurrentStoryIndex(0);
            setProgress(0);
          } else if (currentUserIndex > 0) {
            setCurrentUserIndex(prev => prev - 1);
            setCurrentStoryIndex(0);
            setProgress(0);
          } else {
            closeStory();
          }
        } else {
          // No more stories at all, close modal
          closeStory();
        }
      } catch (error) {
        console.error('Failed to delete story:', error);
        alert('Failed to delete story. Please try again.');
      }
    }
  };

  // Animation variants
  const storyModalVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: { scale: 1, opacity: 1, transition: { duration: 0.3, ease: "easeOut" } },
    exit: { scale: 0.8, opacity: 0, transition: { duration: 0.2, ease: "easeIn" } }
  };

  const storySlideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: { duration: 0.3, ease: "easeOut" }
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9,
      transition: { duration: 0.3, ease: "easeIn" }
    })
  };

  const bottomSheetVariants = {
    hidden: { y: "100%" },
    visible: { 
      y: 0, 
      transition: { 
        type: "spring", 
        damping: 25, 
        stiffness: 300 
      } 
    },
    exit: { 
      y: "100%", 
      transition: { 
        duration: 0.2, 
        ease: "easeIn" 
      } 
    }
  };

  const progressBarVariants = {
    initial: { width: "0%" },
    animate: { width: "100%" }
  };

  if (loading) {
    return (
      <div className="w-full px-2 md:px-4 py-2 md:py-3">
        <div className="flex gap-2 md:gap-3">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="flex-shrink-0">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gray-700 animate-pulse"></div>
              <div className="w-12 md:w-14 h-2 md:h-3 bg-gray-700 rounded animate-pulse mt-0.5 md:mt-1 mx-auto"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto pt-2 lg:pt-0">
      {/* Stories Grid - Compact & Mobile Responsive */}
      <motion.div
        className={`flex gap-2 md:gap-3 px-2 md:px-4 py-2 md:py-3 ${
          groupedStories.length > 5 ? "overflow-x-auto scrollbar-hide" : "overflow-x-hidden scrollbar-hide"
        }`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Upload Story Button */}
        <motion.div
          className="flex-shrink-0 cursor-pointer"
          onClick={() => setShowUploadModal(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="relative">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-black border-2 border-dashed border-gray-500 p-0.5 flex items-center justify-center">
              <Plus size={20} className="text-gray-400 md:w-6 md:h-6" />
            </div>
          </div>
          <p className="text-[10px] md:text-xs text-center mt-0.5 md:mt-1 truncate w-14 md:w-16 text-gray-400">Your Story</p>
        </motion.div>

        {/* User Stories */}
        {groupedStories.length === 0 && !loading && !error ? (
          <motion.div
            className="flex-shrink-0 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gray-700 flex items-center justify-center">
              <span className="text-gray-400 text-[10px] md:text-xs">No stories</span>
            </div>
            <p className="text-[10px] md:text-xs text-center mt-0.5 md:mt-1 text-gray-400 w-14 md:w-16">Create first!</p>
          </motion.div>
        ) : (
          groupedStories.map((groupedStory, index) => (
            <motion.div
              key={groupedStory.user.id}
              className="flex-shrink-0 cursor-pointer"
              onClick={() => openStory(index)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="relative">
                <motion.div
                  className={`w-14 h-14 md:w-16 md:h-16 rounded-full p-0.5 ${
                    groupedStory.has_viewed
                      ? 'bg-gray-600'
                      : 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500'
                  }`}
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <div className="w-full h-full rounded-full bg-black p-0.5">
                    <img
                      src={groupedStory.user.avatar_url || '/default-avatar.png'}
                      alt={groupedStory.user.username}
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                </motion.div>
              </div>
              <p className="text-[10px] md:text-xs text-center mt-0.5 md:mt-1 truncate w-14 md:w-16">{groupedStory.user.username}</p>
            </motion.div>
          ))
        )}
      </motion.div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <StoryUpload onClose={() => setShowUploadModal(false)} />
        )}
      </AnimatePresence>

      {/* Story Modal - Instagram Style */}
      <AnimatePresence>
        {isModalOpen && currentStory && (
          <motion.div 
            className="fixed inset-0 bg-black z-[99999] flex items-center justify-center"
            initial="hidden"
            animate="visible"
            exit="exit"
            // variants={storyModalVariants}
          >
            {/* Blurred Background */}
            <motion.div 
              className="absolute inset-0 bg-cover bg-center filter blur-3xl opacity-30"
              style={{
                backgroundImage: `url(${currentStory.media_url})`,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              transition={{ duration: 0.5 }}
            />

            {/* Progress Bars */}
            <div className="absolute top-2 left-4 right-4 flex gap-1 z-50">
              {currentUserStories.map((_, index) => (
                <div key={index} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-white"
                    initial="initial"
                    animate={index === currentStoryIndex ? "animate" : "initial"}
                    variants={progressBarVariants}
                    style={{
                      width: index < currentStoryIndex ? "100%" : index === currentStoryIndex ? `${progress}%` : "0%",
                    }}
                    transition={{ 
                      duration: index === currentStoryIndex ? (currentStory.media_type === "video" ? 15 : 5) : 0,
                      ease: "linear" 
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Header */}
            <motion.div 
              className="absolute top-6 left-4 right-4 flex items-center justify-between z-50"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-3">
                <motion.div 
                  className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 p-0.5"
                  whileHover={{ scale: 1.1 }}
                >
                  <img
                    src={currentStory.user.avatar_url || '/default-avatar.png'}
                    alt={currentStory.user.username}
                    className="w-full h-full rounded-full object-cover border-2 border-black"
                  />
                </motion.div>
                <div>
                  <p className="text-white font-semibold text-sm">{currentStory.user.username}</p>
                  <p className="text-gray-300 text-xs">{formatTimeAgo(currentStory.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {currentStory.user.id === currentUserId && (
                  <>
                    <motion.button
                      onClick={() => handleViewStoryViewers(currentStory.id)}
                      disabled={loadingViewers}
                      className="flex items-center gap-1 px-3 py-1.5 bg-black/50 backdrop-blur-sm text-white rounded-full hover:bg-black/70 transition-colors disabled:opacity-50"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Eye size={16} />
                      <span className="text-xs font-medium">{currentStory.view_count}</span>
                    </motion.button>
                    <motion.button
                      onClick={handleDeleteStory}
                      className="p-2 bg-red-500/50 backdrop-blur-sm text-white rounded-full hover:bg-red-500/70 transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      title="Delete story"
                    >
                      <Trash2 size={18} />
                    </motion.button>
                  </>
                )}
                {currentStory.media_type === "video" && (
                  <>
                    <motion.button
                      onClick={togglePlayPause}
                      className="p-2 bg-black/50 backdrop-blur-sm text-white rounded-full hover:bg-black/70 transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                    </motion.button>
                    <motion.button
                      onClick={toggleMute}
                      className="p-2 bg-black/50 backdrop-blur-sm text-white rounded-full hover:bg-black/70 transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </motion.button>
                  </>
                )}
                <motion.button
                  onClick={closeStory}
                  className="p-2 text-white hover:text-gray-300"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X size={24} />
                </motion.button>
              </div>
            </motion.div>

            {/* Story Content Container */}
            <motion.div 
              className="relative w-full h-full max-w-md mx-auto flex items-center justify-center"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
            >
              <AnimatePresence mode="wait" custom={currentStoryIndex}>
                <motion.div
                  key={`${currentUserIndex}-${currentStoryIndex}`}
                  custom={currentStoryIndex}
                  // variants={storySlideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="w-full h-full flex items-center justify-center"
                >
                  {currentStory.media_type === "video" ? (
                    <video
                      ref={videoRef}
                      src={currentStory.media_url}
                      className="w-full h-full object-contain"
                      autoPlay
                      muted={isMuted}
                      loop
                    />
                  ) : (
                    <img
                      src={currentStory.media_url}
                      alt="Story content"
                      className="w-full h-full object-contain"
                    />
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Caption */}
              {currentStory.caption && (
                <motion.div 
                  className="absolute bottom-24 left-4 right-4 z-40"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <p className="text-white text-sm text-center bg-black/60 backdrop-blur-sm px-4 py-2 rounded-2xl">
                    {renderTextWithMentions(
                      currentStory.caption,
                      undefined,
                      async (userId, username) => {
                        if (userId) {
                          router.push(`/snaps/profile/${userId}`)
                        } else {
                          try {
                            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://server.blazeswap.io/api/snaps'}/users/search?q=${username}&limit=1`)
                            const data = await response.json()
                            
                            if (data.users && data.users.length > 0) {
                              const user = data.users.find((u: any) => u.username === username)
                              if (user) {
                                router.push(`/snaps/profile/${user.id}`)
                                return
                              }
                            }
                          } catch (error) {
                            console.error('Error finding user:', error)
                          }
                        }
                      }
                    )}
                  </p>
                </motion.div>
              )}

              {/* Navigation Areas - Tap to navigate */}
              <div className="absolute inset-0 flex z-30">
                <button 
                  className="flex-1" 
                  onClick={goToPrevStory} 
                  disabled={currentUserIndex === 0 && currentStoryIndex === 0}
                />
                <button 
                  className="flex-1" 
                  onClick={goToNextStory}
                />
              </div>

              {/* Story Viewers Button (Instagram Style) */}
              {currentStory.user.id === currentUserId && (
                <motion.div
                  className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-40"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewStoryViewers(currentStory.id);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-sm text-white rounded-full hover:bg-black/80 transition-all duration-200 shadow-lg"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Eye size={16} />
                    <span className="text-sm font-medium">{currentStory.view_count} views</span>
                  </motion.button>
                </motion.div>
              )}
            </motion.div>

            {/* Previous Story Preview (Left Side) */}
            {(currentUserIndex > 0 || currentStoryIndex > 0) && (
              <motion.div 
                className="absolute left-4 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <motion.button
                  onClick={goToPrevStory}
                  className="text-white hover:text-gray-300 bg-black/50 backdrop-blur-sm rounded-full p-3 hover:bg-black/70 transition-all"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <ChevronLeft size={28} />
                </motion.button>
                {currentStoryIndex > 0 ? (
                  // Previous story of same user
                  <div className="hidden md:flex flex-col items-center">
                    <motion.div 
                      className="w-16 h-24 rounded-xl overflow-hidden opacity-60 hover:opacity-100 transition-opacity cursor-pointer border-2 border-white/30" 
                      onClick={goToPrevStory}
                      whileHover={{ scale: 1.05 }}
                    >
                      <img
                        src={currentUserStories[currentStoryIndex - 1].media_url}
                        alt="Previous story"
                        className="w-full h-full object-cover"
                      />
                    </motion.div>
                  </div>
                ) : currentUserIndex > 0 ? (
                  // Previous user's last story
                  <div className="hidden md:flex flex-col items-center">
                    <motion.div 
                      className="w-16 h-24 rounded-xl overflow-hidden opacity-60 hover:opacity-100 transition-opacity cursor-pointer border-2 border-white/30" 
                      onClick={goToPrevStory}
                      whileHover={{ scale: 1.05 }}
                    >
                      <img
                        src={groupedStories[currentUserIndex - 1].stories[groupedStories[currentUserIndex - 1].stories.length - 1].media_url}
                        alt="Previous user"
                        className="w-full h-full object-cover"
                      />
                    </motion.div>
                    <motion.div 
                      className="mt-2 flex flex-col items-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      <img
                        src={groupedStories[currentUserIndex - 1].user.avatar_url || '/default-avatar.png'}
                        alt={groupedStories[currentUserIndex - 1].user.username}
                        className="w-10 h-10 rounded-full object-cover border-2 border-white"
                      />
                      <p className="text-white text-xs mt-1 truncate max-w-[80px]">
                        {groupedStories[currentUserIndex - 1].user.username}
                      </p>
                    </motion.div>
                  </div>
                ) : null}
              </motion.div>
            )}
            
            {/* Next Story Preview (Right Side) */}
            {(currentUserIndex < groupedStories.length - 1 || currentStoryIndex < currentUserStories.length - 1) && (
              <motion.div 
                className="absolute right-4 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <motion.button
                  onClick={goToNextStory}
                  className="text-white hover:text-gray-300 bg-black/50 backdrop-blur-sm rounded-full p-3 hover:bg-black/70 transition-all"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <ChevronRight size={28} />
                </motion.button>
                {currentStoryIndex < currentUserStories.length - 1 ? (
                  // Next story of same user
                  <div className="hidden md:flex flex-col items-center">
                    <motion.div 
                      className="w-16 h-24 rounded-xl overflow-hidden opacity-60 hover:opacity-100 transition-opacity cursor-pointer border-2 border-white/30" 
                      onClick={goToNextStory}
                      whileHover={{ scale: 1.05 }}
                    >
                      <img
                        src={currentUserStories[currentStoryIndex + 1].media_url}
                        alt="Next story"
                        className="w-full h-full object-cover"
                      />
                    </motion.div>
                  </div>
                ) : currentUserIndex < groupedStories.length - 1 ? (
                  // Next user's first story
                  <div className="hidden md:flex flex-col items-center">
                    <motion.div 
                      className="w-16 h-24 rounded-xl overflow-hidden opacity-60 hover:opacity-100 transition-opacity cursor-pointer border-2 border-white/30" 
                      onClick={goToNextStory}
                      whileHover={{ scale: 1.05 }}
                    >
                      <img
                        src={groupedStories[currentUserIndex + 1].stories[0].media_url}
                        alt="Next user"
                        className="w-full h-full object-cover"
                      />
                    </motion.div>
                    <motion.div 
                      className="mt-2 flex flex-col items-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      <img
                        src={groupedStories[currentUserIndex + 1].user.avatar_url || '/default-avatar.png'}
                        alt={groupedStories[currentUserIndex + 1].user.username}
                        className="w-10 h-10 rounded-full object-cover border-2 border-white"
                      />
                      <p className="text-white text-xs mt-1 font-medium">Next</p>
                      <p className="text-white text-xs truncate max-w-[80px]">
                        {groupedStories[currentUserIndex + 1].user.username}
                      </p>
                    </motion.div>
                  </div>
                ) : null}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Story Viewers Bottom Sheet */}
      <AnimatePresence>
        {showBottomSheet && (
          <div className="fixed inset-0 z-[999999]">
            <motion.div 
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={closeBottomSheet}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            
            <motion.div
              ref={bottomSheetRef}
              className="absolute bottom-0 left-0 right-0 max-w-md mx-auto bg-gray-900 rounded-t-3xl shadow-2xl transform transition-transform duration-300 ease-out border-t border-gray-700"
              style={{
                transform: `translateY(${dragY}px)`,
                maxHeight: '70vh',
              }}
              // variants={bottomSheetVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 bg-gray-600 rounded-full" />
              </div>

              <div className="px-6 pb-4 border-b border-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Eye size={22} className="text-gray-300" />
                    <h2 className="text-lg font-semibold text-white">
                      {storyViewers.length} {storyViewers.length === 1 ? 'view' : 'views'}
                    </h2>
                  </div>
                  <motion.button 
                    onClick={closeBottomSheet}
                    className="p-2 rounded-full hover:bg-gray-800 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X size={22} className="text-gray-400" />
                  </motion.button>
                </div>
              </div>

              <div className="overflow-y-auto px-6 py-4" style={{ maxHeight: 'calc(70vh - 120px)' }}>
                {loadingViewers ? (
                  <motion.div 
                    className="flex items-center justify-center py-12"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <motion.div 
                      className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-500"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                  </motion.div>
                ) : storyViewers.length === 0 ? (
                  <motion.div 
                    className="text-center py-12"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <Eye size={56} className="mx-auto mb-4 text-gray-600" />
                    <p className="text-gray-400 text-lg">No views yet</p>
                  </motion.div>
                ) : (
                  <motion.div 
                    className="space-y-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ staggerChildren: 0.1 }}
                  >
                    {storyViewers.map((viewer) => (
                      <motion.div 
                        key={viewer.id} 
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-800/50 transition-colors"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 p-0.5">
                          <img 
                            src={viewer.avatar_url || '/default-avatar.png'} 
                            alt={viewer.username}
                            className="w-full h-full rounded-full object-cover border-2 border-gray-900"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm truncate">
                            {viewer.name || viewer.username}
                          </p>
                          <p className="text-gray-400 text-xs truncate">
                            @{viewer.username}
                          </p>
                        </div>
                        <div className="text-gray-500 text-xs whitespace-nowrap">
                          {new Date(viewer.viewed_at).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Stories;