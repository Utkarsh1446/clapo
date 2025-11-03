'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthProvider';
import {
  getUserAuraBalance,
  getUserAuraTransactions,
  getUserAuraStats,
  getCachedAura,
  setCachedAura,
  clearAuraCache,
  canCreatePost as checkCanPost,
  incrementPostCount as apiIncrementPostCount,
  calculateTodayStats,
  initializeAuraForUser
} from '../lib/auraApi';
import { AuraStats, AuraTransaction } from '../types/aura';

interface AuraContextType {
  aura: AuraStats | null;
  loading: boolean;
  error: string | null;
  transactions: AuraTransaction[];
  transactionsLoading: boolean;
  postsRemaining: number;
  canPost: boolean;
  refreshAura: () => Promise<void>;
  loadTransactions: (limit?: number, offset?: number) => Promise<void>;
  incrementPostCount: (postId: string, contentType?: 'post' | 'snap') => Promise<boolean>;
}

const AuraContext = createContext<AuraContextType | undefined>(undefined);

export function AuraProvider({ children }: { children: ReactNode }) {
  const { state, getCurrentUserId } = useAuth();
  const user = state.currentUser;
  const userId = getCurrentUserId();

  const [aura, setAura] = useState<AuraStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<AuraTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [postsRemaining, setPostsRemaining] = useState(5);
  const [canPost, setCanPost] = useState(true);

  // Fetch Aura balance
  const fetchAuraBalance = async (userId: string, useCache: boolean = true) => {
    try {
      console.log('🔄 AuraProvider: Fetching Aura balance for user:', userId, 'useCache:', useCache);

      // Try cache first
      if (useCache) {
        const cached = getCachedAura(userId);
        if (cached) {
          console.log('✅ AuraProvider: Using cached Aura data:', cached);
          setAura(cached);
          return;
        }
      }

      setLoading(true);
      setError(null);

      console.log('📡 AuraProvider: Fetching Aura from API...');
      let auraData = await getUserAuraBalance(userId);
      console.log('📊 AuraProvider: Received Aura data:', auraData);

      // If no Aura found (new user), try to initialize it
      if (!auraData) {
        console.log('🆕 AuraProvider: No Aura found, attempting to initialize for new user...');
        auraData = await initializeAuraForUser(userId);

        if (auraData) {
          console.log('✅ AuraProvider: Aura initialized successfully for new user');
        } else {
          console.error('❌ AuraProvider: Failed to initialize Aura - backend may need to support this');
        }
      }

      if (auraData) {
        setAura(auraData);
        setCachedAura(userId, auraData);
        console.log('✅ AuraProvider: Aura data set successfully');
      } else {
        console.error('❌ AuraProvider: No Aura data available');
        setError('Aura system not available for this user');
      }
    } catch (err) {
      console.error('❌ AuraProvider: Error fetching Aura:', err);
      setError('Failed to load Aura balance');
    } finally {
      setLoading(false);
    }
  };

  // Check if user can post
  const checkPostLimit = async (userId: string) => {
    try {
      const result = await checkCanPost(userId);
      setCanPost(result.canPost);
      setPostsRemaining(result.postsRemaining);
    } catch (err) {
      console.error('Error checking post limit:', err);
    }
  };

  // Load transactions
  const loadTransactions = async (limit: number = 10, offset: number = 0) => {
    let currentUserId = userId || user?.id;
    if (!currentUserId && typeof window !== 'undefined') {
      currentUserId = localStorage.getItem('userId');
    }
    if (!currentUserId) return;

    try {
      setTransactionsLoading(true);
      const result = await getUserAuraTransactions(currentUserId as string, { limit, offset });

      if (result) {
        setTransactions(result.transactions);

        // Calculate today's stats
        const { earned, spent } = calculateTodayStats(result.transactions);

        if (aura) {
          setAura({
            ...aura,
            auraEarnedToday: earned,
            auraSpentToday: spent
          });
        }
      }
    } catch (err) {
      console.error('Error loading transactions:', err);
    } finally {
      setTransactionsLoading(false);
    }
  };

  // Refresh Aura (force fetch from API)
  const refreshAura = async () => {
    let currentUserId = userId || user?.id;
    if (!currentUserId && typeof window !== 'undefined') {
      currentUserId = localStorage.getItem('userId');
    }
    if (currentUserId) {
      clearAuraCache(currentUserId as string);
      await fetchAuraBalance(currentUserId as string, false);
      await checkPostLimit(currentUserId as string);
      await loadTransactions();
    }
  };

  // Increment post count
  const incrementPostCount = async (postId: string, contentType: 'post' | 'snap' = 'post'): Promise<boolean> => {
    let currentUserId = userId || user?.id;
    if (!currentUserId && typeof window !== 'undefined') {
      currentUserId = localStorage.getItem('userId');
    }
    if (!currentUserId) return false;

    try {
      const result = await apiIncrementPostCount(currentUserId as string, postId, contentType);
      if (result && result.success) {
        console.log('✅ Post count incremented:', result.message);
        console.log('📊 Aura rewarded:', result.auraRewarded);
        console.log('💰 New balance:', result.newBalance);
        console.log('📮 Posts remaining:', result.postsRemaining);

        // Update local state immediately
        setPostsRemaining(result.postsRemaining);
        setCanPost(result.postsRemaining > 0);

        // Update aura balance if we have it
        if (aura) {
          setAura({
            ...aura,
            balance: result.newBalance,
            tier: result.newTier
          });
        }

        // Refresh to get latest data
        await refreshAura();

        return true;
      }
      return false;
    } catch (err) {
      console.error('Error incrementing post count:', err);
      return false;
    }
  };

  // Initialize on user change
  useEffect(() => {
    // Try multiple sources for userId: AuthProvider, localStorage, or user object
    let currentUserId = userId || user?.id;

    // Fallback to localStorage if AuthProvider doesn't have userId
    if (!currentUserId && typeof window !== 'undefined') {
      currentUserId = localStorage.getItem('userId');
    }

    console.log('🎯 AuraProvider: User ID changed:', {
      userId,
      userIdFromUser: user?.id,
      localStorageUserId: typeof window !== 'undefined' ? localStorage.getItem('userId') : null,
      currentUserId
    });

    if (currentUserId) {
      console.log('✅ AuraProvider: Fetching Aura data for user:', currentUserId);
      fetchAuraBalance(currentUserId as string);
      checkPostLimit(currentUserId as string);
      loadTransactions();
    } else {
      console.log('⚠️ AuraProvider: No user ID found, clearing Aura data');
      setAura(null);
      setTransactions([]);
      setPostsRemaining(5);
      setCanPost(true);
    }
  }, [userId, user?.id]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    let currentUserId = userId || user?.id;

    // Fallback to localStorage
    if (!currentUserId && typeof window !== 'undefined') {
      currentUserId = localStorage.getItem('userId');
    }

    if (!currentUserId) return;

    const interval = setInterval(() => {
      fetchAuraBalance(currentUserId as string, false);
      checkPostLimit(currentUserId as string);
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [userId, user?.id]);

  const value: AuraContextType = {
    aura,
    loading,
    error,
    transactions,
    transactionsLoading,
    postsRemaining,
    canPost,
    refreshAura,
    loadTransactions,
    incrementPostCount
  };

  return <AuraContext.Provider value={value}>{children}</AuraContext.Provider>;
}

export function useAura() {
  const context = useContext(AuraContext);
  if (context === undefined) {
    throw new Error('useAura must be used within an AuraProvider');
  }
  return context;
}
