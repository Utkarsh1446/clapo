'use client';

import React, { useEffect, useState } from 'react';
import { getAuraLeaderboard } from '@/app/lib/auraApi';
import { AuraLeaderboardEntry } from '@/app/types/aura';
import { getTierColor } from '@/app/types/aura';
import { Trophy, Loader2, Sparkles } from 'lucide-react';
import Image from 'next/image';

interface AuraLeaderboardProps {
  limit?: number;
  showRank?: boolean;
}

export function AuraLeaderboard({ limit = 20, showRank = true }: AuraLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<AuraLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [limit]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAuraLeaderboard({ limit });
      if (data) {
        setLeaderboard(data);
      } else {
        setError('Failed to load leaderboard');
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No users found</p>
      </div>
    );
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="w-6 h-6 text-yellow-500" />
        <h2 className="text-2xl font-bold text-white">Aura Leaderboard</h2>
      </div>

      {/* Leaderboard List */}
      <div className="space-y-2">
        {leaderboard.map((entry) => {
          const tierColor = getTierColor(entry.tier);
          const rankIcon = getRankIcon(entry.rank);

          return (
            <div
              key={entry.userId}
              className="flex items-center gap-4 p-4 rounded-xl bg-gray-800/50 border border-gray-700/50 hover:bg-gray-800/70 transition-all"
            >
              {/* Rank */}
              {showRank && (
                <div className="flex items-center justify-center w-10 h-10 text-lg font-bold text-white">
                  {rankIcon || `#${entry.rank}`}
                </div>
              )}

              {/* Avatar */}
              <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                {entry.avatarUrl ? (
                  <Image
                    src={entry.avatarUrl}
                    alt={entry.username}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl font-bold">
                    {entry.username[0].toUpperCase()}
                  </div>
                )}
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold truncate">
                    {entry.displayName || entry.username}
                  </span>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: `${tierColor}30`,
                      color: tierColor
                    }}
                  >
                    {entry.tierName}
                  </span>
                </div>
                <div className="text-xs text-gray-400 truncate">
                  @{entry.username}
                </div>
              </div>

              {/* Aura Balance */}
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-4 h-4" style={{ color: tierColor }} />
                    <span className="text-lg font-bold text-white">
                      {entry.auraBalance.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">
                    Earned: {entry.totalEarned.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Refresh Button */}
      <div className="flex justify-center pt-4">
        <button
          onClick={fetchLeaderboard}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-semibold"
        >
          Refresh Leaderboard
        </button>
      </div>
    </div>
  );
}
