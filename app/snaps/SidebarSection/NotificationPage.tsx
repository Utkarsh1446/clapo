/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
"use client"
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePrivy } from '@privy-io/react-auth';
import { useNotifications } from '../../hooks/useNotifications';
import { EnhancedNotification } from '../../types/api';
import { Bell, Heart, MessageCircle, UserPlus, AtSign, Eye, EyeOff, Check, Wifi, WifiOff, Bookmark, Users, AlertCircle, RefreshCw, CheckCheck, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { PostPopupModal } from '../../components/PostPopupModal';
import MyMentions from '../../components/MyMentions';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';

const NotificationPage = () => {
  const { data: session } = useSession();
  const { authenticated: privyAuthenticated, user: privyUser } = usePrivy();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'notifications' | 'mentions'>('notifications');

  // Get auth from centralized Redux store
  const { currentUserId: reduxUserId } = useAuth();

  // Support both NextAuth (legacy) and Privy auth
  const currentUserId = session?.dbUser?.id || reduxUserId;

  const {
    notifications,
    unreadCount,
    loading,
    isConnected,
    markAsRead,
    markAllAsRead,
    getNotificationStats
  } = useNotifications(currentUserId);

  const [showRead, setShowRead] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

  const handleUserClick = (userId: string) => {
    const currentState = {
      pathname: '/snaps',
      searchParams: 'page=notifications',
      scrollY: window.scrollY,
      timestamp: Date.now()
    }
    
    sessionStorage.setItem('profileNavigationState', JSON.stringify(currentState))
    router.push(`/snaps/profile/${userId}`)
  };

  const handleViewContent = (notification: EnhancedNotification) => {
    if (notification.content) {
      // Create a post object from the notification content
      const postData = {
        id: notification.ref_id || notification.id,
        content: notification.content.content,
        media_url: notification.content.media_url,
        created_at: notification.created_at,
        view_count: notification.content.view_count || 0,
        like_count: notification.content.like_count || 0,
        comment_count: notification.content.comment_count || 0,
        retweet_count: notification.content.retweet_count || 0,
        user: notification.from_user,
        is_liked: false,
        is_retweeted: false,
        is_bookmarked: false
      }
      
      setSelectedPost(postData)
      setIsPostModalOpen(true)
    } else {
      console.log('No content available for notification:', notification)
      setError('Post content not available')
    }
  };

  const handleMarkAllAsRead = async () => {
    if (isMarkingAllRead) return;
    
    setIsMarkingAllRead(true);
    try {
      // Get all unread notifications
      const unreadNotifications = notifications.filter(n => !n.is_read);
      
      // Mark them one by one with a small delay to show progress
      for (const notification of unreadNotifications) {
        await markAsRead(notification.id);
        // Small delay to show the progress and prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
      setError('Failed to mark all notifications as read');
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-4 h-4 text-red-500" />;
      case 'comment':
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'follow':
        return <UserPlus className="w-4 h-4 text-green-500" />;
      case 'mention':
        return <AtSign className="w-4 h-4 text-purple-500" />;
      case 'retweet':
        return <RefreshCw className="w-4 h-4 text-green-500" />;
      case 'bookmark':
        return <Bookmark className="w-4 h-4 text-yellow-500" />;
      case 'dm':
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'community_message':
        return <Users className="w-4 h-4 text-purple-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const getNotificationMessage = (notification: EnhancedNotification) => {
    const actorName = notification.from_user?.username || 'Someone';
    
    switch (notification.type) {
      case 'like':
        return `liked your photo`;
      case 'comment':
        return `commented on your post`;
      case 'follow':
        return `started following you`;
      case 'mention':
        return `mentioned you`;
      case 'retweet':
        return `retweeted your post`;
      case 'bookmark':
        return `bookmarked your post`;
      case 'dm':
        return `sent you a message`;
      case 'community_message':
        return `sent a community message`;
      default:
        return notification.context?.action || 'interacted with your content';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return '1m';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d`;
    return date.toLocaleDateString();
  };

  const filteredNotifications = showRead 
    ? notifications 
    : notifications.filter(notification => !notification.is_read);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  if (loading && notifications.length === 0) {
    return (
      <div className="sticky bg-black p-4 rounded-2xl flex flex-col items-center justify-center text-white border border-[#2A2A2A]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6E54FF] mb-4"></div>
        <div className="text-gray-400">Loading notifications...</div>
      </div>
    );
  }

  return (
    <div className="sticky flex flex-col rounded-2xl bg-black border border-[#2A2A2A]">
      {/* Header with Tabs */}
      <div className="p-4 border-b border-[#2A2A2A]">
        {/* Tabs */}
        <div className="bg-gray-700/50 rounded-full mb-4 p-0.5">
          <div className="flex justify-around bg-black m-0.5 p-1 items-center rounded-full relative">
            {['notifications', 'mentions'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as 'notifications' | 'mentions')}
                className={`p-2 my-1 font-semibold w-full relative z-10 text-xs sm:text-sm flex items-center justify-center gap-2 ${
                  activeTab === tab ? "text-white" : "text-gray-400"
                }`}
              >
                {tab === 'notifications' ? (
                  <>
                    <Bell className="w-4 h-4" />
                    <span>Notifications</span>
                    {unreadCount > 0 && activeTab !== 'notifications' && (
                      <span className="bg-[#6E54FF] text-white text-xs px-1.5 py-0.5 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <AtSign className="w-4 h-4" />
                    <span>Mentions</span>
                  </>
                )}
              </button>
            ))}

            <motion.div
              className="absolute rounded-full"
              style={{
                height: "40px",
                boxShadow:
                  "0px 1px 0.5px 0px rgba(255, 255, 255, 0.50) inset, 0px 1px 2px 0px rgba(110, 84, 255, 0.50), 0px 0px 0px 1px #6E54FF",
                backgroundColor: "#6E54FF",
                margin: "6px",
              }}
              initial={false}
              animate={{
                left: activeTab === "notifications" ? "0%" : "calc(50% + 0px)",
                width: "calc(50% - 6px)",
              }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          </div>
        </div>

        {/* Action Buttons - Only show for notifications tab */}
        {activeTab === 'notifications' && (
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">
              All Notifications
            </h2>
            <div className="flex items-center space-x-2">
            {/* WebSocket Status */}
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
              isConnected 
                ? 'bg-green-600/20 text-green-400' 
                : 'bg-red-600/20 text-red-400'
            }`}>
              {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span>{isConnected ? 'Live' : 'Offline'}</span>
            </div>

            {/* Mark All as Read */}
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAllRead}
                className="flex items-center space-x-1 px-2 py-1 rounded-full bg-[#2A2A2A] hover:bg-[#3A3A3A] transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCheck className={`w-3 h-3 ${isMarkingAllRead ? 'animate-spin' : ''}`} />
                <span>{isMarkingAllRead ? 'Marking...' : 'Mark all'}</span>
              </button>
            )}

            <button
              onClick={() => setShowRead(!showRead)}
              className="flex items-center space-x-1 px-2 py-1 rounded-full bg-[#2A2A2A] hover:bg-[#3A3A3A] transition-colors text-xs"
            >
              {showRead ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              <span>{showRead ? 'Hide Read' : 'Show All'}</span>
            </button>
          </div>
        </div>
        )}

        {/* Error Display - Only show for notifications tab */}
        {activeTab === 'notifications' && error && (
          <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center space-x-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Content Area - Conditionally render based on active tab */}
      {activeTab === 'mentions' ? (
        <div className="flex-1 overflow-y-auto">
          {currentUserId ? (
            <MyMentions userId={currentUserId} />
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6E54FF] mx-auto mb-4"></div>
                <p className="text-gray-400">Loading user data...</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Notifications List */
        <div className="flex-1 overflow-y-auto">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Bell className="w-12 h-12 mb-2 opacity-50" />
            <p className="text-sm">
              {showRead 
                ? "No notifications yet" 
                : "No unread notifications"
              }
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification: EnhancedNotification) => (
            <div
              key={notification.id}
              className={`p-3 hover:bg-[#1A1A1A] transition-colors border-b border-[#1A1A1A] ${
                !notification.is_read ? 'bg-[#0A0A0A]' : ''
              }`}
            >
              <div className="flex items-center space-x-3">
                {/* Actor Avatar */}
                <div className="flex-shrink-0">
                  {notification.from_user?.avatar_url ? (
                    <button
                      onClick={() => notification.from_user?.id && handleUserClick(notification.from_user.id)}
                      className="hover:opacity-80 transition-opacity"
                    >
                      <Image
                        src={notification.from_user.avatar_url}
                        alt={notification.from_user.username || 'User'}
                        width={36}
                        height={36}
                        className="w-9 h-9 rounded-full object-cover"
                        unoptimized
                      />
                    </button>
                  ) : (
                    <button
                      onClick={() => notification.from_user?.id && handleUserClick(notification.from_user.id)}
                      className="w-9 h-9 rounded-full bg-[#2A2A2A] flex items-center justify-center hover:bg-[#3A3A3A] transition-colors"
                    >
                      <span className="text-white text-sm font-medium">
                        {notification.from_user?.username?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </button>
                  )}
                </div>

                {/* Notification Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm text-white">
                          <span className="font-semibold">{notification.from_user?.username}</span>
                          {' '}
                          <span className="text-gray-400">{getNotificationMessage(notification)}</span>
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTimeAgo(notification.created_at)}
                        </span>
                        {!notification.is_read && (
                          <span className="inline-block w-2 h-2 bg-[#6E54FF] rounded-full flex-shrink-0"></span>
                        )}
                      </div>
                      
                      {/* Post Preview Text */}
                      {notification.content?.content && (
                        <p className="text-xs text-gray-500 truncate pr-2">
                          "{notification.content.content.length > 50 
                            ? notification.content.content.substring(0, 50) + '...' 
                            : notification.content.content}"
                        </p>
                      )}

                      {/* Content Preview with Media */}
                      {notification.content && (
                        <div className="mt-2 p-2 bg-[#2A2A2A]/30 rounded-lg border border-[#2A2A2A]/30">
                          <div className="flex items-start space-x-2">
                            {notification.content.media_url && (
                              <div className="flex-shrink-0">
                                <Image 
                                  src={notification.content.media_url} 
                                  alt="Post media" 
                                  width={40} 
                                  height={40} 
                                  className="w-10 h-10 rounded-md object-cover" 
                                  unoptimized 
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-3 text-xs text-gray-400">
                                <span>👁 {notification.content.view_count || 0}</span>
                                <span>❤ {notification.content.like_count || 0}</span>
                                <span>💬 {notification.content.comment_count || 0}</span>
                                <span>🔄 {notification.content.retweet_count || 0}</span>
                              </div>
                              {notification.ref_id && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewContent(notification);
                                  }}
                                  className="mt-1 flex items-center space-x-1 text-xs text-[#6E54FF] hover:text-[#836EF9] transition-colors"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>View content</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Individual Read Button */}
                    {!notification.is_read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                        className="flex-shrink-0 ml-2 p-1 rounded-full hover:bg-[#2A2A2A] transition-colors"
                        title="Mark as read"
                      >
                        <Check className="w-3 h-3 text-gray-400 hover:text-[#6E54FF]" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Notification Icon */}
                <div className="flex-shrink-0">
                  {getNotificationIcon(notification.type)}
                </div>
              </div>
            </div>
          ))
        )}
        </div>
      )}

      {/* Post Popup Modal */}
      <PostPopupModal
        post={selectedPost}
        isOpen={isPostModalOpen}
        onClose={() => {
          setIsPostModalOpen(false)
          setSelectedPost(null)
        }}
      />
    </div>
  );
};

export default NotificationPage;