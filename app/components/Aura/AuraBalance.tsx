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
    <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-800/50 border border-gray-700/50">
      <div
        className="flex items-center justify-center w-12 h-12 rounded-xl"
        style={{
          background: `linear-gradient(135deg, ${tierColor}40, ${tierColor}20)`,
          border: `2px solid ${tierColor}`
        }}
      >
        <Sparkles className="w-6 h-6" style={{ color: tierColor }} />
      </div>

      <div className="flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white">
            {aura.balance.toLocaleString()}
          </span>
          <span className="text-sm text-gray-400">Aura</span>
        </div>

        <div className="flex items-center gap-2 mt-1">
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: `${tierColor}30`,
              color: tierColor
            }}
          >
            {aura.tierName}
          </span>
          <span className="text-xs text-gray-500">
            {aura.reachMultiplier}x reach
          </span>
        </div>

        {showDetails && aura.nextTier && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progress to {AURA_TIER_NAMES[aura.nextTier]}</span>
              <span>{Math.round(aura.progressToNextTier || 0)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: `${aura.progressToNextTier || 0}%`,
                  backgroundColor: tierColor
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
