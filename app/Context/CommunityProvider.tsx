'use client'

import React, { createContext, useContext, useReducer, ReactNode, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { apiService } from '../lib/api'
import type {
  Community,
  CommunityMessage,
  CreateCommunityRequest,
  JoinCommunityRequest,
  SendMessageRequest
} from '../types/api'

// Action types
type CommunityAction =
  | { type: 'SET_COMMUNITIES'; payload: Community[] }
  | { type: 'ADD_COMMUNITY'; payload: Community }
  | { type: 'SET_COMMUNITY_MESSAGES'; payload: { communityId: string; messages: CommunityMessage[] } }
  | { type: 'ADD_COMMUNITY_MESSAGE'; payload: { communityId: string; message: CommunityMessage } }

// State interface
interface CommunityState {
  communities: Community[]
  communityMessages: Record<string, CommunityMessage[]>
}

// Initial state
const initialState: CommunityState = {
  communities: [],
  communityMessages: {}
}

// Reducer
function communityReducer(state: CommunityState, action: CommunityAction): CommunityState {
  switch (action.type) {
    case 'SET_COMMUNITIES':
      return {
        ...state,
        communities: action.payload
      }
    case 'ADD_COMMUNITY':
      return {
        ...state,
        communities: [...state.communities, action.payload]
      }
    case 'SET_COMMUNITY_MESSAGES':
      return {
        ...state,
        communityMessages: {
          ...state.communityMessages,
          [action.payload.communityId]: action.payload.messages
        }
      }
    case 'ADD_COMMUNITY_MESSAGE':
      return {
        ...state,
        communityMessages: {
          ...state.communityMessages,
          [action.payload.communityId]: [
            ...(state.communityMessages[action.payload.communityId] || []),
            action.payload.message
          ]
        }
      }
    default:
      return state
  }
}

// Context
interface CommunityContextType {
  state: CommunityState
  createCommunity: (data: CreateCommunityRequest) => Promise<void>
  getCommunities: (searchQuery?: string) => Promise<void>
  joinCommunity: (communityId: string, data: JoinCommunityRequest) => Promise<void>
  getCommunityMembers: (communityId: string) => Promise<any>
  sendCommunityMessage: (communityId: string, data: SendMessageRequest) => Promise<void>
  getCommunityMessages: (communityId: string) => Promise<void>
  getUserCommunities: (userId: string) => Promise<void>
}

const CommunityContext = createContext<CommunityContextType | undefined>(undefined)

// Provider component
export function CommunityProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(communityReducer, initialState)
  const { data: session } = useSession()

  const createCommunity = useCallback(async (data: CreateCommunityRequest) => {
    try {
      const response = await apiService.createCommunity(data) as any
      dispatch({ type: 'ADD_COMMUNITY', payload: response.community })
    } catch (error) {
      console.error('Failed to create community:', error)
    }
  }, [])

  const getCommunities = useCallback(async (searchQuery?: string) => {
    try {
      const response = await apiService.getCommunities(searchQuery) as any
      const allCommunities = response.communities
      const extendedSession = session as any

      if (extendedSession?.dbUser?.id) {
        try {
          const userCommunitiesResponse = await apiService.getUserCommunities(extendedSession.dbUser.id) as any
          const userCommunities = userCommunitiesResponse.communities

          const mergedCommunities = allCommunities.map((community: any) => {
            const userCommunity = userCommunities.find((uc: any) => uc.id === community.id)
            return {
              ...community,
              user_joined_at: userCommunity?.user_joined_at || null,
              user_is_admin: userCommunity?.user_is_admin || false
            }
          })

          dispatch({ type: 'SET_COMMUNITIES', payload: mergedCommunities })
        } catch (userCommunitiesError) {
          console.error('Failed to fetch user communities for merging:', userCommunitiesError)
          dispatch({ type: 'SET_COMMUNITIES', payload: allCommunities })
        }
      } else {
        dispatch({ type: 'SET_COMMUNITIES', payload: allCommunities })
      }
    } catch (error) {
      console.error('Failed to fetch communities:', error)
    }
  }, [session])

  const joinCommunity = useCallback(async (communityId: string, data: JoinCommunityRequest) => {
    try {
      await apiService.joinCommunity(communityId, data)
    } catch (error) {
      console.error('Failed to join community:', error)
    }
  }, [])

  const getCommunityMembers = useCallback(async (communityId: string) => {
    try {
      const response = await apiService.getCommunityMembers(communityId)
      return response
    } catch (error) {
      console.error('Failed to fetch community members:', error)
      throw error
    }
  }, [])

  const sendCommunityMessage = useCallback(async (communityId: string, data: SendMessageRequest) => {
    try {
      // const response = await apiService.sendCommunityMessage(communityId, data) as any
      // dispatch({ type: 'ADD_COMMUNITY_MESSAGE', payload: { communityId, message: response.messages[0] } })
    } catch (error) {
      console.error('Failed to send community message:', error)
    }
  }, [])

  const getCommunityMessages = useCallback(async (communityId: string) => {
    try {
      // const response = await apiService.getCommunityMessages(communityId) as any
      // dispatch({ type: 'SET_COMMUNITY_MESSAGES', payload: { communityId, messages: response.messages } })
    } catch (error) {
      console.error('Failed to fetch community messages:', error)
    }
  }, [])

  const getUserCommunities = useCallback(async (userId: string) => {
    try {
      const response = await apiService.getUserCommunities(userId) as any
      dispatch({ type: 'SET_COMMUNITIES', payload: response.communities })
    } catch (error) {
      console.error('Failed to fetch user communities:', error)
    }
  }, [])

  const value: CommunityContextType = {
    state,
    createCommunity,
    getCommunities,
    joinCommunity,
    getCommunityMembers,
    sendCommunityMessage,
    getCommunityMessages,
    getUserCommunities,
  }

  return (
    <CommunityContext.Provider value={value}>
      {children}
    </CommunityContext.Provider>
  )
}

export function useCommunity() {
  const context = useContext(CommunityContext)
  if (context === undefined) {
    throw new Error('useCommunity must be used within a CommunityProvider')
  }
  return context
}
