'use client'
import React from 'react'
import Image from 'next/image'
import { MoreHorizontal } from 'lucide-react'
import { UserProfileHover } from '../../components/UserProfileHover'
import { Post, ApiPost } from '@/app/types'
import ReputationBadge from '@/app/components/ReputationBadge'

interface SnapCardHeaderProps {
  post: Post | ApiPost
  formatDate: (date: string) => string
  onOptionsClick?: () => void
}

export default function SnapCardHeader({ post, formatDate, onOptionsClick }: SnapCardHeaderProps) {
  const isApiPost = 'user_id' in post
  const username = isApiPost ? post.username : post.handle
  const avatarUrl = isApiPost ? post.avatar_url : undefined
  const createdAt = isApiPost ? post.created_at : post.time
  const reputationTier = isApiPost && 'author_reputation_tier' in post ? post.author_reputation_tier : undefined
  const reputationScore = isApiPost && 'author_reputation' in post ? post.author_reputation : undefined

  return (
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center space-x-3">
        <UserProfileHover
          userId={isApiPost ? post.user_id : post.id.toString()}
          username={username}
          avatarUrl={avatarUrl}
        >
          <div className="w-11 h-11 rounded-full border-2 border-gray-600 relative overflow-hidden">
            <Image
              src={avatarUrl || '/4.png'}
              alt={username}
              width={44}
              height={44}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/4.png';
              }}
            />
          </div>
        </UserProfileHover>
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-white text-sm">
              @{username}
            </h3>
            {reputationTier && (
              <ReputationBadge
                tier={reputationTier}
                score={reputationScore || 0}
                size="sm"
                showScore={true}
                showLabel={false}
              />
            )}
            <span className="text-gray-500 text-xs">
              {formatDate(createdAt)}
            </span>
          </div>
        </div>
      </div>

      {onOptionsClick && (
        <button
          onClick={onOptionsClick}
          className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-800 transition-colors"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}