'use client'

import { ReactNode } from 'react'
import { AuthProvider } from './AuthProvider'
import { PostProvider } from './PostProvider'
import { UserProvider } from './UserProvider'
import { NotificationProvider } from './NotificationProvider'
import { MessageProvider } from './MessageProvider'
import { CommunityProvider } from './CommunityProvider'
import { AuraProvider } from './AuraProvider'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <UserProvider>
        <AuraProvider>
          <PostProvider>
            <NotificationProvider>
              <MessageProvider>
                <CommunityProvider>
                  {children}
                </CommunityProvider>
              </MessageProvider>
            </NotificationProvider>
          </PostProvider>
        </AuraProvider>
      </UserProvider>
    </AuthProvider>
  )
}

// Re-export all hooks for easy imports
export { useAuth } from './AuthProvider'
export { usePost } from './PostProvider'
export { useUser } from './UserProvider'
export { useNotification } from './NotificationProvider'
export { useMessage } from './MessageProvider'
export { useCommunity } from './CommunityProvider'
export { useAura } from './AuraProvider'
