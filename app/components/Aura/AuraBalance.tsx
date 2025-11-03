'use client';

import React from 'react';
import { useAura } from '@/app/Context/AppProviders';
import { getTierColor, AURA_TIER_NAMES } from '@/app/types/aura';
import { Sparkles, Loader2 } from 'lucide-react';

interface AuraBalanceProps {
  compact?: boolean;
  showDetails?: boolean;
}

export function AuraBalance({ compact = false, showDetails = false }: AuraBalanceProps) {
  const { aura, loading } = useAura();

  console.log('💎 AuraBalance render:', { aura, loading, compact, showDetails });

  if (loading && !aura) {
    console.log('⏳ AuraBalance: Showing loading state');
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/50">
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-400">Loading...</span>
      </div>
    );
  }

  if (!aura) {
    console.log('❌ AuraBalance: No aura data, not rendering');
    return null;
  }

  console.log('✅ AuraBalance: Rendering with data:', aura);

  const tierColor = getTierColor(aura.tier);

  if (compact) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all hover:scale-105"
        style={{
          background: `linear-gradient(135deg, ${tierColor}20, ${tierColor}10)`,
          border: `1px solid ${tierColor}40`
        }}
      >
        <Sparkles className="w-4 h-4" style={{ color: tierColor }} />
        <div className="flex flex-col">
          <span className="text-sm font-bold text-white">
            {aura.balance.toLocaleString()}
          </span>
          {showDetails && (
            <span className="text-xs text-gray-400">
              {aura.reachMultiplier}x reach
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div className="flex flex-col gap-4">
        {/* Top Section: Icon + Balance */}
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div
            className="flex items-center justify-center w-14 h-14 rounded-xl"
            style={{
              background: `linear-gradient(135deg, ${tierColor}30, ${tierColor}15)`,
              border: `2px solid ${tierColor}80`
            }}
          >
            <Sparkles className="w-7 h-7" style={{ color: tierColor }} />
          </div>

          {/* Balance & Info */}
          <div className="flex-1">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl font-bold text-white">
                {aura.balance.toLocaleString()}
              </span>
              <span className="text-sm text-gray-400 font-medium">Aura</span>
            </div>

            <div className="flex items-center gap-2">
              <span
                className="text-xs font-bold px-3 py-1 rounded-full"
                style={{
                  background: `${tierColor}30`,
                  color: tierColor,
                  border: `1px solid ${tierColor}50`
                }}
              >
                {aura.tierName}
              </span>
              <span
                className="text-xs font-semibold px-2 py-1 rounded-md"
                style={{
                  color: tierColor,
                  background: `${tierColor}20`
                }}
              >
                {aura.reachMultiplier}x reach
              </span>
            </div>
          </div>
        </div>

        {/* Progress Section */}
        {showDetails && aura.nextTier && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-gray-400">
                Next: <span style={{ color: tierColor }}>{AURA_TIER_NAMES[aura.nextTier]}</span>
              </span>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded"
                style={{
                  color: tierColor,
                  background: `${tierColor}20`
                }}
              >
                {Math.round(aura.progressToNextTier || 0)}%
              </span>
            </div>

            {/* Simplified Progress Bar */}
            <div className="relative w-full bg-gray-800/50 rounded-full h-2 overflow-hidden border border-gray-700/50">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${aura.progressToNextTier || 0}%`,
                  background: `linear-gradient(90deg, ${tierColor}90, ${tierColor})`,
                  boxShadow: `0 0 8px ${tierColor}50`
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
