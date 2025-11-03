'use client';

import React from 'react';
import { useAura } from '@/app/Context/AppProviders';
import { getTierColor, AURA_TIER_NAMES } from '@/app/types/aura';
import { Sparkles, Loader2, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface AuraBalanceProps {
  compact?: boolean;
  showDetails?: boolean;
}

export function AuraBalance({ compact = false, showDetails = false }: AuraBalanceProps) {
  const { aura, loading } = useAura();

  if (loading && !aura) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl border border-gray-700/30"
      >
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-400 font-medium">Loading...</span>
      </motion.div>
    );
  }

  if (!aura) {
    return null;
  }

  const tierColor = getTierColor(aura.tier);

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        className="relative group cursor-pointer"
      >
        {/* Glow effect */}
        <div
          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"
          style={{
            background: `radial-gradient(circle at center, ${tierColor}40, transparent 70%)`
          }}
        />

        {/* Main container */}
        <div
          className="relative flex items-center gap-3 px-4 py-2.5 rounded-xl backdrop-blur-xl border transition-all duration-300 group-hover:border-opacity-60"
          style={{
            background: `linear-gradient(135deg, ${tierColor}15, ${tierColor}08)`,
            border: `1.5px solid ${tierColor}35`,
            boxShadow: `0 4px 12px ${tierColor}10`
          }}
        >
          {/* Animated icon */}
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles className="w-5 h-5" style={{ color: tierColor }} />
          </motion.div>

          <div className="flex flex-col">
            <div className="flex items-baseline gap-1.5">
              <motion.span
                key={aura.balance}
                initial={{ scale: 1.2, color: tierColor }}
                animate={{ scale: 1, color: "#ffffff" }}
                transition={{ duration: 0.3 }}
                className="text-base font-bold tracking-tight"
              >
                {aura.balance.toLocaleString()}
              </motion.span>
              <span className="text-[10px] font-semibold uppercase tracking-wider opacity-60">
                Aura
              </span>
            </div>
            {showDetails && (
              <div className="flex items-center gap-1 mt-0.5">
                <TrendingUp className="w-3 h-3 opacity-60" style={{ color: tierColor }} />
                <span className="text-[10px] font-medium opacity-60">
                  {aura.reachMultiplier}x reach
                </span>
              </div>
            )}
          </div>

          {/* Shimmer effect */}
          <div className="absolute inset-0 rounded-xl overflow-hidden">
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: `linear-gradient(90deg, transparent, ${tierColor}15, transparent)`,
                animation: 'shimmer 2s infinite',
              }}
            />
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative w-full group"
    >
      {/* Ambient glow */}
      <div
        className="absolute -inset-4 rounded-2xl opacity-20 blur-3xl transition-opacity duration-500 group-hover:opacity-30"
        style={{
          background: `radial-gradient(circle at top, ${tierColor}60, transparent 70%)`
        }}
      />

      {/* Main card */}
      <div className="relative backdrop-blur-2xl rounded-2xl overflow-hidden">
        {/* Gradient background */}
        <div
          className="absolute inset-0 opacity-50"
          style={{
            background: `linear-gradient(135deg, ${tierColor}08, transparent 50%, ${tierColor}05)`
          }}
        />

        {/* Border gradient */}
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: `linear-gradient(135deg, ${tierColor}25, transparent 50%, ${tierColor}15)`,
            padding: '1.5px',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude'
          }}
        />

        {/* Content */}
        <div className="relative p-6 bg-black/40">
          {/* Top Section: Icon + Balance */}
          <div className="flex items-center gap-5 mb-6">
            {/* Animated Icon Container */}
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="relative"
            >
              <div
                className="flex items-center justify-center w-16 h-16 rounded-2xl relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${tierColor}30, ${tierColor}15)`,
                  boxShadow: `0 8px 24px ${tierColor}20, inset 0 1px 2px ${tierColor}40`
                }}
              >
                <motion.div
                  animate={{
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <Sparkles className="w-8 h-8" style={{ color: tierColor }} />
                </motion.div>
              </div>
            </motion.div>

            {/* Balance & Info */}
            <div className="flex-1">
              <div className="flex items-baseline gap-3 mb-2">
                <motion.span
                  key={aura.balance}
                  initial={{ scale: 1.1, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white to-gray-300"
                >
                  {aura.balance.toLocaleString()}
                </motion.span>
                <span className="text-sm text-gray-400 font-semibold uppercase tracking-wider">
                  Aura
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <motion.span
                  whileHover={{ scale: 1.05 }}
                  className="text-xs font-bold px-4 py-1.5 rounded-full backdrop-blur-xl cursor-pointer transition-all"
                  style={{
                    background: `linear-gradient(135deg, ${tierColor}30, ${tierColor}20)`,
                    color: tierColor,
                    border: `1px solid ${tierColor}40`,
                    boxShadow: `0 4px 12px ${tierColor}15`
                  }}
                >
                  {aura.tierName}
                </motion.span>
                <motion.span
                  whileHover={{ scale: 1.05 }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg backdrop-blur-xl flex items-center gap-1 cursor-pointer transition-all"
                  style={{
                    color: tierColor,
                    background: `${tierColor}15`,
                    border: `1px solid ${tierColor}25`
                  }}
                >
                  <TrendingUp className="w-3 h-3" />
                  {aura.reachMultiplier}x reach
                </motion.span>
              </div>
            </div>
          </div>

          {/* Progress Section */}
          {showDetails && aura.nextTier && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ delay: 0.2 }}
              className="space-y-3 pt-4 border-t border-gray-700/30"
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-gray-400">
                  Next Tier:{' '}
                  <span className="font-bold" style={{ color: tierColor }}>
                    {AURA_TIER_NAMES[aura.nextTier]}
                  </span>
                </span>
                <span
                  className="text-xs font-bold px-3 py-1 rounded-lg"
                  style={{
                    color: tierColor,
                    background: `${tierColor}20`,
                    border: `1px solid ${tierColor}30`
                  }}
                >
                  {Math.round(aura.progressToNextTier || 0)}%
                </span>
              </div>

              {/* Premium Progress Bar */}
              <div className="relative w-full h-3 rounded-full overflow-hidden bg-gray-900/50 border border-gray-700/30">
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(255,255,255,0.03) 10px, rgba(255,255,255,0.03) 20px)'
                  }}
                />

                {/* Progress fill */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${aura.progressToNextTier || 0}%` }}
                  transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                  className="relative h-full rounded-full overflow-hidden"
                  style={{
                    background: `linear-gradient(90deg, ${tierColor}90, ${tierColor}FF, ${tierColor}90)`,
                    boxShadow: `0 0 20px ${tierColor}60, inset 0 1px 2px rgba(255,255,255,0.3)`
                  }}
                >
                  {/* Shimmer animation */}
                  <motion.div
                    className="absolute inset-0"
                    animate={{
                      x: ['-100%', '200%']
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                      width: '50%'
                    }}
                  />
                </motion.div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
