'use client';

import React, { useEffect } from 'react';
import { useActivityFeed } from '@/app/hooks/useActivityFeed';
import { ActivityItem } from '@/app/lib/tokenApi';
import { RefreshCw, TrendingUp, Gift, DollarSign, Clock } from 'lucide-react';

interface UserActivityFeedProps {
  username?: string;
  limit?: number;
}

export default function UserActivityFeed({ username, limit = 10 }: UserActivityFeedProps) {
  const { activities, loading, error, fetchRecentActivity, refreshActivity } = useActivityFeed();

  useEffect(() => {
    fetchRecentActivity(limit);
  }, [limit]);

  const formatUsername = (usernameOrAddress: string): string => {
    // Backend now returns usernames or "User 0x1234...5678" format
    // Just return as-is, backend handles the formatting
    return usernameOrAddress || 'Unknown';
  };

  const formatActivityMessage = (activity: ActivityItem): string => {
    const { username: user, action, token_name, creator_name, amount, total_cost, is_freebie, type } = activity;
    const formattedUser = formatUsername(user);
    const formattedCreator = formatUsername(creator_name);

    if (is_freebie) {
      if (type === 'post_token') {
        return `${formattedUser} claimed a freebie snap from ${formattedCreator}`;
      } else {
        return `${formattedUser} claimed a freebie share of ${formattedCreator}`;
      }
    }

    switch (action) {
      case 'bought':
        if (type === 'post_token') {
          return `${formattedUser} bought ${amount} snap${amount > 1 ? 's' : ''} from ${formattedCreator}`;
        } else {
          return `${formattedUser} bought ${amount} share${amount > 1 ? 's' : ''} of ${formattedCreator}`;
        }
      case 'sold':
        if (type === 'post_token') {
          return `${formattedUser} sold ${amount} snap${amount > 1 ? 's' : ''} of ${formattedCreator}`;
        } else {
          return `${formattedUser} sold ${amount} share${amount > 1 ? 's' : ''} of ${formattedCreator}`;
        }
      case 'claimed_freebie':
        if (type === 'post_token') {
          return `${formattedUser} claimed a freebie snap from ${formattedCreator}`;
        } else {
          return `${formattedUser} claimed a freebie share of ${formattedCreator}`;
        }
      default:
        return `${formattedUser} ${action} ${token_name}`;
    }
  };

  const getActivityIcon = (activity: ActivityItem) => {
    if (activity.is_freebie) {
      return <Gift className="w-3 h-3 text-green-500" />;
    }
    
    switch (activity.action) {
      case 'bought':
        return <TrendingUp className="w-3 h-3 text-blue-500" />;
      case 'sold':
        return <DollarSign className="w-3 h-3 text-red-500" />;
      default:
        return <Clock className="w-3 h-3 text-gray-500" />;
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const activityDate = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - activityDate.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    }
  };

  if (loading && activities.length === 0) {
    return (
      <div className="text-white">
        <div className="max-h-72 overflow-y-auto text-wrap break-words pr-2 ">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start p-4">
              <div className="w-8 h-8 bg-gray-600 rounded-full mr-3 flex-shrink-0 animate-pulse" />
              <div className="flex-1">
                <div className="h-3 bg-gray-600 rounded animate-pulse mb-2" />
                <div className="h-3 bg-gray-600 rounded animate-pulse mb-1 w-3/4" />
                <div className="h-3 bg-gray-600 rounded animate-pulse w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-white">
        <div className="max-h-72 overflow-y-auto">
          <div className="p-4 text-center">
            <p className="text-red-400 text-sm mb-2">{error}</p>
            <button
              onClick={() => fetchRecentActivity(limit)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-white">
      {/* <div className="flex items-center justify-between mb-2">
        <button
          onClick={refreshActivity}
          disabled={loading}
          className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div> */}
      
      <div className="max-h-72 overflow-y-auto">
        {activities.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-gray-400 text-sm">No recent activity</p>
          </div>
        ) : (
          activities.map((activity, index) => (
            <div 
              key={activity.id} 
              className="flex items-start p-4 hover:bg-gray-800 transition-colors"
            >
              <div className="w-8 h-8 bg-gray-600 rounded-full mr-3 flex-shrink-0 flex items-center justify-center">
                {getActivityIcon(activity)}
              </div>
              <div className="flex-1">
                <div className="text-xs text-gray-300 mb-1">
                  {formatActivityMessage(activity)}
                </div>
                <div className="flex items-center">
                  <div className="text-xs font-semibold text-green-400">
                    {activity.is_freebie ? 'FOR $0' : `FOR $${activity.total_cost.toFixed(2)}`}
                  </div>
                  <div className="text-xs text-gray-400 ml-2">
                    • {formatTimeAgo(activity.created_at)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
