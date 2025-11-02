'use client';

import React from 'react';
import { useAura } from '@/app/Context/AppProviders';
import { getTierColor, AURA_TIER_NAMES } from '@/app/types/aura';
import { Sparkles, TrendingUp, TrendingDown, Target, Zap, Loader2 } from 'lucide-react';

interface AuraProfileCardProps {
  showTransactionSummary?: boolean;
  showPostLimit?: boolean;
  showProgress?: boolean;
}

export function AuraProfileCard({
  showTransactionSummary = true,
  showPostLimit = true,
  showProgress = true
}: AuraProfileCardProps) {
  const { aura, loading, postsRemaining, canPost } = useAura();

  if (loading && !aura) {
    return (
      <div className="p-8 rounded-xl bg-gray-800/50 border border-gray-700/50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!aura) {
    return null;
  }

  const tierColor = getTierColor(aura.tier);

  return (
    <div
      className="p-6 rounded-xl border-2 transition-all hover:shadow-lg"
      style={{
        background: `linear-gradient(135deg, ${tierColor}15, ${tierColor}05)`,
        borderColor: `${tierColor}50`
      }}
    >
      {/* Main Balance Section */}
      <div className="flex items-center gap-4 mb-6">
        <div
          className="flex items-center justify-center w-16 h-16 rounded-xl"
          style={{
            background: `linear-gradient(135deg, ${tierColor}40, ${tierColor}20)`,
            border: `2px solid ${tierColor}`
          }}
        >
          <Sparkles className="w-8 h-8" style={{ color: tierColor }} />
        </div>

        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-white">
              {aura.balance.toLocaleString()}
            </span>
            <span className="text-lg text-gray-400">Aura</span>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span
              className="text-sm font-bold px-3 py-1 rounded-full"
              style={{
                background: `${tierColor}30`,
                color: tierColor
              }}
            >
              {aura.tierName}
            </span>
            <span className="text-sm text-gray-400">
              {aura.reachMultiplier}x Reach Multiplier
            </span>
          </div>
        </div>
      </div>

      {/* Progress to Next Tier */}
      {showProgress && aura.nextTier && (
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-300 font-semibold">
              Progress to {AURA_TIER_NAMES[aura.nextTier]}
            </span>
            <span className="text-gray-400">
              {Math.round(aura.progressToNextTier || 0)}%
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
            <div
              className="h-2.5 rounded-full transition-all duration-500"
              style={{
                width: `${aura.progressToNextTier || 0}%`,
                backgroundColor: tierColor
              }}
            />
          </div>
          {aura.nextTierThreshold && (
            <div className="text-xs text-gray-500 mt-1">
              {(aura.nextTierThreshold - aura.balance).toLocaleString()} more Aura needed
            </div>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Total Earned */}
        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-400">Total Earned</span>
          </div>
          <span className="text-2xl font-bold text-white">
            {aura.totalEarned.toLocaleString()}
          </span>
        </div>

        {/* Total Spent */}
        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/50">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <span className="text-xs text-gray-400">Total Spent</span>
          </div>
          <span className="text-2xl font-bold text-white">
            {aura.totalSpent.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Today's Summary */}
      {showTransactionSummary && (
        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700/50 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-semibold text-gray-300">Today's Activity</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-gray-400">Earned</span>
              <div className="text-lg font-bold text-green-500">
                +{aura.auraEarnedToday}
              </div>
            </div>
            <div>
              <span className="text-xs text-gray-400">Spent</span>
              <div className="text-lg font-bold text-red-500">
                -{aura.auraSpentToday}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Post Limit */}
      {showPostLimit && (
        <div
          className={`p-4 rounded-lg border ${
            canPost
              ? 'bg-green-900/20 border-green-700/50'
              : 'bg-red-900/20 border-red-700/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className={`w-4 h-4 ${canPost ? 'text-green-500' : 'text-red-500'}`} />
              <span className="text-sm font-semibold text-gray-300">Daily Posts</span>
            </div>
            <span className={`text-lg font-bold ${canPost ? 'text-green-500' : 'text-red-500'}`}>
              {postsRemaining} / 5
            </span>
          </div>
          {!canPost && (
            <div className="text-xs text-red-400 mt-2">
              Daily post limit reached. Try again tomorrow!
            </div>
          )}
        </div>
      )}

      {/* Opinions Status */}
      <div className="mt-4 text-center">
        {aura.canCreateOpinions ? (
          <div className="text-sm text-green-500 font-semibold">
            ✓ You can create opinions (100+ Aura required)
          </div>
        ) : (
          <div className="text-sm text-gray-400">
            Need {100 - aura.balance} more Aura to create opinions
          </div>
        )}
      </div>
    </div>
  );
}
