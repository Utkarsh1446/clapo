"use client"
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { usePrivy } from '@privy-io/react-auth';
import { useApi } from '../../Context/ApiProvider';
import { MessageCircle, Users, Plus, Search, ChevronDown, Hash, Dot, ArrowLeft, UserPlus, MessageSquare, Eye, Clock, User } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '@/app/hooks/useAuth';
import { MessageList } from '../../components/MessageList';
import { MessageInput } from '../../components/MessageInput';
import { CreateCommunityModal } from '@/app/components/CreateCommunityModal';
import { ConnectionStatus } from '../../components/ConnectionStatus';
import { TabNavigation } from '@/app/components/TabNavigation';
import { CommunitySection } from '@/app/components/CommunitySection';
import { ChatHeader } from '@/app/components/ChatHeader';
import { CommunityMembersSidebar } from '@/app/components/CommunityMembersSidebar';

// Dynamic import for heavy DM component (504 lines)
const DMSection = dynamic(() => import('@/app/components/DMSection').then(mod => ({ default: mod.DMSection })), {
  loading: () => <div className="flex items-center justify-center p-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div></div>,
  ssr: false
});

export default function MessagePage() {
  const { authenticated: privyAuthenticated, user: privyUser, ready: privyReady } = usePrivy();
  const {
    state,
    dispatch,
    getMessageThreads,
    getThreadMessages,
    sendMessage,
    getCommunities,
    getUserCommunities,
    joinCommunity,
    createCommunity,
    getCommunityMessages,
    sendCommunityMessage
  } = useApi();

  // Get auth from centralized Redux store
  const { currentUserId: reduxUserId } = useAuth();
  const currentUserId = reduxUserId;

  const handleStartChatWithUser = async (user: { id: string; username: string }) => {
    if (!currentUserId) {
      console.error('❌ Cannot start chat: currentUserId is not set');
      return;
    }

    console.log('💬 Starting chat with user:', { username: user.username, userId: user.id, currentUserId });

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://server.blazeswap.io/api/snaps';
      const url = `${apiUrl}/messages/direct-thread`;

      console.log('💬 Creating thread via:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId1: currentUserId,
          userId2: user.id
        }),
      })

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Thread creation failed with status:', response.status, errorText);
        return;
      }

      const threadResponse = await response.json()
      console.log('💬 Thread creation response:', threadResponse);

      const thread = threadResponse?.thread || threadResponse?.data?.thread || threadResponse?.data || threadResponse

      if (thread && thread.id) {
        console.log('✅ Thread created/found:', thread.id);
        setSelectedThread(thread.id)
        await getThreadMessages(thread.id)
        await getMessageThreads(currentUserId)
        setDmSection('threads')
        // On mobile, show chat view when a thread is selected
        setMobileView('chat')
        console.log('✅ Chat view activated');
      } else {
        console.error('❌ Thread creation failed - no thread in response:', threadResponse)
      }
    } catch (error) {
      console.error('❌ Failed to start chat with user:', error)
    }
  }

  const [activeTab, setActiveTab] = useState<'dms' | 'communities'>('dms');
  const [dmSection, setDmSection] = useState<'threads' | 'search'>('threads');
  const [communitySection, setCommunitySection] = useState<'my' | 'join' | 'create'>('my');
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [messageContent, setMessageContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateCommunityModal, setShowCreateCommunityModal] = useState(false);
  
  // Mobile view state: 'sidebar' or 'chat'
  const [mobileView, setMobileView] = useState<'sidebar' | 'chat'>('sidebar');

  const [selectedUserProfile, setSelectedUserProfile] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);

  const { socket, isConnected } = useSocket(selectedThread, selectedCommunity);

  const currentThread = state.messageThreads?.find(t => t.id === selectedThread);
  const currentCommunity = state.communities?.find(c => c.id === selectedCommunity);

  const currentMessages = activeTab === 'dms'
    ? (state.threadMessages[selectedThread || ''] || []).map((msg: any) => {
        console.log('🔍 Mapping DM message:', msg);
        return {
          id: msg.id,
          sender_id: msg.sender_id ?? msg.senderId ?? msg.user_id ?? '',
          content: msg.content,
          created_at: msg.created_at ?? msg.createdAt ?? new Date().toISOString(),
          sender_username: msg.sender_username ?? msg.senderUsername ?? msg.username ?? 'Unknown',
          sender_avatar: msg.sender_avatar ?? msg.senderAvatar ?? msg.avatar_url ?? msg.avatar,
          media_url: msg.media_url ?? msg.mediaUrl,
        };
      })
    : (state.communityMessages[selectedCommunity || ''] || []).map((msg: any) => {
        console.log('🔍 Mapping community message:', msg);
        return {
          id: msg.id,
          sender_id: msg.sender_id ?? msg.senderId ?? msg.user_id ?? '',
          content: msg.content,
          created_at: msg.created_at ?? msg.createdAt ?? new Date().toISOString(),
          sender_username: msg.sender_username ?? msg.senderUsername ?? msg.username ?? 'Unknown',
          sender_avatar: msg.sender_avatar ?? msg.senderAvatar ?? msg.avatar_url ?? msg.avatar,
          media_url: msg.media_url ?? msg.mediaUrl,
        };
      });

  console.log('🔍 Final currentMessages:', {
    activeTab,
    selectedThread,
    selectedCommunity,
    rawMessages: activeTab === 'dms' ? state.threadMessages[selectedThread || ''] : state.communityMessages[selectedCommunity || ''],
    mappedMessages: currentMessages,
    count: currentMessages.length
  });

  // Fixed: Using the same logic from ChatHeader to get the other user
  const getOtherUser = (thread: any) => {
    if (!thread || !currentUserId) return null;
    if (thread.isGroup) return null;
    return thread.participants?.find(
      (p: any) => p.user_id !== currentUserId
    );
  };

  // Fixed: Update selected user profile based on current thread or community
  useEffect(() => {
    console.log('🔍 Updating selectedUserProfile:', {
      currentThread,
      participants: currentThread?.participants,
      currentUserId,
      currentCommunity
    });

    if (currentThread && currentThread.participants) {
      const otherUser = currentThread.participants.find(
        (p: any) => p.user_id !== currentUserId && p.user_id !== String(currentUserId)
      );

      console.log('🔍 Found otherUser:', otherUser);

      if (otherUser) {
        const avatarUrl = otherUser.avatar_url || otherUser.avatar || `/api/placeholder/100/100`;
        console.log('🔍 Setting user profile with avatar:', avatarUrl);

        setSelectedUserProfile({
          username: otherUser.username || otherUser.name,
          name: otherUser.name || otherUser.username,
          avatar: avatarUrl,
          bio: otherUser.bio || 'No bio available',
          status: 'online',
          lastSeen: otherUser.lastSeen || 'Recently',
          mutualFollowers: Math.floor(Math.random() * 20) + 1,
          type: 'user'
        });
      } else {
        // Fallback if no other user found
        const firstParticipant = currentThread.participants?.[0];
        console.log('🔍 Using fallback participant:', firstParticipant);

        if (firstParticipant && firstParticipant.user_id !== currentUserId && firstParticipant.user_id !== String(currentUserId)) {
          setSelectedUserProfile({
            username: firstParticipant.username || firstParticipant.name || 'User',
            name: firstParticipant.name || firstParticipant.username || 'User',
            avatar: firstParticipant.avatar_url || firstParticipant.avatar || `https://ui-avatars.com/api/?name=${firstParticipant.username || 'User'}`,
            bio: firstParticipant.bio || 'No bio available',
            status: 'online',
            lastSeen: 'Recently',
            mutualFollowers: Math.floor(Math.random() * 20) + 1,
            type: 'user'
          });
        } else {
          console.log('🔍 No valid participant found, setting null');
          setSelectedUserProfile(null);
        }
      }
    } else if (currentCommunity) {
      console.log('🔍 Setting community profile');
      setSelectedUserProfile({
        username: currentCommunity.name,
        name: currentCommunity.name,
        avatar: currentCommunity.profile_picture_url || currentCommunity.creator_avatar || `https://ui-avatars.com/api/?name=${currentCommunity.name}`,
        bio: currentCommunity.description || 'No description available',
        status: 'community',
        members: currentCommunity.member_count || 0,
        type: 'community',
        createdBy: currentCommunity.creator_username || 'Unknown',
        createdAt: currentCommunity.created_at || 'Recently'
      });
    } else {
      console.log('🔍 No thread or community selected, setting null');
      setSelectedUserProfile(null);
    }
  }, [currentThread, currentCommunity, currentUserId]);

  // Debug logging for messages
  useEffect(() => {
    console.log('🔍 currentMessages debug:', {
      activeTab,
      selectedCommunity,
      selectedThread,
      communityMessagesKeys: Object.keys(state.communityMessages || {}),
      communityMessagesForSelected: state.communityMessages[selectedCommunity || ''],
      currentMessagesLength: currentMessages.length
    });
  }, [activeTab, selectedCommunity, selectedThread, state.communityMessages, currentMessages]);

  useEffect(() => {
    if (currentUserId) {
      getCommunities();
      getMessageThreads(currentUserId);
    }
  }, [currentUserId, getCommunities, getMessageThreads]);

  // Handle navigation from user profile to start a conversation
  useEffect(() => {
    const threadId = sessionStorage.getItem('selectedThreadId');
    if (threadId) {
      setActiveTab('dms');
      setSelectedThread(threadId);
      sessionStorage.removeItem('selectedThreadId'); // Clear after use
    }
  }, [state.messageThreads]);

  const handleSendMessage = async (content: string, mediaUrl?: string) => {
    if (!currentUserId) return;

    if (activeTab === 'dms' && selectedThread) {
      await handleSendDMMessage(content, mediaUrl);
    } else if (activeTab === 'communities' && selectedCommunity) {
      await handleSendCommunityMessage(content, mediaUrl);
    }
  };

  const handleSendDMMessage = async (content: string, mediaUrl?: string) => {
    if (!selectedThread || !currentUserId) {
      console.log('❌ Missing selectedThread or currentUserId:', { selectedThread, currentUserId });
      return;
    }

    console.log('🔍 handleSendDMMessage called:', {
      content,
      mediaUrl,
      threadId: selectedThread,
      hasSocket: !!socket,
      isConnected,
      currentUserId
    });

    try {
      if (socket && isConnected) {
        console.log('📡 Sending via WebSocket');
        (socket as any).emit('send_dm_message', {
          userId: currentUserId,
          content,
          mediaUrl,
          threadId: selectedThread
        }, async (response: { success: boolean; message?: string }) => {
          console.log('📥 WebSocket response:', response);
          if (!response.success) {
            console.log('⚠️ WebSocket failed, falling back to REST API');
            await sendMessage(selectedThread, {
              senderId: currentUserId,
              content,
              mediaUrl
            });
          }
          console.log('🔄 Refreshing messages after WebSocket send');
          await getThreadMessages(selectedThread);
        });
      } else {
        console.log('🌐 Sending via REST API (no WebSocket or not connected)');
        const result = await sendMessage(selectedThread, {
          senderId: currentUserId,
          content,
          mediaUrl
        });
        console.log('✅ Message sent via REST:', result);
        console.log('🔄 Refreshing messages');
        await getThreadMessages(selectedThread);
      }
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      // Refresh messages to ensure consistency
      if (selectedThread) {
        await getThreadMessages(selectedThread);
      }
    }
  };

  const [newCommunityName, setNewCommunityName] = useState('')
  const [newCommunityDescription, setNewCommunityDescription] = useState('')

  const handleCreateCommunity = async () => {
    if (!currentUserId || !newCommunityName.trim() || !newCommunityDescription.trim()) return

    try {
      await createCommunity({
        name: newCommunityName.trim(),
        description: newCommunityDescription.trim(),
        creatorId: currentUserId
      })

      setShowCreateCommunityModal(false)
      setNewCommunityName('')
      setNewCommunityDescription('')
      getCommunities()
    } catch (error) {
      console.error('Failed to create community:', error)
    }
  }

  const handleSendCommunityMessage = async (content: string, mediaUrl?: string) => {
    if (!selectedCommunity || !currentUserId) return;

    console.log('🔍 Sending community message:', { content, mediaUrl, communityId: selectedCommunity, userId: currentUserId });

    try {
      if (isConnected && socket) {
        console.log('🔍 Using WebSocket for real-time message');
        (socket as any).emit('send_community_message', {
          userId: currentUserId,
          content,
          mediaUrl,
          communityId: selectedCommunity
        }, async (response: { success: boolean; message?: string }) => {
          console.log('🔍 WebSocket response:', response);
          if (!response.success) {
            console.log('🔍 Falling back to REST API');
            await sendCommunityMessage(selectedCommunity, {
              senderId: currentUserId,
              content,
              mediaUrl
            });
          }
          await fetchCommunityMessages();
        });
      } else {
        console.log('🔍 Using REST API for message');
        await sendCommunityMessage(selectedCommunity, {
          senderId: currentUserId,
          content,
          mediaUrl
        });
        await fetchCommunityMessages();
      }
      console.log('✅ Community message sent successfully');
    } catch (error) {
      console.error('❌ Failed to send community message:', error);
    }
  };

  const handleJoinCommunity = async (communityId: string) => {
    if (!currentUserId) return

    try {
      await joinCommunity(communityId, { userId: currentUserId })
      getCommunities()
    } catch (error) {
      console.error('Failed to join community:', error)
    }
  }

  const [hasInitializedUsers, setHasInitializedUsers] = useState(false);

  const fetchCommunityMessages = async () => {
    if (!selectedCommunity) return;
    
    try {
      console.log('🔍 Fetching community messages for:', selectedCommunity);
      await getCommunityMessages(selectedCommunity);
      console.log('✅ Community messages fetched successfully');
    } catch (error) {
      console.error('❌ Failed to fetch community messages:', error);
    }
  };

  const handleSelectThread = async (threadId: string) => {
    console.log('🔍 Selecting thread:', threadId);
    console.log('🔍 All threads:', state.messageThreads);
    
    const selectedThreadData = state.messageThreads?.find(t => t.id === threadId);
    console.log('🔍 Selected thread data:', selectedThreadData);
    console.log('🔍 Participants:', selectedThreadData?.participants);
    
    setSelectedThread(threadId);
    await getThreadMessages(threadId);
    // On mobile, show chat view when a thread is selected
    setMobileView('chat');
  };

  const handleSelectCommunity = async (communityId: string) => {
    console.log('🔍 Selecting community:', communityId);
    setSelectedCommunity(communityId);
    if (communityId) {
      console.log('🔍 About to fetch community messages for:', communityId);
      await fetchCommunityMessages();
      // On mobile, show chat view when a community is selected
      setMobileView('chat');
    }
  };

  // Handle back button on mobile
  const handleBackToSidebar = () => {
    setMobileView('sidebar');
    // Optionally clear selections
    // setSelectedThread(null);
    // setSelectedCommunity(null);
  };

  useEffect(() => {
    console.log('🔍 selectedCommunity changed to:', selectedCommunity);
    if (selectedCommunity && activeTab === 'communities') {
      console.log('🔍 Auto-fetching messages for selected community:', selectedCommunity);
      fetchCommunityMessages();
    }
  }, [selectedCommunity, activeTab]);

  // Reset mobile view when no thread/community is selected
  useEffect(() => {
    if (!selectedThread && !selectedCommunity) {
      setMobileView('sidebar');
    }
  }, [selectedThread, selectedCommunity]);

  return (
      <div className="md:static fixed inset-x-0 z-[9999]">
    <div className=" flex">
      {/* Mobile Layout */}
      <div className="md:hidden w-full flex">
        {/* Sidebar View */}
        <div className={`w-full bg-black rounded-xl backdrop-blur-sm flex flex-col transition-transform duration-300 ${
          mobileView === 'chat' ? '-translate-x-full absolute' : 'translate-x-0'
        }`}>
          {/* Header */}
          <div className="p-4 border-b border-slate-700/30">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                Messages
              </h2>
              <ConnectionStatus isConnected={isConnected} />
            </div>
            
            <TabNavigation 
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              // dmSection={dmSection}
              // setDmSection={setDmSection}
              communitySection={communitySection}
              setCommunitySection={setCommunitySection}
              setShowCreateCommunityModal={setShowCreateCommunityModal}
            />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {activeTab === 'dms' ? (
              <DMSection
                state={state}
                selectedThread={selectedThread}
                onSelectThread={handleSelectThread}
                onStartChat={handleStartChatWithUser}
                currentUserId={currentUserId}
              />
            ) : (
              <CommunitySection
                communitySection={communitySection}
                state={state}
                selectedCommunity={selectedCommunity}
                onSelectCommunity={handleSelectCommunity}
                onJoinCommunity={handleJoinCommunity}
              />
            )}
          </div>
        </div>

        {/* Chat View */}
        <div className={`w-full bg-black rounded-xl backdrop-blur-sm flex flex-col transition-transform duration-300 ${
          mobileView === 'sidebar' ? 'translate-x-full absolute' : 'translate-x-0'
        }`}>
          {/* Back Button + Chat Header */}
          <div className="flex items-center p-4 border-b-2 border-gray-700/70">
            <button
              onClick={handleBackToSidebar}
              className="mr-3 p-2 hover:bg-gray-700/30 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-gray-400" />
            </button>
            <div className="flex-1">
              <ChatHeader
                activeTab={activeTab}
                currentThread={currentThread}
                currentCommunity={currentCommunity}
                currentUserId={currentUserId}
              />
            </div>
          </div>

          <MessageList
            messages={currentMessages}
            currentUserId={currentUserId}
          />

          <div className="p-4 absolute bottom-52 bg-black w-full">
            <MessageInput 
              onSend={handleSendMessage}
              disabled={!selectedThread && !selectedCommunity}
            />
          </div>
        </div>
      </div>
     

      {/* Desktop Layout */}
      <div  className="hidden md:flex w-full shadow-2xl overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 flex flex-col border-r-2 border-gray-700/70 pr-2">
          {/* Header */}
          <div className="pt-4">
            <TabNavigation
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              // dmSection={dmSection}
              // setDmSection={setDmSection}
              communitySection={communitySection}
              setCommunitySection={setCommunitySection}
              setShowCreateCommunityModal={setShowCreateCommunityModal}
            />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {activeTab === 'dms' ? (
              <DMSection
                state={state}
                selectedThread={selectedThread}
                onSelectThread={handleSelectThread}
                onStartChat={handleStartChatWithUser}
                currentUserId={currentUserId}
              />
            ) : (
              <CommunitySection
                communitySection={communitySection}
                state={state}
                selectedCommunity={selectedCommunity}
                onSelectCommunity={handleSelectCommunity}
                onJoinCommunity={handleJoinCommunity}
              />
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex w-full pl-4">
         <div className="flex w-full h-screen pt-4 pb-4"> {/* Added top padding to match sidebar */}
  <div className="flex-1 flex flex-col h-full bg-black rounded-2xl border-2 border-gray-700/70 overflow-hidden shadow-2xl">
    <ChatHeader
      activeTab={activeTab}
      currentThread={currentThread}
      currentCommunity={currentCommunity}
      currentUserId={currentUserId}
    />

    <MessageList
      messages={currentMessages}
      currentUserId={currentUserId}
    />

    <div className="px-5 py-3 bg-black border-t-2 border-gray-700/70">
      <MessageInput
        onSend={handleSendMessage}
        disabled={!selectedThread && !selectedCommunity}
      />
    </div>
  </div>
</div>

          {/* Selected Chat Details Sidebar */}
          <div className="hidden lg:block w-[420px] border-l-2 border-gray-700/70 pt-4" style={{ zIndex: 999 }}>
            <div className="p-4">
              {/* Show Community Members if community is selected */}
              {activeTab === 'communities' && selectedCommunity && currentCommunity ? (
                <CommunityMembersSidebar
                  communityId={selectedCommunity}
                  communityData={currentCommunity}
                />
              ) : selectedUserProfile ? (
                <div className="border-2 border-gray-700/70 rounded-2xl p-4">
                  <div className="text-center mb-4">
                    <img
                      src={selectedUserProfile.avatar}
                      alt={selectedUserProfile.name}
                      className="w-16 h-16 rounded-full object-cover mx-auto mb-3"
                      onError={(e) => {
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${selectedUserProfile.username || 'User'}&background=random`;
                      }}
                    />
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {selectedUserProfile.name}
                    </h3>
                    <p className="text-xs text-gray-400 mb-2">
                      @{selectedUserProfile.username}
                    </p>
                    
                    {selectedUserProfile.type === 'community' ? (
                      <div className="space-y-1.5">
                        <div className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full text-xs inline-block">
                          Community
                        </div>
                        <p className="text-xs text-green-400">
                          {selectedUserProfile.members} members
                        </p>
                        <p className="text-xs text-gray-500">
                          Created by @{selectedUserProfile.createdBy}
                        </p>
                        <p className="text-xs text-gray-600">
                          {new Date(selectedUserProfile.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ) : selectedUserProfile.type === 'group' ? (
                      <div className="space-y-2">
                        <div className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm inline-block">
                          Group Chat
                        </div>
                        <p className="text-sm text-green-400">
                          {selectedUserProfile.members} members
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full text-xs inline-block">
                          {selectedUserProfile.status}
                        </div>
                        {selectedUserProfile.mutualFollowers && (
                          <p className="text-xs text-blue-400">
                            {selectedUserProfile.mutualFollowers} mutual followers
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          Last seen: {selectedUserProfile.lastSeen}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="border-t border-gray-700/30 pt-3">
                    <h4 className="text-xs font-medium text-gray-300 mb-2">
                      {selectedUserProfile.type === 'community' ? 'Description' : 'Bio'}
                    </h4>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      {selectedUserProfile.bio}
                    </p>
                  </div>

                  {selectedUserProfile.type === 'community' && (
                    <div className="border-t border-gray-700/30 pt-3 mt-3">
                      <h4 className="text-xs font-medium text-gray-300 mb-2">
                        Community Actions
                      </h4>
                      <div className="space-y-1.5">
                        <button className="w-full bg-[#6E54FF] hover:bg-[#5940CC] text-white text-xs py-1.5 px-3 rounded-lg transition-colors">
                          View Members
                        </button>
                        <button className="w-full bg-gray-700/50 hover:bg-gray-600/50 text-white text-xs py-1.5 px-3 rounded-lg transition-colors">
                          Community Settings
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedUserProfile.type === 'user' && (
                    <div className="border-t border-gray-700/30 pt-3 mt-3">
                      <h4 className="text-xs font-medium text-gray-300 mb-2">
                        User Actions
                      </h4>
                      <div className="space-y-1.5">
                        <button className="w-full bg-[#6E54FF] hover:bg-[#5940CC] text-white text-xs py-1.5 px-3 rounded-lg transition-colors">
                          View Profile
                        </button>
                        <button className="w-full bg-gray-700/50 hover:bg-gray-600/50 text-white text-xs py-1.5 px-3 rounded-lg transition-colors">
                          Block User
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedUserProfile.type === 'group' && (
                    <div className="border-t border-gray-700/50 pt-4 mt-4">
                      <h4 className="text-sm font-semibold text-slate-300 mb-3">
                        Group Actions
                      </h4>
                      <div className="space-y-2">
                        <button className="w-full bg-[#6E54FF] hover:bg-[#5940CC] text-white text-sm py-2 px-4 rounded-lg transition-colors">
                          View Members
                        </button>
                        <button className="w-full bg-slate-700 hover:bg-slate-600 text-white text-sm py-2 px-4 rounded-lg transition-colors">
                          Group Settings
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border border-gray-700/50 rounded-2xl p-4 text-center">
                  <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <h3 className="text-sm font-medium text-gray-400 mb-1">
                    No chat selected
                  </h3>
                  <p className="text-xs text-gray-500">
                    Select a conversation to view details
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <CreateCommunityModal
        show={showCreateCommunityModal}
        onClose={() => setShowCreateCommunityModal(false)}
        creatorId={currentUserId || ''}
        onCreated={handleCreateCommunity}
      />
    </div>
    </div>
  );
}