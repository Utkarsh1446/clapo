/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
'use client'

/**
 * DEPRECATED: This file is kept for backward compatibility.
 * Use the new split providers from AppProviders instead:
 * - useAuth() for authentication
 * - usePost() for posts
 * - useUser() for user profiles
 * - useNotification() for notifications
 * - useMessage() for messages
 * - useCommunity() for communities
 */

import React, { ReactNode } from 'react'
import { AppProviders, useAuth, usePost, useUser, useNotification, useCommunity } from './AppProviders'
import type { CommentRequest } from '../types/api'

// Backward compatibility: ApiProvider wraps AppProviders
export function ApiProvider({ children }: { children: ReactNode }) {
  return <AppProviders>{children}</AppProviders>
}

// Backward compatibility: useApi combines all hooks
export function useApi() {
  const auth = useAuth()
  const post = usePost()
  const user = useUser()
  const notification = useNotification()
  const community = useCommunity()

  return {
    // Auth state and methods
    state: {
      user: auth.state,
      posts: post.state,
      engagement: post.state.engagement,
      notifications: notification.state.notifications,
      enhancedNotifications: notification.state.enhancedNotifications,
      activities: notification.state.activities,
      communities: community.state.communities,
    },
    dispatch: (..._args: any[]) => {}, // No-op for backward compatibility

    // Auth methods
    login: auth.login,
    signup: auth.signup,
    signupWithPrivy: auth.signupWithPrivy,
    logout: auth.logout,
    refreshUserData: auth.refreshUserData,

    // Post methods
    fetchPosts: post.fetchPosts,
    refreshPosts: post.refreshPosts,
    createPost: post.createPost,
    likePost: post.likePost,
    unlikePost: post.unlikePost,
    retweetPost: post.retweetPost,
    bookmarkPost: post.bookmarkPost,
    unbookmarkPost: post.unbookmarkPost,
    viewPost: post.viewPost,
    commentPost: post.commentPost,
    addComment: post.addComment,
    getPostComments: post.getPostComments,
    getPostDetails: post.getPostDetails,

    // User methods
    getUserProfile: user.getUserProfile,
    updateUserProfile: user.updateUserProfile,
    followUser: user.followUser,
    unfollowUser: user.unfollowUser,
    getUserFollowers: user.getUserFollowers,
    getUserFollowing: user.getUserFollowing,
    getFollowingFeed: user.getFollowingFeed,

    // Notification methods
    fetchNotifications: notification.fetchNotifications,
    fetchEnhancedNotifications: notification.fetchEnhancedNotifications,
    fetchActivities: notification.fetchActivities,
    getUnreadNotificationCount: notification.getUnreadNotificationCount,
    markNotificationAsRead: notification.markNotificationAsRead,
    markAllNotificationsAsRead: notification.markAllNotificationsAsRead,

    // Community methods
    createCommunity: community.createCommunity,
    getCommunities: community.getCommunities,
    joinCommunity: community.joinCommunity,
    getCommunityMembers: community.getCommunityMembers,
    getUserCommunities: community.getUserCommunities,
  }
}
