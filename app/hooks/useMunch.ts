import { useState, useEffect, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { MunchApiService, MunchVideo, MunchComment } from '@/app/lib/munchApi';

export const useMunch = () => {
  const { authenticated, user: privyUser, ready } = usePrivy();
  const [videos, setVideos] = useState<MunchVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Initialize user ID from Privy
  useEffect(() => {
    const initializeUser = async () => {
      if (authenticated && privyUser && ready) {
        console.log("📊 useMunch: Loading user from Privy:", privyUser.id);
        try {
          const response = await fetch(
            `/api/users/privy/${privyUser.id}`
          );
          const data = await response.json();

          if (data.exists && data.user?.id) {
            console.log("✅ useMunch: Found user in backend:", data.user.id);
            setCurrentUserId(data.user.id);
            // Save to localStorage for AuraProvider
            localStorage.setItem('userId', data.user.id);
          } else {
            console.log("❌ useMunch: User not found in backend");
            setCurrentUserId(null);
          }
        } catch (error) {
          console.error("❌ useMunch: Error fetching Privy user:", error);
          setCurrentUserId(null);
        }
      } else {
        setCurrentUserId(null);
      }
    };

    initializeUser();
  }, [authenticated, privyUser, ready]);

  // Fetch munch feed
  const fetchMunchFeed = useCallback(async (limit: number = 20, offset: number = 0) => {
    if (!currentUserId) {
      console.log('❌ useMunch: No user ID available');
      return;
    }

    console.log('📹 useMunch: Fetching feed with params:', { currentUserId, limit, offset });
    setLoading(true);
    setError(null);

    try {
      const videosData = await MunchApiService.getMunchFeed(currentUserId, limit, offset);
      console.log('✅ useMunch: Received videos from API:', videosData.length, 'videos');
      console.log('📹 useMunch: Videos data:', videosData);

      if (offset === 0) {
        setVideos(videosData);
      } else {
        setVideos(prev => [...prev, ...videosData]);
      }

      setHasMore(videosData.length === limit);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch munch feed';
      setError(errorMessage);
      console.error('❌ useMunch: Error fetching munch feed:', err);
      console.error('❌ useMunch: Error message:', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  // Fetch following munch feed
  const fetchFollowingMunchFeed = useCallback(async (limit: number = 20, offset: number = 0) => {
    if (!currentUserId) {
      console.log('❌ useMunch: No user ID available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const videosData = await MunchApiService.getFollowingMunchFeed(currentUserId, limit, offset);

      if (offset === 0) {
        setVideos(videosData);
      } else {
        setVideos(prev => [...prev, ...videosData]);
      }

      setHasMore(videosData.length === limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch following munch feed');
      console.error('Error fetching following munch feed:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  // Create a new munch video
  const createMunchVideo = useCallback(async (
    videoUrl: string,
    duration: number,
    caption?: string,
    thumbnailUrl?: string
  ) => {
    if (!currentUserId) {
      throw new Error('User not authenticated with Privy. Please log in.');
    }

    console.log('Creating munch video with:', {
      userId: currentUserId,
      videoUrl: videoUrl,
      duration,
      caption,
      thumbnailUrl: thumbnailUrl
    });

    try {
      const newVideo = await MunchApiService.createMunchVideo({
        userId: currentUserId,
        videoUrl: videoUrl,
        duration,
        caption,
        thumbnailUrl: thumbnailUrl,
      });

      console.log('Munch video created successfully:', newVideo);

      // Add the new video to the beginning of the list
      setVideos(prev => [newVideo, ...prev]);

      return newVideo;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create munch video';
      console.error('Error creating munch video:', err);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentUserId]);

  // Like a video
  const likeVideo = useCallback(async (videoId: string) => {
    if (!currentUserId) return;

    try {
      await MunchApiService.likeMunchVideo(videoId, currentUserId);

      // Update the video in the list
      setVideos(prev =>
        prev.map(video =>
          video.id === videoId
            ? { ...video, has_liked: true, like_count: video.like_count + 1 }
            : video
        )
      );
    } catch (err) {
      console.error('Error liking video:', err);
    }
  }, [currentUserId]);

  // Unlike a video
  const unlikeVideo = useCallback(async (videoId: string) => {
    if (!currentUserId) return;

    try {
      await MunchApiService.unlikeMunchVideo(videoId, currentUserId);

      // Update the video in the list
      setVideos(prev =>
        prev.map(video =>
          video.id === videoId
            ? { ...video, has_liked: false, like_count: Math.max(0, video.like_count - 1) }
            : video
        )
      );
    } catch (err) {
      console.error('Error unliking video:', err);
    }
  }, [currentUserId]);

  // Record a video view
  const recordView = useCallback(async (videoId: string) => {
    if (!currentUserId) return;

    try {
      await MunchApiService.recordMunchView(videoId, currentUserId);

      // Update the video in the list
      setVideos(prev =>
        prev.map(video =>
          video.id === videoId
            ? { ...video, has_viewed: true, view_count: video.view_count + 1 }
            : video
        )
      );
    } catch (err) {
      console.error('Error recording view:', err);
    }
  }, [currentUserId]);

  // Delete a video
  const deleteVideo = useCallback(async (videoId: string) => {
    if (!currentUserId) {
      throw new Error('User not authenticated with Privy');
    }

    try {
      await MunchApiService.deleteMunchVideo(videoId, currentUserId);

      // Remove the video from the list
      setVideos(prev => prev.filter(video => video.id !== videoId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete video';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentUserId]);

  // Get comments for a video
  const getComments = useCallback(async (videoId: string): Promise<MunchComment[]> => {
    if (!currentUserId) {
      throw new Error('User not authenticated with Privy');
    }

    try {
      return await MunchApiService.getMunchComments(videoId, currentUserId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch comments';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentUserId]);

  // Add a comment
  const addComment = useCallback(async (videoId: string, content: string): Promise<MunchComment> => {
    if (!currentUserId) {
      throw new Error('User not authenticated with Privy');
    }

    try {
      const comment = await MunchApiService.addMunchComment(videoId, currentUserId, content);

      // Update comment count
      setVideos(prev =>
        prev.map(video =>
          video.id === videoId
            ? { ...video, comment_count: video.comment_count + 1 }
            : video
        )
      );

      return comment;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add comment';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentUserId]);

  // Share a video
  const shareVideo = useCallback(async (videoId: string) => {
    if (!currentUserId) return;

    try {
      await MunchApiService.shareMunchVideo(videoId, currentUserId);
    } catch (err) {
      console.error('Error sharing video:', err);
    }
  }, [currentUserId]);

  return {
    videos,
    loading,
    error,
    hasMore,
    currentUserId,
    fetchMunchFeed,
    fetchFollowingMunchFeed,
    createMunchVideo,
    likeVideo,
    unlikeVideo,
    recordView,
    deleteVideo,
    getComments,
    addComment,
    shareVideo,
  };
};
