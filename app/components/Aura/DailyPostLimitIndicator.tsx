'use client';

import React from 'react';
import { useAura } from '@/app/Context/AppProviders';
import { Sparkles, TrendingUp, AlertCircle } from 'lucide-react';
import { AURA_CONSTANTS } from '@/app/types/aura';

interface DailyPostLimitIndicatorProps {
  compact?: boolean;
}

export function DailyPostLimitIndicator({ compact = false }: DailyPostLimitIndicatorProps) {
  const { postsRemaining, canPost, loading } = useAura();

  if (loading) {
    return null;
  }

  const postsUsed = AURA_CONSTANTS.MAX_DAILY_POSTS - postsRemaining;
  const percentage = (postsUsed / AURA_CONSTANTS.MAX_DAILY_POSTS) * 100;
  const potentialAura = postsRemaining * AURA_CONSTANTS.POST_REWARD;

  // Color based on posts remaining
  const getColor = () => {
    if (postsRemaining === 0) return '#EF4444'; // Red
    if (postsRemaining <= 2) return '#F59E0B'; // Orange
    return '#10B981'; // Green
  };

  const color = getColor();

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        {canPost ? (
          <>
            <div className="flex items-center gap-1.5 text-gray-400">
              <Sparkles className="w-3.5 h-3.5" style={{ color }} />
              <span className="font-medium">
                {postsRemaining}/{AURA_CONSTANTS.MAX_DAILY_POSTS} posts left
              </span>
            </div>
            {postsRemaining > 0 && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <TrendingUp className="w-3 h-3" />
                <span>+{potentialAura} Aura</span>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-1.5 text-red-400">
            <AlertCircle className="w-3.5 h-3.5" />
            <span className="font-medium text-xs">Daily limit reached</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg bg-gray-800/30 border border-gray-700/50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" style={{ color }} />
          <span className="text-sm font-semibold text-gray-300">Daily Posts</span>
        </div>
        <div className="text-sm font-bold" style={{ color }}>
          {postsRemaining}/{AURA_CONSTANTS.MAX_DAILY_POSTS}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative w-full bg-gray-800/50 rounded-full h-2 overflow-hidden border border-gray-700/50">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${percentage}%`,
            background: `linear-gradient(90deg, ${color}90, ${color})`,
            boxShadow: `0 0 8px ${color}50`
          }}
        />
      </div>

      {/* Info */}
      <div className="flex items-center justify-between text-xs">
        {canPost ? (
          <>
            <span className="text-gray-400">
              {postsUsed} post{postsUsed !== 1 ? 's' : ''} created today
            </span>
            <div className="flex items-center gap-1 font-semibold" style={{ color }}>
              <TrendingUp className="w-3 h-3" />
              <span>+{potentialAura} Aura available</span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-1.5 text-red-400">
            <AlertCircle className="w-3.5 h-3.5" />
            <span className="font-medium">
              Daily limit reached. Come back tomorrow!
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
