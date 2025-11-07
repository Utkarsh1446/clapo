import {
  SignupRequest,
  SignupResponse,
  LoginRequest,
  LoginResponse,
  ProfileResponse,
  UpdateProfileRequest,
  SearchUsersResponse,
  CreatePostRequest,
  CreatePostResponse,
  FeedResponse,
  ViewPostRequest,
  ViewPostResponse,
  LikePostRequest,
  LikeResponse,
  UnlikeResponse,
  CommentRequest,
  CommentResponse,
  RetweetResponse,
  BookmarkRequest,
  BookmarkResponse,
  FollowRequest,
  FollowResponse,
  UnfollowResponse,
  CreateCommunityRequest,
  JoinCommunityRequest,
  NotificationsResponse,
  ActivityResponse,
  ApiError,
  CommunityMembersResponse,
  EnhancedNotificationsResponse,
  ReputationScore,
  ReputationHistoryResponse,
  GiveRepRequest,
  GiveRepResponse,
} from '../types/api'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://server.blazeswap.io/api/snaps'

class ApiService {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    authToken?: string
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    // Debug logging removed for cleaner console
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        if (typeof value === 'string') {
          headers[key] = value
        }
      })
    }
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }
    
    const config: RequestInit = {
      headers,
      ...options,
    }

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API Error Response:', {
          url,
          status: response.status,
          statusText: response.statusText,
          body: errorText
        })

        let errorData: ApiError
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = {
            message: errorText || `HTTP ${response.status}: ${response.statusText}`,
            status: response.status,
          }
        }

        const errorMessage = errorData.message || errorText || `HTTP error! status: ${response.status}`
        console.error('❌ Parsed error:', errorData)
        throw new Error(errorMessage)
      }

      const responseData = await response.json()
      // Response data logged for debugging
      return responseData
    } catch (error) {
      console.error('❌ Request failed for:', url, error)
      throw error
    }
  }

  async signup(data: SignupRequest): Promise<SignupResponse> {
    try {
      const response = await this.request<SignupResponse>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      return response
    } catch (error) {
      console.error('Signup failed:', error)
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        requestData: data
      })
      throw error
    }
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getUserProfile(userId: string): Promise<ProfileResponse> {
    const response = await this.request<ProfileResponse>(`/users/${userId}/profile/posts`);
    return response;
  }

  async updateUserProfile(userId: string, data: UpdateProfileRequest): Promise<ProfileResponse> {
    return this.request<ProfileResponse>(`/users/${userId}/profile`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async updateUserPassword(userId: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newPassword }),
      });
      return await response.json();
    } catch (error) {
      console.error('Error updating user password:', error);
      throw error;
    }
  }


  async createCommunity(data: CreateCommunityRequest): Promise<unknown> {
    try {
      const response = await this.request('/communities', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      return response
    } catch (error) {
      console.error('Error creating community:', error)
      throw error
    }
  }

  async getCommunities(searchQuery?: string, limit = 20, offset = 0): Promise<unknown> {
    try {
      const queryParams = new URLSearchParams()
      if (searchQuery) queryParams.append('searchQuery', searchQuery)
      queryParams.append('limit', limit.toString())
      queryParams.append('offset', offset.toString())
      
      const response = await this.request(`/communities?${queryParams}`)
      return response
    } catch (error) {
      console.error('Error fetching communities:', error)
      throw error
    }
  }

  async getUserCommunities(userId: string): Promise<unknown> {
    try {
      const response = await this.request(`/users/${userId}/communities`)
      return response
    } catch (error) {
      console.error('Error fetching user communities:', error)
      throw error
    }
  }

  async joinCommunity(communityId: string, data: JoinCommunityRequest): Promise<unknown> {
    try {
      const response = await this.request(`/communities/${communityId}/join`, {
        method: 'POST',
        body: JSON.stringify(data),
      })
      return response
    } catch (error) {
      console.error('Error joining community:', error)
      throw error
    }
  }

  async getCommunityMembers(communityId: string, limit = 50, offset = 0): Promise<CommunityMembersResponse> {
    try {
      const response = await this.request(`/communities/${communityId}/members?limit=${limit}&offset=${offset}`)
      return response as CommunityMembersResponse
    } catch (error) {
      console.error('Error fetching community members:', error)
      throw error
    }
  }


  async searchUsers(query: string, limit: number = 10, offset: number = 0): Promise<SearchUsersResponse> {
    
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
      offset: offset.toString(),
    })
    
    const url = `/users/search?${params}`;
    
    const response = await this.request<SearchUsersResponse>(url);
    
    return response;
  }

  async createPost(data: CreatePostRequest): Promise<CreatePostResponse> {
    return this.request<CreatePostResponse>('/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getPosts(userId: string, limit: number = 50, offset: number = 0): Promise<FeedResponse> {
    const params = new URLSearchParams({
      userId,
      limit: limit.toString(),
      offset: offset.toString(),
    })
    return this.request<FeedResponse>(`/feed/foryou?${params}`)
  }

  async getPersonalizedFeed(userId: string, limit: number = 50, offset: number = 0): Promise<FeedResponse> {
    const params = new URLSearchParams({
      userId,
      limit: limit.toString(),
      offset: offset.toString(),
    })
    return this.request<FeedResponse>(`/feed/foryou?${params}`)
  }

  async viewPost(postId: string, data: ViewPostRequest): Promise<ViewPostResponse> {
    return this.request<ViewPostResponse>(`/posts/${postId}/view`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async likePost(postId: string, data: LikePostRequest): Promise<LikeResponse> {
    return this.request<LikeResponse>(`/posts/${postId}/like`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async unlikePost(postId: string, data: LikePostRequest): Promise<UnlikeResponse> {
    return this.request<UnlikeResponse>(`/posts/${postId}/like`, {
      method: 'DELETE',
      body: JSON.stringify(data),
    })
  }

  async commentOnPost(postId: string, data: CommentRequest): Promise<CommentResponse> {
    return this.request<CommentResponse>(`/posts/${postId}/comment`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getPostComments(postId: string): Promise<CommentResponse[]> {
    return this.request<CommentResponse[]>(`/posts/${postId}/comments`)
  }

  async getPostDetails(postId: string): Promise<any> {
    return this.request<any>(`/posts/${postId}`)
  }

  async retweetPost(postId: string, data: LikePostRequest): Promise<RetweetResponse> {
    return this.request<RetweetResponse>(`/posts/${postId}/retweet`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async bookmarkPost(postId: string, data: BookmarkRequest): Promise<BookmarkResponse> {
    return this.request<BookmarkResponse>(`/posts/${postId}/bookmark`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async unbookmarkPost(postId: string, data: BookmarkRequest): Promise<unknown> {
    try {
      return this.request(`/posts/${postId}/bookmark`, {
        method: 'DELETE',
        body: JSON.stringify(data),
      })
    } catch (error) {
      console.error('❌ Unbookmark API failed, trying alternative approach:', error)
      // Fallback: try POST with unbookmark flag
      return this.request(`/posts/${postId}/bookmark`, {
        method: 'POST',
        body: JSON.stringify({ ...data, action: 'unbookmark' }),
      })
    }
  }



  async followUser(userId: string, data: FollowRequest, authToken?: string): Promise<FollowResponse> {
    return this.request<FollowResponse>(`/users/${userId}/follow`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, authToken)
  }

  async unfollowUser(userId: string, data: FollowRequest, authToken?: string): Promise<UnfollowResponse> {
    return this.request<UnfollowResponse>(`/users/${userId}/follow`, {
      method: 'DELETE',
      body: JSON.stringify(data),
    }, authToken)
  }

  async getNotifications(userId: string, limit: number = 10, offset: number = 0): Promise<NotificationsResponse> {
    const params = new URLSearchParams({
      userId,
      limit: limit.toString(),
      offset: offset.toString(),
    })
    return this.request<NotificationsResponse>(`/notifications?${params}`)
  }

  async getEnhancedNotifications(userId: string, limit: number = 10, offset: number = 0): Promise<EnhancedNotificationsResponse> {
    const params = new URLSearchParams({
      userId,
      limit: limit.toString(),
      offset: offset.toString(),
    })
    return this.request<EnhancedNotificationsResponse>(`/notifications/enhanced?${params}`)
  }

  async getUnreadNotificationCount(userId: string): Promise<{ unreadCount: number }> {
    try {
      const response = await this.request(`/notifications/unread-count?userId=${userId}`)
      return response as { unreadCount: number }
    } catch (error) {
      console.error('Error fetching unread notification count:', error)
      throw error
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<{ notification: any }> {
    try {
      const response = await this.request(`/notifications/${notificationId}/read`, {
        method: 'PUT',
      })
      return response as { notification: any }
    } catch (error) {
      console.error('Error marking notification as read:', error)
      throw error
    }
  }

  async markAllNotificationsAsRead(userId: string): Promise<{ updatedCount: number }> {
    try {
      const response = await this.request(`/notifications/read-all?userId=${userId}`, {
        method: 'PUT',
      })
      return response as { updatedCount: number }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      throw error
    }
  }

  async getActivities(userId: string, limit: number = 10, offset: number = 0): Promise<ActivityResponse> {
    const params = new URLSearchParams({
      userId,
      limit: limit.toString(),
      offset: offset.toString(),
    })
    return this.request<ActivityResponse>(`/activity/recent?${params}`)
  }

  async getRecentActivity(userId: string, limit: number = 10, offset: number = 0): Promise<ActivityResponse> {
    const params = new URLSearchParams({
      userId,
      limit: limit.toString(),
      offset: offset.toString(),
    })
    return this.request<ActivityResponse>(`/activity/recent?${params}`)
  }

  async getUserFollowers(userId: string, limit: number = 50, offset: number = 0): Promise<{ followers: any[] }> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    })
    return this.request<{ followers: any[] }>(`/users/${userId}/followers?${params}`)
  }

  async getUserFollowing(userId: string, limit: number = 50, offset: number = 0): Promise<{ following: any[] }> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    })
    return this.request<{ following: any[] }>(`/users/${userId}/following?${params}`)
  }

  async getFollowingFeed(userId: string, limit: number = 50, offset: number = 0): Promise<FeedResponse> {
    const params = new URLSearchParams({
      userId,
      limit: limit.toString(),
      offset: offset.toString(),
    })
    return this.request<FeedResponse>(`/feed/following?${params}`)
  }

  // Reputation API methods
  async getReputationScore(userId: string): Promise<{ reputation: ReputationScore }> {
    try {
      const response = await this.request(`/reputation/${userId}`)
      return response as { reputation: ReputationScore }
    } catch (error) {
      console.error('Error fetching reputation score:', error)
      throw error
    }
  }

  async getReputationHistory(userId: string, limit: number = 50, offset: number = 0): Promise<ReputationHistoryResponse> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      })
      const response = await this.request(`/reputation/${userId}/history?${params}`)
      return response as ReputationHistoryResponse
    } catch (error) {
      console.error('Error fetching reputation history:', error)
      throw error
    }
  }

  async giveReputation(data: GiveRepRequest): Promise<GiveRepResponse> {
    try {
      const response = await this.request('/reputation/give', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      return response as GiveRepResponse
    } catch (error) {
      console.error('Error giving reputation:', error)
      throw error
    }
  }

  async getReputationLeaderboard(limit: number = 100, offset: number = 0): Promise<{ users: Array<{ user_id: string; username: string; avatar_url: string; score: number; tier: string }> }> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      })
      const response = await this.request(`/reputation/leaderboard?${params}`)
      return response as { users: Array<{ user_id: string; username: string; avatar_url: string; score: number; tier: string }> }
    } catch (error) {
      console.warn('⚠️ Reputation leaderboard not available:', error)
      // Return empty list if endpoint doesn't exist
      return { users: [] }
    }
  }

  // Mention-related API methods
  async getAllUserMentions(userId: string, limit: number = 20, offset: number = 0): Promise<{
    message: string;
    mentions: Array<{
      id: string;
      content_type: 'post' | 'comment' | 'story';
      content_id: string;
      content_text: string;
      mentioned_at: string;
      created_at: string;
      mentioner_username: string;
      mentioner_avatar: string;
      mentioner_id: string;
      original_content: string;
      content_author: string;
      content_created_at: string;
    }>;
  }> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      })
      const response = await this.request(`/users/${userId}/mentions/all?${params}`)
      return response as {
        message: string;
        mentions: Array<{
          id: string;
          content_type: 'post' | 'comment' | 'story';
          content_id: string;
          content_text: string;
          mentioned_at: string;
          created_at: string;
          mentioner_username: string;
          mentioner_avatar: string;
          mentioner_id: string;
          original_content: string;
          content_author: string;
          content_created_at: string;
        }>;
      }
    } catch (error) {
      console.error('Error fetching user mentions:', error)
      throw error
    }
  }

  async getUserMentions(userId: string, limit: number = 20, offset: number = 0): Promise<{
    message: string;
    posts: Array<{
      id: string;
      user_id: string;
      content: string;
      media_url: string;
      created_at: string;
      username: string;
      avatar_url: string;
      view_count: number;
      like_count: number;
      comment_count: number;
      retweet_count: number;
      mentions: Array<{
        user_id: string;
        username: string;
      }>;
    }>;
  }> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      })
      const response = await this.request(`/users/${userId}/mentions?${params}`)
      return response as {
        message: string;
        posts: Array<{
          id: string;
          user_id: string;
          content: string;
          media_url: string;
          created_at: string;
          username: string;
          avatar_url: string;
          view_count: number;
          like_count: number;
          comment_count: number;
          retweet_count: number;
          mentions: Array<{
            user_id: string;
            username: string;
          }>;
        }>;
      }
    } catch (error) {
      console.error('Error fetching user post mentions:', error)
      throw error
    }
  }
}

export const apiService = new ApiService()

export { ApiService }