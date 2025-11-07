import { useCallback, useEffect, useState, useRef } from 'react';
import { useApi } from '../Context/ApiProvider';
import { EnhancedNotification } from '../types/api';

export const useNotifications = (userId?: string) => {
  const { state, fetchEnhancedNotifications, markNotificationAsRead } = useApi();
  const [notifications, setNotifications] = useState<EnhancedNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const loadingRef = useRef(false);

  // Load enhanced notifications from API
  const loadNotifications = useCallback(async () => {
    if (!userId || loadingRef.current) return;
    
    loadingRef.current = true;
    setLoading(true);
    
    try {
      console.log('🔄 Loading enhanced notifications for user:', userId);
      await fetchEnhancedNotifications(userId);
      setHasLoaded(true);
    } catch (error) {
      console.error('Failed to load enhanced notifications:', error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [userId, fetchEnhancedNotifications]);

  // Update notifications when state changes (only once after loading)
  useEffect(() => {
    if (state.enhancedNotifications.length > 0 && !loading && hasLoaded) {
      console.log('📱 Updating notifications from state:', state.enhancedNotifications.length);
      setNotifications(state.enhancedNotifications);
      const unread = state.enhancedNotifications.filter(n => !n.is_read).length;
      setUnreadCount(unread);
    }
  }, [state.enhancedNotifications, loading, hasLoaded]);


  // Mark notification as read
  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, [markNotificationAsRead]);

  // Get notification statistics
  const getNotificationStats = useCallback(() => {
    const totalCount = notifications.length;
    const unreadCount = notifications.filter(n => !n.is_read).length;

    const typeBreakdown = notifications.reduce((acc, notification) => {
      acc[notification.type] = (acc[notification.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalCount,
      unreadCount,
      typeBreakdown,
      recentNotifications: notifications.slice(0, 5),
      isConnected: false
    };
  }, [notifications]);

  // Initial load - only run once when userId changes
  useEffect(() => {
    if (userId && !hasLoaded) {
      console.log('🚀 Initial load of notifications for user:', userId);
      loadNotifications();
    }
  }, [userId, hasLoaded, loadNotifications]);

  return {
    // Data
    notifications,
    unreadCount,
    loading,
    isConnected: false,

    // Actions
    markAsRead: handleMarkAsRead,

    // Statistics
    getNotificationStats,

    // WebSocket status
    isWebSocketConnected: false
  };
};


