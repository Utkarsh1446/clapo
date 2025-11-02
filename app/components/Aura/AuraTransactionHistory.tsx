'use client';

import React, { useEffect, useState } from 'react';
import { useAura } from '@/app/Context/AppProviders';
import { AuraTransaction } from '@/app/types/aura';
import { getTransactionTypeLabel, formatAuraAmount, getTierColor } from '@/app/types/aura';
import { Loader2, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AuraTransactionHistoryProps {
  userId?: string;
  limit?: number;
  showLoadMore?: boolean;
}

export function AuraTransactionHistory({
  userId,
  limit = 10,
  showLoadMore = true
}: AuraTransactionHistoryProps) {
  const { transactions, transactionsLoading, loadTransactions, aura } = useAura();
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (userId) {
      loadTransactions(limit, 0);
      setOffset(0);
    }
  }, [userId, limit]);

  const handleLoadMore = async () => {
    const newOffset = offset + limit;
    await loadTransactions(limit, newOffset);
    setOffset(newOffset);
  };

  if (transactionsLoading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-12 h-12 text-gray-500 mx-auto mb-4" />
        <p className="text-gray-400">No transactions yet</p>
      </div>
    );
  }

  const getTransactionIcon = (amount: number) => {
    return amount > 0 ? (
      <ArrowUpRight className="w-5 h-5 text-green-500" />
    ) : (
      <ArrowDownRight className="w-5 h-5 text-red-500" />
    );
  };

  const getTransactionColor = (amount: number) => {
    return amount > 0 ? 'text-green-500' : 'text-red-500';
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Transaction History</h2>
        {aura && (
          <div className="text-sm text-gray-400">
            Today:
            <span className="text-green-500 ml-2">+{aura.auraEarnedToday}</span>
            <span className="text-red-500 ml-2">-{aura.auraSpentToday}</span>
          </div>
        )}
      </div>

      {/* Transaction List */}
      <div className="space-y-2">
        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            className="flex items-center gap-4 p-4 rounded-xl bg-gray-800/50 border border-gray-700/50 hover:bg-gray-800/70 transition-all"
          >
            {/* Icon */}
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-700">
              {getTransactionIcon(transaction.amount)}
            </div>

            {/* Transaction Info */}
            <div className="flex-1 min-w-0">
              <div className="text-white font-semibold">
                {getTransactionTypeLabel(transaction.transactionType)}
              </div>
              <div className="text-xs text-gray-400">
                {formatDistanceToNow(new Date(transaction.createdAt), { addSuffix: true })}
              </div>
              {transaction.metadata?.reason && (
                <div className="text-xs text-gray-500 mt-1">
                  {transaction.metadata.reason}
                </div>
              )}
            </div>

            {/* Amount & Balance */}
            <div className="text-right">
              <div className={`text-lg font-bold ${getTransactionColor(transaction.amount)}`}>
                {formatAuraAmount(transaction.amount)}
              </div>
              <div className="text-xs text-gray-400">
                Balance: {transaction.balanceAfter.toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load More Button */}
      {showLoadMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={handleLoadMore}
            disabled={transactionsLoading}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {transactionsLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </span>
            ) : (
              'Load More'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
