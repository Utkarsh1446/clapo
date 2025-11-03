'use client';

import React from 'react';
import { useAura } from '@/app/Context/AppProviders';
import { Sparkles, TrendingUp, AlertCircle, Zap } from 'lucide-react';
import { AURA_CONSTANTS } from '@/app/types/aura';
import { motion, AnimatePresence } from 'framer-motion';

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
    if (postsRemaining <= 2) return '#F59E0B'; // Amber
    return '#10B981'; // Green
  };

  const color = getColor();

  if (compact) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={canPost ? 'can-post' : 'limit-reached'}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="flex items-center gap-2 text-sm"
        >
          {canPost ? (
            <>
              <motion.div
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg backdrop-blur-xl"
                style={{
                  background: `linear-gradient(135deg, ${color}15, ${color}08)`,
                  border: `1px solid ${color}30`
                }}
                whileHover={{ scale: 1.05 }}
              >
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles className="w-4 h-4" style={{ color }} />
                </motion.div>
                <span className="font-semibold text-white">
                  {postsRemaining}/{AURA_CONSTANTS.MAX_DAILY_POSTS} posts
                </span>
              </motion.div>
              {postsRemaining > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-1 px-2 py-1 rounded-md backdrop-blur-xl"
                  style={{
                    background: `${color}10`,
                    border: `1px solid ${color}20`
                  }}
                >
                  <TrendingUp className="w-3 h-3" style={{ color }} />
                  <span className="text-xs font-medium" style={{ color }}>
                    +{potentialAura} Aura
                  </span>
                </motion.div>
              )}
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg backdrop-blur-xl"
              style={{
                background: 'linear-gradient(135deg, #EF444415, #EF444408)',
                border: '1px solid #EF444430'
              }}
            >
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="font-semibold text-red-400 text-xs">Limit reached</span>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative group"
    >
      {/* Glow effect */}
      <div
        className="absolute -inset-2 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
        style={{
          background: `radial-gradient(circle at center, ${color}30, transparent 70%)`
        }}
      />

      {/* Main container */}
      <div className="relative backdrop-blur-2xl rounded-2xl overflow-hidden">
        {/* Gradient background */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background: `linear-gradient(135deg, ${color}10, transparent 50%, ${color}05)`
          }}
        />

        {/* Border gradient */}
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: `linear-gradient(135deg, ${color}30, transparent 50%, ${color}20)`,
            padding: '1.5px',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude'
          }}
        />

        {/* Content */}
        <div className="relative p-4 bg-black/40">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <motion.div
                className="relative"
                animate={{
                  rotate: canPost ? [0, 5, -5, 0] : 0
                }}
                transition={{
                  duration: 2,
                  repeat: canPost ? Infinity : 0,
                  ease: "easeInOut"
                }}
              >
                <div
                  className="p-2.5 rounded-xl"
                  style={{
                    background: `linear-gradient(135deg, ${color}30, ${color}20)`,
                    boxShadow: `0 4px 12px ${color}20`
                  }}
                >
                  {canPost ? (
                    <Zap className="w-5 h-5" style={{ color }} />
                  ) : (
                    <AlertCircle className="w-5 h-5" style={{ color }} />
                  )}
                </div>
              </motion.div>
              <div>
                <h3 className="text-sm font-bold text-white">Daily Posts</h3>
                <p className="text-xs text-gray-400">
                  {canPost ? 'Keep creating!' : 'Limit reached'}
                </p>
              </div>
            </div>
            <motion.div
              key={postsRemaining}
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-2xl font-bold"
              style={{ color }}
            >
              {postsRemaining}/{AURA_CONSTANTS.MAX_DAILY_POSTS}
            </motion.div>
          </div>

          {/* Progress Bar */}
          <div className="relative w-full h-3 rounded-full overflow-hidden bg-gray-900/60 border border-gray-700/40 mb-3">
            {/* Background pattern */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(255,255,255,0.03) 8px, rgba(255,255,255,0.03) 16px)'
              }}
            />

            {/* Progress fill */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative h-full rounded-full overflow-hidden"
              style={{
                background: `linear-gradient(90deg, ${color}90, ${color}FF, ${color}90)`,
                boxShadow: `0 0 16px ${color}50, inset 0 1px 2px rgba(255,255,255,0.3)`
              }}
            >
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0"
                animate={{ x: ['-100%', '200%'] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear"
                }}
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                  width: '40%'
                }}
              />
            </motion.div>
          </div>

          {/* Info */}
          <AnimatePresence mode="wait">
            {canPost ? (
              <motion.div
                key="can-post-info"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-gray-400 font-medium">
                  {postsUsed} post{postsUsed !== 1 ? 's' : ''} created today
                </span>
                <motion.div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg backdrop-blur-xl"
                  style={{
                    background: `linear-gradient(135deg, ${color}20, ${color}10)`,
                    border: `1px solid ${color}30`
                  }}
                  whileHover={{ scale: 1.05 }}
                >
                  <TrendingUp className="w-3.5 h-3.5" style={{ color }} />
                  <span className="font-bold" style={{ color }}>
                    +{potentialAura} Aura available
                  </span>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="limit-reached-info"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg backdrop-blur-xl"
                style={{
                  background: 'linear-gradient(135deg, #EF444420, #EF444410)',
                  border: '1px solid #EF444430'
                }}
              >
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="font-semibold text-red-400">
                  Daily limit reached. Come back tomorrow!
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
