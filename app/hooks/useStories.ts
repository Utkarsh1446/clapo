import { useState, useEffect, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { StoriesApiService, Story } from '@/app/lib/storiesApi';

export const useStories = () => {
  const { authenticated, user: privyUser, ready } = usePrivy();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Initialize user ID from Privy
  useEffect(() => {
    const initializeUser = async () => {
      if (authenticated && privyUser && ready) {
        console.log("📊 useStories: Loading user from Privy:", privyUser.id);
        try {
          const response = await fetch(
            `/api/users/privy/${privyUser.id}`
          );
          const data = await response.json();

          if (data.exists && data.user?.id) {
            console.log("✅ useStories: Found user in backend:", data.user.id);
            setCurrentUserId(data.user.id);
            // Save to localStorage for AuraProvider
            localStorage.setItem('userId', data.user.id);
          } else {
            console.log("❌ useStories: User not found in backend");
            setCurrentUserId(null);
          }
        } catch (error) {
          console.error("❌ useStories: Error fetching Privy user:", error);
          setCurrentUserId(null);
        }
      } else {
        setCurrentUserId(null);
      }
    };

    initializeUser();
  }, [authenticated, privyUser, ready]);

  // Fetch stories from users that the current user is following
  const fetchFollowingStories = useCallback(async (limit: number = 50, silent: boolean = false) => {
    if (!currentUserId) {
      console.log('❌ useStories: No user ID available');
      return;
    }

    // Only show loading state on initial fetch, not on background refresh
    if (!silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const storiesData = await StoriesApiService.getFollowingStories(currentUserId, limit);
      setStories(storiesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stories');
      console.error('Error fetching stories:', err);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [currentUserId]);

  // Fetch stories for a specific user
  const fetchUserStories = useCallback(async (userId: string) => {
    if (!currentUserId) return;

    setLoading(true);
    setError(null);

    try {
      const storiesData = await StoriesApiService.getUserStories(userId, currentUserId);
      setStories(storiesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user stories');
      console.error('Error fetching user stories:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  // Create a new story
  const createStory = useCallback(async (mediaUrl: string, mediaType: 'image' | 'video', caption?: string) => {
    if (!currentUserId) {
      throw new Error('User not authenticated with Privy. Please log in.');
    }

    console.log('Creating story with:', {
      user_id: currentUserId,
      media_url: mediaUrl,
      media_type: mediaType,
      caption
    });

    try {
      const newStory = await StoriesApiService.createStory({
        user_id: currentUserId,
        media_url: mediaUrl,
        media_type: mediaType,
        caption,
      });

      console.log('Story created successfully:', newStory);

      // Add the new story to the beginning of the list
      setStories(prev => [newStory, ...prev]);

      return newStory;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create story';
      console.error('Error creating story:', err);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentUserId]);

  // Record a story view
  const recordStoryView = useCallback(async (storyId: string) => {
    if (!currentUserId) return;

    try {
      await StoriesApiService.recordStoryView(storyId, currentUserId);

      // Update the story to mark it as viewed
      setStories(prev =>
        prev.map(story =>
          story.id === storyId
            ? { ...story, has_viewed: true, view_count: story.view_count + 1 }
            : story
        )
      );
    } catch (err) {
      console.error('Error recording story view:', err);
    }
  }, [currentUserId]);

  // Delete a story
  const deleteStory = useCallback(async (storyId: string) => {
    if (!currentUserId) {
      throw new Error('User not authenticated with Privy');
    }

    try {
      await StoriesApiService.deleteStory(storyId, currentUserId);

      // Remove the story from the list
      setStories(prev => prev.filter(story => story.id !== storyId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete story';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentUserId]);

  // Get story viewers (only for story owner)
  const getStoryViewers = useCallback(async (storyId: string) => {
    if (!currentUserId) {
      throw new Error('User not authenticated with Privy');
    }

    try {
      return await StoriesApiService.getStoryViewers(storyId, currentUserId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch story viewers';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [currentUserId]);

  // Group stories by user for display
  const groupedStories = stories.reduce((groups: Record<string, Story[]>, story) => {
    const userId = story.user_id;
    if (!groups[userId]) {
      groups[userId] = [];
    }
    groups[userId].push(story);
    return groups;
  }, {});

  return {
    stories,
    groupedStories,
    loading,
    error,
    fetchFollowingStories,
    fetchUserStories,
    createStory,
    recordStoryView,
    deleteStory,
    getStoryViewers,
  };
};
