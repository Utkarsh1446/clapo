// ============================================================================
// AURA SYSTEM TYPES
// ============================================================================

/**
 * Aura Tier Levels
 */
export enum AuraTier {
  LURKER = 1,
  ACTIVE = 2,
  INFLUENCER = 3,
  LEADER = 4,
  LEGEND = 5
}

/**
 * Aura Tier Names
 */
export const AURA_TIER_NAMES: Record<AuraTier, string> = {
  [AuraTier.LURKER]: 'Lurker',
  [AuraTier.ACTIVE]: 'Active',
  [AuraTier.INFLUENCER]: 'Influencer',
  [AuraTier.LEADER]: 'Leader',
  [AuraTier.LEGEND]: 'Legend'
};

/**
 * Aura Tier Reach Multipliers
 */
export const AURA_TIER_MULTIPLIERS: Record<AuraTier, number> = {
  [AuraTier.LURKER]: 1.0,
  [AuraTier.ACTIVE]: 1.5,
  [AuraTier.INFLUENCER]: 2.0,
  [AuraTier.LEADER]: 3.0,
  [AuraTier.LEGEND]: 5.0
};

/**
 * Aura Tier Thresholds
 */
export const AURA_TIER_THRESHOLDS: Record<AuraTier, number> = {
  [AuraTier.LURKER]: 0,
  [AuraTier.ACTIVE]: 100,
  [AuraTier.INFLUENCER]: 500,
  [AuraTier.LEADER]: 1000,
  [AuraTier.LEGEND]: 2500
};

/**
 * Aura Tier Colors (for UI)
 */
export const AURA_TIER_COLORS: Record<AuraTier, string> = {
  [AuraTier.LURKER]: '#9CA3AF', // Gray
  [AuraTier.ACTIVE]: '#3B82F6', // Blue
  [AuraTier.INFLUENCER]: '#8B5CF6', // Purple
  [AuraTier.LEADER]: '#F59E0B', // Amber
  [AuraTier.LEGEND]: '#EF4444' // Red
};

/**
 * Aura Transaction Types
 */
export enum AuraTransactionType {
  INITIAL_BALANCE = 'initial_balance',
  POST_CREATION = 'post_creation',
  DAILY_DECAY = 'daily_decay',
  ENGAGEMENT_BONUS = 'engagement_bonus',
  OPINION_BET = 'opinion_bet',
  OPINION_WIN = 'opinion_win',
  OPINION_LOSS = 'opinion_loss',
  CAMPAIGN_REWARD = 'campaign_reward',
  CREATOR_SHARE_BONUS = 'creator_share_bonus',
  BOOST_SPEND = 'boost_spend',
  MESSAGE_UNLOCK = 'message_unlock',
  ADMIN_ADJUSTMENT = 'admin_adjustment'
}

/**
 * Aura Balance
 */
export interface AuraBalance {
  userId: string;
  balance: number;
  tier: AuraTier;
  lastDecayAt: string;
  totalEarned: number;
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Aura Transaction
 */
export interface AuraTransaction {
  id: string;
  userId: string;
  amount: number;
  balanceAfter: number;
  transactionType: AuraTransactionType;
  sourceId?: string;
  sourceType?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

/**
 * Aura Stats (extended balance with computed fields)
 */
export interface AuraStats extends AuraBalance {
  tierName: string;
  reachMultiplier: number;
  nextTier?: AuraTier;
  nextTierThreshold?: number;
  progressToNextTier?: number; // Percentage
  dailyPostsRemaining: number;
  canCreateOpinions: boolean;
  auraEarnedToday: number;
  auraSpentToday: number;
}

/**
 * Aura Leaderboard Entry
 */
export interface AuraLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  auraBalance: number;
  tier: AuraTier;
  tierName: string;
  totalEarned: number;
  totalSpent: number;
  followerCount?: number;
}

/**
 * Daily Post Limit
 */
export interface DailyPostLimit {
  userId: string;
  date: string;
  postCount: number;
  opinionCount: number;
  lastPostAt?: string;
}

/**
 * API Response Types
 */

export interface GetAuraBalanceResponse {
  success: boolean;
  aura: AuraStats;
}

export interface GetAuraTransactionsResponse {
  success: boolean;
  transactions: AuraTransaction[];
  total: number;
  hasMore: boolean;
}

export interface GetAuraLeaderboardResponse {
  success: boolean;
  leaderboard: AuraLeaderboardEntry[];
  total: number;
}

export interface UpdateAuraBalanceResponse {
  success: boolean;
  newBalance: number;
  newTier: AuraTier;
  transaction: AuraTransaction;
}

/**
 * Aura Constants
 */
export const AURA_CONSTANTS = {
  STARTING_BALANCE: 100,
  DAILY_DECAY: 10,
  POST_REWARD: 10,
  MAX_DAILY_POSTS: 5,
  MIN_AURA_FOR_OPINIONS: 100,
  ENGAGEMENT_BONUS_LIKE: 1,
  ENGAGEMENT_BONUS_COMMENT: 2,
  ENGAGEMENT_BONUS_SHARE: 3,
  ENGAGEMENT_BONUS_RETWEET: 2
} as const;

/**
 * Helper Functions
 */

/**
 * Calculate tier from Aura balance
 */
export function calculateTier(balance: number): AuraTier {
  if (balance >= AURA_TIER_THRESHOLDS[AuraTier.LEGEND]) return AuraTier.LEGEND;
  if (balance >= AURA_TIER_THRESHOLDS[AuraTier.LEADER]) return AuraTier.LEADER;
  if (balance >= AURA_TIER_THRESHOLDS[AuraTier.INFLUENCER]) return AuraTier.INFLUENCER;
  if (balance >= AURA_TIER_THRESHOLDS[AuraTier.ACTIVE]) return AuraTier.ACTIVE;
  return AuraTier.LURKER;
}

/**
 * Get tier name
 */
export function getTierName(tier: AuraTier): string {
  return AURA_TIER_NAMES[tier];
}

/**
 * Get reach multiplier
 */
export function getReachMultiplier(tier: AuraTier): number {
  return AURA_TIER_MULTIPLIERS[tier];
}

/**
 * Get tier color
 */
export function getTierColor(tier: AuraTier): string {
  return AURA_TIER_COLORS[tier];
}

/**
 * Get next tier info
 */
export function getNextTierInfo(balance: number, currentTier: AuraTier): {
  nextTier?: AuraTier;
  nextTierThreshold?: number;
  progressPercentage?: number;
  auraNeeded?: number;
} {
  const tiers = [
    AuraTier.LURKER,
    AuraTier.ACTIVE,
    AuraTier.INFLUENCER,
    AuraTier.LEADER,
    AuraTier.LEGEND
  ];

  const currentIndex = tiers.indexOf(currentTier);
  if (currentIndex === tiers.length - 1) {
    // Already at max tier
    return {};
  }

  const nextTier = tiers[currentIndex + 1];
  const nextTierThreshold = AURA_TIER_THRESHOLDS[nextTier];
  const currentTierThreshold = AURA_TIER_THRESHOLDS[currentTier];
  const progressPercentage = ((balance - currentTierThreshold) / (nextTierThreshold - currentTierThreshold)) * 100;
  const auraNeeded = nextTierThreshold - balance;

  return {
    nextTier,
    nextTierThreshold,
    progressPercentage: Math.min(100, Math.max(0, progressPercentage)),
    auraNeeded: Math.max(0, auraNeeded)
  };
}

/**
 * Format Aura amount with sign
 */
export function formatAuraAmount(amount: number): string {
  const sign = amount >= 0 ? '+' : '';
  return `${sign}${amount}`;
}

/**
 * Get transaction type label
 */
export function getTransactionTypeLabel(type: AuraTransactionType): string {
  const labels: Record<AuraTransactionType, string> = {
    [AuraTransactionType.INITIAL_BALANCE]: 'Initial Balance',
    [AuraTransactionType.POST_CREATION]: 'Post Created',
    [AuraTransactionType.DAILY_DECAY]: 'Daily Decay',
    [AuraTransactionType.ENGAGEMENT_BONUS]: 'Engagement Bonus',
    [AuraTransactionType.OPINION_BET]: 'Opinion Bet',
    [AuraTransactionType.OPINION_WIN]: 'Opinion Win',
    [AuraTransactionType.OPINION_LOSS]: 'Opinion Loss',
    [AuraTransactionType.CAMPAIGN_REWARD]: 'Campaign Reward',
    [AuraTransactionType.CREATOR_SHARE_BONUS]: 'Creator Share Bonus',
    [AuraTransactionType.BOOST_SPEND]: 'Post Boost',
    [AuraTransactionType.MESSAGE_UNLOCK]: 'Message Unlock',
    [AuraTransactionType.ADMIN_ADJUSTMENT]: 'Admin Adjustment'
  };
  return labels[type] || type;
}

/**
 * Check if user can create opinion
 */
export function canCreateOpinion(balance: number): boolean {
  return balance >= AURA_CONSTANTS.MIN_AURA_FOR_OPINIONS;
}

/**
 * Calculate daily posts remaining
 */
export function calculateDailyPostsRemaining(postsToday: number): number {
  return Math.max(0, AURA_CONSTANTS.MAX_DAILY_POSTS - postsToday);
}
