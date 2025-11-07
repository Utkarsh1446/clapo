'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useOpinioContext } from '../Context/OpinioContext';

interface TradingInterfaceProps {
  marketId: number;
  marketTitle: string;
  marketData?: any;
  onTradeSuccess?: () => void;
  onError?: (error: string) => void;
}

type TradeType = 'buy' | 'sell';

export const TradingInterface: React.FC<TradingInterfaceProps> = ({ 
  marketId, 
  marketTitle, 
  marketData,
  onTradeSuccess, 
  onError 
}: TradingInterfaceProps) => {
  const [tradeType, setTradeType] = useState<TradeType>('buy');
  const [amount, setAmount] = useState<number>(100);
  const [optionId] = useState<number>(0); // Default to 0 for binary markets
  const [isLong, setIsLong] = useState<boolean>(true);
  const [isTrading, setIsTrading] = useState(false);
  const [userPosition, setUserPosition] = useState<any>(null);
  
  const { buyShares, sellShares, approveUSDC, isConnected, userPositions, usdcStatus } = useOpinioContext();
  
  // Find user's current position for this market
  useEffect(() => {
    console.log('🔍 TradingInterface useEffect - userPositions:', userPositions);
    console.log('🔍 TradingInterface useEffect - marketId:', marketId);
    console.log('🔍 TradingInterface useEffect - isConnected:', isConnected);
    
    if (userPositions && userPositions.length > 0) {
      const position = userPositions.find(pos => Number(pos.marketId) === marketId);
      setUserPosition(position);
      console.log('📊 Found user position for market', marketId, ':', position);
      
      // Auto-set the position type to match user's current holdings when they have a position
      if (position && tradeType === 'sell') {
        setIsLong(position.isLong);
        console.log('🔄 Auto-set position to match user holdings:', position.isLong ? 'LONG' : 'SHORT');
      }
    } else {
      console.log('⚠️ No userPositions found or empty array');
      setUserPosition(null);
    }
  }, [userPositions, marketId, tradeType, isConnected]);

  const handleTrade = async () => {
    if (!isConnected) {
      onError?.('Please connect your wallet first');
      return;
    }

    if (amount <= 0) {
      onError?.('Amount must be greater than 0');
      return;
    }

    try {
      setIsTrading(true);
      console.log('📊 Executing trade:', {
        marketId,
        amount,
        position: isLong ? 'YES (LONG)' : 'NO (SHORT)',
        tradeType
      });
      
      let result;
      if (tradeType === 'buy') {
        result = await buyShares(marketId, amount, isLong, optionId);
        console.log('✅ Buy successful:', result);
      } else {
        // For selling, we need to match the direction of shares the user owns
        result = await sellShares(marketId, amount, isLong, optionId);
        console.log('✅ Sell successful:', result);
      }
      
      onTradeSuccess?.();
      
      // Reset amount but keep other settings
      setAmount(100);
      
    } catch (error) {
      console.error('❌ Trade failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Trade failed';
      
      // Provide more helpful error messages for common issues
      if (errorMessage.includes('Share direction mismatch')) {
        onError?.('❌ Cannot sell: You don\'t own shares in that direction. Check your current positions.');
      } else if (errorMessage.includes('Insufficient shares')) {
        onError?.('❌ Cannot sell: You don\'t have enough shares to sell that amount.');
      } else if (errorMessage.includes('Insufficient USDC')) {
        onError?.('❌ Cannot buy: You don\'t have enough USDC balance.');
      } else if (errorMessage.includes('execution reverted') && errorMessage.includes('unknown custom error')) {
        onError?.('❌ Transaction failed: Likely USDC allowance issue. Make sure you have approved USDC spending.');
      } else if (errorMessage.includes('Market does not exist')) {
        onError?.('❌ Market not found or invalid market ID.');
      } else if (errorMessage.includes('Market not active')) {
        onError?.('❌ Market is not active for trading.');
      } else if (errorMessage.includes('Market expired')) {
        onError?.('❌ Market has expired and trading is closed.');
      } else {
        onError?.(errorMessage);
      }
    } finally {
      setIsTrading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-[#1A1A1A] p-4 rounded-lg shadow-custom space-y-4"
    >
      {/* <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Trade Shares</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              console.log('🔄 Manual refresh requested');
              // Trigger a refresh of the context data
              window.location.reload();
            }}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition"
          >
            🔄 Refresh
          </button>
          <div className="text-xs text-gray-400">
            Market ID: {marketId}
          </div>
        </div>
      </div> */}

      <div className="text-lg font-bold capitalize text-gray-300 mb-4">
        {marketTitle}
      </div>

      {/* Current Position Info */}
      {userPosition && (
        <div className="bg-[#2A2A2A] p-3 rounded-md mb-4">
          <h4 className="text-sm font-medium text-white mb-2">Your Current Position</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
            <div>
              <span className="text-gray-400">Position:</span>
              <div className={`font-medium ${userPosition.isLong ? 'text-green-400' : 'text-red-400'}`}>
                {userPosition.isLong ? 'LONG (YES)' : 'SHORT (NO)'}
              </div>
            </div>
            <div>
              <span className="text-gray-400">Shares:</span>
              <div className="text-white font-medium">{userPosition.shares}</div>
            </div>
            <div>
              <span className="text-gray-400">Invested:</span>
              <div className="text-white font-medium">${userPosition.totalInvested}</div>
            </div>
            <div>
              <span className="text-gray-400">P&L:</span>
              <div className={`font-medium ${parseFloat(userPosition.profitLoss) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${userPosition.profitLoss} ({userPosition.profitLossPercentage}%)
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            💡 To sell, make sure the position type matches your current position
          </p>
        </div>
      )}

      {/* USDC Status Warning */}
      {usdcStatus && tradeType === 'buy' && (
        <div className="bg-[#2A2A2A] p-3 rounded-md mb-4">
          <h4 className="text-sm font-medium text-white mb-2">USDC Status</h4>
          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Balance:</span>
              <span className="text-white font-medium">${(Number(usdcStatus.balance) / 1e6).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Allowance:</span>
              <span className="text-white font-medium">${(Number(usdcStatus.allowance) / 1e6).toFixed(2)}</span>
            </div>
          </div>
          {Number(usdcStatus.balance) < amount * 1e6 && (
            <div className="mt-2 text-xs text-red-400">
              ⚠️ Insufficient USDC balance for this trade
            </div>
          )}
          {Number(usdcStatus.allowance) < amount * 1e6 && (
            <div className="mt-2 space-y-2">
              <div className="text-xs text-yellow-400">
                ⚠️ Need to approve USDC spending for this amount
              </div>
              <button
                onClick={async () => {
                  try {
                    setIsTrading(true);
                    console.log('🔓 Approving USDC...');
                    await approveUSDC(1000); // Approve 1000 USDC for future trades
                    console.log('✅ USDC approved successfully!');
                    onTradeSuccess?.();
                  } catch (error) {
                    console.error('❌ USDC approval failed:', error);
                    onError?.(error instanceof Error ? error.message : 'Failed to approve USDC');
                  } finally {
                    setIsTrading(false);
                  }
                }}
                disabled={isTrading}
                className="w-full py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-xs font-medium transition disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {isTrading ? 'Approving...' : 'Approve USDC Spending'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Trade Type Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          Trade Type
        </label>
        <div className="flex space-x-2">
          <button
            onClick={() => setTradeType('buy')}
             style={{
              boxShadow:
                "0px 1px 0.5px 0px rgba(255, 255, 255, 0.50) inset, 0px 1px 2px 0px rgba(26, 19, 161, 0.50), 0px 0px 0px 1px #4F47EB",
              backgroundColor: "#6E54FF",
              color: "white",
              // padding: "8px 16px",
            }}
            className={`flex-1 py-2 rounded-full font-semibold text-sm transition ${
              tradeType === 'buy'
                ? 'bg-[#6E54FF] text-white shadow-[0px_1px_0.5px_0px_rgba(255,255,255,0.33)_inset,0px_1px_2px_0px_rgba(26,19,161,0.50),0px_0px_0px_1px_#4F47EB]'
                : 'bg-[#2A2A2A] text-gray-400 hover:text-white hover:bg-[#3A3A3A]'
            }`}
          >
            Buy Shares
          </button>
          <button
            onClick={() => {
              setTradeType('sell');
              // Auto-set position to match user's current position when selling
              if (userPosition) {
                setIsLong(userPosition.isLong);
              }
            }}
            disabled={!userPosition}
            className={`flex-1 py-2 rounded-full shadow-custom font-semibold text-sm transition ${
              !userPosition
                ? 'bg-gray-600 text-gray-500 cursor-not-allowed'
                : tradeType === 'sell'
                ? 'bg-red-600 text-white'
                : 'bg-[#2A2A2A] text-gray-400 hover:text-white hover:bg-[#3A3A3A]'
            }`}
          >
            Sell Shares {!userPosition ? '(No Position)' : ''}
          </button>
        </div>
        
       
      </div>

      {/* Position Type */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          Position Type
        </label>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsLong(true)}
            className={`flex-1 shadow-custom py-2 rounded-full font-semibold text-sm transition ${
              isLong
                ? 'bg-green-600 text-white'
                : 'bg-[#2A2A2A] text-gray-400 hover:text-white hover:bg-[#3A3A3A]'
            }`}
          >
           Yes
          </button>
          <button
            onClick={() => setIsLong(false)}
            className={`flex-1 py-2 shadow-custom rounded-full  font-semibold text-sm transition ${
              !isLong
                ? 'bg-red-600 text-white'
                : 'bg-[#2A2A2A] text-gray-400 hover:text-white hover:bg-[#3A3A3A]'
            }`}
          >
         No
          </button>
        </div>
        <p className="text-xs text-gray-400">
          LONG = bet outcome will happen, SHORT = bet outcome won't happen
        </p>
        {tradeType === 'sell' && userPosition && userPosition.isLong !== isLong && (
          <div className="bg-yellow-900/30 border border-yellow-600 p-2 rounded text-xs text-yellow-400">
            ⚠️ Warning: You're trying to sell {isLong ? 'LONG' : 'SHORT'} but you own {userPosition.isLong ? 'LONG' : 'SHORT'} shares. 
            This will cause a "Share direction mismatch" error.
          </div>
        )}
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          Amount (USDC)
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-[#6E54FF]"
          placeholder="Enter amount in USDC"
          min="0.01"
          step="0.01"
        />
        <p className="text-xs text-gray-400">
          Amount to {tradeType} in USDC
        </p>
      </div>

      {/* Trade Summary */}
      <div className="bg-[#2A2A2A] p-4 rounded-md space-y-3">
        <h4 className="text-sm font-medium text-white">Trade Summary</h4>
        
        {/* Basic Trade Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
          <div>
            <span className="text-gray-400">Action:</span>
            <div className="text-white font-medium">
              {tradeType.toUpperCase()} {isLong ? 'YES' : 'NO'}
            </div>
          </div>
          <div>
            <span className="text-gray-400">Amount:</span>
            <div className="text-white font-medium">${amount}</div>
          </div>
          <div>
            <span className="text-gray-400">Position:</span>
            <div className={`font-medium ${isLong ? 'text-green-400' : 'text-red-400'}`}>
              {isLong ? 'YES (LONG)' : 'NO (SHORT)'}
            </div>
          </div>
          <div>
            <span className="text-gray-400">Expected:</span>
            <div className="text-white font-medium">
              {isLong ? 'Outcome happens' : 'Outcome doesn\'t happen'}
            </div>
          </div>
        </div>

        {/* Trading Details */}
        <div className="border-t border-[#3A3A3A] pt-3">
          <h5 className="text-xs font-medium text-gray-300 mb-2">Trading Details</h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
            <div>
              <span className="text-gray-400">Shares:</span>
              <div className="text-white font-medium">
                {marketData && marketData.currentLongPrice && marketData.currentShortPrice ? 
                  (isLong ? 
                    (amount / (Number(marketData.currentLongPrice) / 1e6)).toFixed(2) :
                    (amount / (Number(marketData.currentShortPrice) / 1e6)).toFixed(2)
                  ) : 'Calculating...'
                }
              </div>
            </div>
            <div>
              <span className="text-gray-400">Avg Price:</span>
              <div className="text-white font-medium">
                {marketData && marketData.currentLongPrice && marketData.currentShortPrice ? 
                  `$${(isLong ? 
                    Number(marketData.currentLongPrice) / 1e6 :
                    Number(marketData.currentShortPrice) / 1e6
                  ).toFixed(3)}` : 'Calculating...'
                }
              </div>
            </div>
            <div>
              <span className="text-gray-400">Max Payout:</span>
              <div className="text-white font-medium">
                {marketData && marketData.currentLongPrice && marketData.currentShortPrice ? 
                  `$${(isLong ? 
                    (amount / (Number(marketData.currentLongPrice) / 1e6)) :
                    (amount / (Number(marketData.currentShortPrice) / 1e6))
                  ).toFixed(2)}` : 'Calculating...'
                }
              </div>
            </div>
            <div>
              <span className="text-gray-400">Potential Return:</span>
              <div className="text-white font-medium">
                {marketData && marketData.currentLongPrice && marketData.currentShortPrice ? 
                  `${(isLong ? 
                    ((1 - Number(marketData.currentLongPrice) / 1e6) / (Number(marketData.currentLongPrice) / 1e6) * 100) :
                    ((1 - Number(marketData.currentShortPrice) / 1e6) / (Number(marketData.currentShortPrice) / 1e6) * 100)
                  ).toFixed(1)}%` : 'Calculating...'
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleTrade}
        disabled={!isConnected || isTrading}
        className={`w-full py-3 rounded-md font-semibold text-sm transition-all duration-200 ${
          !isConnected || isTrading
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : tradeType === 'buy'
            ? 'bg-[#6E54FF] text-white hover:bg-[#836EF9] shadow-[0px_1px_0.5px_0px_rgba(255,255,255,0.33)_inset,0px_1px_2px_0px_rgba(26,19,161,0.50),0px_0px_0px_1px_#4F47EB]'
            : 'bg-red-600 text-white hover:bg-red-700'
        }`}
      >
        {!isConnected 
          ? 'Connect Wallet to Trade' 
          : isTrading
          ? `${tradeType === 'buy' ? 'Buying' : 'Selling'}...`
          : `${tradeType === 'buy' ? 'Buy' : 'Sell'} Shares`
        }
      </button>

      {/* Info */}
      <div className="text-xs text-gray-400 space-y-1">
        <p>• <strong>Buy YES</strong> if you think the outcome will happen</p>
        <p>• <strong>Buy NO</strong> if you think the outcome won't happen</p>
        <p>• <strong>Sell</strong> to exit your position and realize profits/losses</p>
        <p>• Each share pays $1.00 if your prediction is correct</p>
      </div>
    </motion.div>
  );
};
