'use client'
import React from 'react'
import Image from 'next/image'
import { Post, ApiPost } from '@/app/types'

interface SnapCardContentProps {
  post: Post | ApiPost
}

export default function SnapCardContent({ post }: SnapCardContentProps) {
  const isApiPost = 'user_id' in post
  const content = isApiPost ? post.content : post.content
  const mediaUrl = isApiPost ? post.media_url : post.image

  return (
    <div className="mb-4">
      <p className="text-gray-300 leading-relaxed whitespace-pre-wrap text-sm">
        {content}
      </p>

      {mediaUrl && (
        <div className="mt-3 rounded-lg overflow-hidden relative">
          <Image
            src={mediaUrl}
            alt="Post media"
            width={600}
            height={400}
            className="w-full h-auto object-cover max-h-96"
            loading="lazy"
            quality={75}
            sizes="(max-width: 768px) 100vw, 600px"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
            }}
          />
        </div>
      )}
    </div>
  )
}