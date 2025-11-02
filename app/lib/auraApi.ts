// ============================================================================
// AURA API SERVICE - Updated to match backend responses
// ============================================================================

import {
  AuraStats,
  AuraTransaction,
  AuraLeaderboardEntry,
  AuraTier,
  AuraTransactionType,
  calculateTier,
  getTierName,
  getReachMultiplier,
  getNextTierInfo
} from '../types/aura';

const API_BASE_URL = process.env.NEXT_PUBLIC_AURA_API_URL || 'http://server.blazeswap.io/api';

/**
 * Backend response types (snake_case to match actual API)
 */
interface BackendAuraBalance {
  user_id: string;
  balance: number;
  tier: number;
  tier_name: string;
  reach_multiplier: number;
  last_decay_at: string;
  total_earned: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

interface BackendTransaction {
  id: string;
  user_id: string;
  amount: number;
  balance_after: number;
  transaction_type: string;
  source_id: string | null;
  source_type: string | null;
  metadata: any;
  created_at: string;
}

interface BackendLeaderboardEntry {
  id: string;
  username: string;
  avatar_url: string | null;
  display_name: string | null;
  aura_balance: number;
  aura_tier: number;
  tier_name: string;
  total_earned: number;
  total_spent: number;
  follower_count: number;
  rank: number;
}

/**
 * Transform backend response to frontend format
 */
function transformBackendBalance(data: BackendAuraBalance, postsToday: number = 0): AuraStats {
  const tier = data.tier as AuraTier;
  const nextTierInfo = getNextTierInfo(data.balance, tier);

  return {
    userId: data.user_id,
    balance: data.balance,
    tier: tier,
    tierName: data.tier_name,
    reachMultiplier: data.reach_multiplier,
    lastDecayAt: data.last_decay_at,
    totalEarned: data.total_earned,
    totalSpent: data.total_spent,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    nextTier: nextTierInfo.nextTier,
    nextTierThreshold: nextTierInfo.nextTierThreshold,
    progressToNextTier: nextTierInfo.progressPercentage,
    dailyPostsRemaining: Math.max(0, 5 - postsToday),
    canCreateOpinions: data.balance >= 100,
    auraEarnedToday: 0, // Will be calculated from transactions
    auraSpentToday: 0 // Will be calculated from transactions
  };
}

function transformBackendTransaction(data: BackendTransaction): AuraTransaction {
  return {
    id: data.id,
    userId: data.user_id,
    amount: data.amount,
    balanceAfter: data.balance_after,
    transactionType: data.transaction_type as AuraTransactionType,
    sourceId: data.source_id || undefined,
    sourceType: data.source_type || undefined,
    metadata: data.metadata,
    createdAt: data.created_at
  };
}

function transformBackendLeaderboardEntry(data: BackendLeaderboardEntry): AuraLeaderboardEntry {
  return {
    rank: data.rank,
    userId: data.id,
    username: data.username,
    displayName: data.display_name || undefined,
    avatarUrl: data.avatar_url || undefined,
    auraBalance: data.aura_balance,
    tier: data.aura_tier as AuraTier,
    tierName: data.tier_name,
    totalEarned: data.total_earned,
    totalSpent: data.total_spent,
    followerCount: data.follower_count
  };
}

/**
 * Fetch user's Aura balance and stats
 */
export async function getUserAuraBalance(userId: string): Promise<AuraStats | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn('Aura balance not found for user:', userId);
        return null;
      }
      throw new Error(`Failed to fetch Aura balance: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success && result.data) {
      return transformBackendBalance(result.data);
    }

    return null;
  } catch (error) {
    console.error('Error fetching Aura balance:', error);
    return null;
  }
}

/**
 * Fetch user's Aura transaction history
 */
export async function getUserAuraTransactions(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    transactionType?: string;
  }
): Promise<{ transactions: AuraTransaction[]; total: number; hasMore: boolean } | null> {
  try {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.transactionType) params.append('transaction_type', options.transactionType);

    const response = await fetch(`${API_BASE_URL}/${userId}/transactions?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Aura transactions: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success && result.data) {
      const transactions = result.data.map(transformBackendTransaction);
      const pagination = result.pagination;

      return {
        transactions,
        total: pagination.count,
        hasMore: (pagination.offset + pagination.limit) < pagination.count
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching Aura transactions:', error);
    return null;
  }
}

/**
 * Fetch Aura leaderboard
 */
export async function getAuraLeaderboard(options?: {
  limit?: number;
  offset?: number;
}): Promise<AuraLeaderboardEntry[] | null> {
  try {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());

    const response = await fetch(`${API_BASE_URL}/leaderboard/top?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Aura leaderboard: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success && result.data) {
      return result.data.map(transformBackendLeaderboardEntry);
    }

    return null;
  } catch (error) {
    console.error('Error fetching Aura leaderboard:', error);
    return null;
  }
}

/**
 * Update user's Aura balance
 */
export async function updateAuraBalance(
  userId: string,
  amount: number,
  transactionType: AuraTransactionType,
  sourceId?: string,
  sourceType?: string,
  metadata?: Record<string, any>
): Promise<{ newBalance: number; newTier: number; tierName: string } | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/${userId}/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount,
        transaction_type: transactionType,
        source_id: sourceId,
        source_type: sourceType,
        metadata
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to update Aura balance: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success && result.data) {
      return {
        newBalance: result.data.new_balance,
        newTier: result.data.new_tier,
        tierName: result.data.tier_name
      };
    }

    return null;
  } catch (error) {
    console.error('Error updating Aura balance:', error);
    return null;
  }
}

/**
 * Check if user can create a post today
 */
export async function canCreatePost(userId: string): Promise<{
  canPost: boolean;
  postsToday: number;
  postsRemaining: number;
  maxPosts: number;
  nextReset?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/${userId}/can-post`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to check post limit: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success && result.data) {
      return {
        canPost: result.data.can_post,
        postsToday: result.data.posts_today,
        postsRemaining: result.data.remaining_posts,
        maxPosts: result.data.max_posts,
        nextReset: result.data.next_reset
      };
    }

    return {
      canPost: false,
      postsToday: 5,
      postsRemaining: 0,
      maxPosts: 5
    };
  } catch (error) {
    console.error('Error checking post limit:', error);
    return {
      canPost: false,
      postsToday: 5,
      postsRemaining: 0,
      maxPosts: 5
    };
  }
}

/**
 * Increment daily post count (call after creating a post)
 */
export async function incrementPostCount(userId: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/${userId}/increment-post`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to increment post count: ${response.statusText}`);
    }

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Error incrementing post count:', error);
    return false;
  }
}

/**
 * Local storage helpers for caching
 */
const AURA_CACHE_KEY = 'clapo_aura_cache';
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

export function getCachedAura(userId: string): AuraStats | null {
  try {
    const cached = localStorage.getItem(`${AURA_CACHE_KEY}_${userId}`);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    const now = Date.now();

    if (now - timestamp > CACHE_DURATION) {
      // Cache expired
      localStorage.removeItem(`${AURA_CACHE_KEY}_${userId}`);
      return null;
    }

    return data;
  } catch (error) {
    return null;
  }
}

export function setCachedAura(userId: string, aura: AuraStats): void {
  try {
    const cache = {
      data: aura,
      timestamp: Date.now()
    };
    localStorage.setItem(`${AURA_CACHE_KEY}_${userId}`, JSON.stringify(cache));
  } catch (error) {
    console.error('Error caching Aura:', error);
  }
}

export function clearAuraCache(userId: string): void {
  try {
    localStorage.removeItem(`${AURA_CACHE_KEY}_${userId}`);
  } catch (error) {
    console.error('Error clearing Aura cache:', error);
  }
}

/**
 * Calculate today's Aura earned/spent from transactions
 */
export function calculateTodayStats(transactions: AuraTransaction[]): {
  earned: number;
  spent: number;
} {
  const today = new Date().toISOString().split('T')[0];

  const todayTransactions = transactions.filter(t =>
    t.createdAt.startsWith(today)
  );

  const earned = todayTransactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const spent = todayTransactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return { earned, spent };
}
