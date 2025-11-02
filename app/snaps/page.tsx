/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
"use client";
import { useState, useEffect, Suspense } from "react";
import { useSession, signIn } from "next-auth/react";
import { usePrivy } from "@privy-io/react-auth";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Sidebar from "./Sections/Sidebar";
import { SnapComposer } from "./Sections/SnapComposer";
import SnapCard from "./Sections/SnapCard";
import Image from "next/image";
import ActivityFeed from './Sections/ActivityFeed'
import { mockUsers } from "../lib/mockdata";
import { useApi } from "../Context/ApiProvider";
import { PostSkeleton, LoadingSpinner } from "../components/SkeletonLoader";
import UserActivityFeed from "./Sections/ActivityFeed";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { apiService } from "../lib/api";

// Dynamic imports for heavy components - improves initial load time
const ExplorePage = dynamic(() => import("./SidebarSection/ExplorePage"), {
  loading: () => <LoadingSpinner />,
  ssr: false
});

const ProfilePage = dynamic(() => import("./SidebarSection/ProfilePage").then(mod => ({ default: mod.ProfilePage })), {
  loading: () => <LoadingSpinner />,
  ssr: false
});

const NotificationPage = dynamic(() => import("./SidebarSection/NotificationPage"), {
  loading: () => <LoadingSpinner />,
  ssr: false
});

const MessagePage = dynamic(() => import("./SidebarSection/MessagePage"), {
  loading: () => <LoadingSpinner />,
  ssr: false
});

const BookmarkPage = dynamic(() => import("./SidebarSection/BookmarkPage"), {
  loading: () => <LoadingSpinner />,
  ssr: false
});

const SearchPage = dynamic(() => import("./SidebarSection/SearchPage"), {
  loading: () => <LoadingSpinner />,
  ssr: false
});

const ActivityPage = dynamic(() => import("./SidebarSection/ActivityPage"), {
  loading: () => <LoadingSpinner />,
  ssr: false
});

const InvitePage = dynamic(() => import("./SidebarSection/InvitePage"), {
  loading: () => <LoadingSpinner />,
  ssr: false
});

const SharePage = dynamic(() => import("./SidebarSection/SharePage"), {
  loading: () => <LoadingSpinner />,
  ssr: false
});

const Stories = dynamic(() => import("../components/Story"), {
  loading: () => <LoadingSpinner />,
  ssr: false
});

const Munch = dynamic(() => import("../components/Munch"), {
  loading: () => <LoadingSpinner />,
  ssr: false
});

function SocialFeedPageContent() {
  const [activeTab, setActiveTab] = useState<"FOR YOU" | "FOLLOWING" | "COMMUNITY">(
    "FOR YOU"
  );
  const [currentPage, setCurrentPage] = useState<
    | "home"
    | "explore"
    | "notifications"
    | "likes"
    | "activity"
    | "profile"
    | "messages"
    | "bookmarks"
    | "share"
    | "search"
    | "shares"
    | "invite"
    | "munch"
  >("home");
  const [followingPosts, setFollowingPosts] = useState<any[]>([]);
  const [isLoadingFollowing, setIsLoadingFollowing] = useState(false);
  const [communityPosts, setCommunityPosts] = useState<any[]>([]);
  const [isLoadingCommunity, setIsLoadingCommunity] = useState(false);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [isLoadingTopUsers, setIsLoadingTopUsers] = useState(false);

  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [retweeted, setRetweeted] = useState<Set<number>>(new Set());
  const [bookmarked, setBookmarked] = useState<Set<number>>(new Set());
  const [hasInitializedData, setHasInitializedData] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const { data: session, status } = useSession();
  const { authenticated: privyAuthenticated, user: privyUser, ready: privyReady } = usePrivy();
  const {
    state,
    fetchPosts,
    fetchNotifications,
    fetchActivities,
    getFollowingFeed,
    refreshPosts,
  } = useApi();
  const searchParams = useSearchParams();

  // Handle URL parameters for page state restoration
  useEffect(() => {
    const pageParam = searchParams.get("page");
    if (pageParam) {
      const validPages = [
        "home",
        "explore",
        "notifications",
        "likes",
        "activity",
        "profile",
        "messages",
        "bookmarks",
        "share",
        "search",
        "shares",
        "invite",
        "munch",
      ];
      if (validPages.includes(pageParam as any)) {
        setCurrentPage(pageParam as any);
        // Clear the page parameter from URL after setting the page
        const url = new URL(window.location.href);
        url.searchParams.delete("page");
        window.history.replaceState({}, "", url.toString());

        // Check if we have stored scroll position for this page
        const storedState = sessionStorage.getItem("profileNavigationState");
        if (storedState) {
          try {
            const navigationState = JSON.parse(storedState);
            // Only restore scroll if it's for the same page type
            if (navigationState.searchParams === `page=${pageParam}`) {
              setTimeout(() => {
                if (navigationState.scrollY > 0) {
                  window.scrollTo(0, navigationState.scrollY);
                }
              }, 100);
            }
          } catch (error) {
            console.error(
              "Failed to parse navigation state for scroll restoration:",
              error
            );
          }
        }
      }
    }
  }, [searchParams]);

  // Handle stored target page from profile navigation
  useEffect(() => {
    const targetPage = sessionStorage.getItem("targetPage");
    const targetScrollY = sessionStorage.getItem("targetScrollY");

    if (targetPage) {
      const validPages = [
        "home",
        "explore",
        "notifications",
        "likes",
        "activity",
        "profile",
        "messages",
        "bookmarks",
        "share",
        "search",
        "shares",
        "invite",
        "munch",
      ];
      if (validPages.includes(targetPage as any)) {
        setCurrentPage(targetPage as any);

        // Clear the stored target page
        sessionStorage.removeItem("targetPage");

        // Restore scroll position if available
        if (targetScrollY) {
          const scrollY = parseInt(targetScrollY);
          sessionStorage.removeItem("targetScrollY");
          setTimeout(() => {
            if (scrollY > 0) {
              window.scrollTo(0, scrollY);
            }
          }, 100);
        }
      }
    }
  }, []);

  // Cleanup navigation state when component unmounts
  useEffect(() => {
    return () => {
      // Clear any stored navigation state when leaving the page
      sessionStorage.removeItem("profileNavigationState");
    };
  }, []);

  // Fetch user data from Privy and load posts
  useEffect(() => {
    const initializeData = async () => {
      // Handle NextAuth session
      if (status === "authenticated" && session?.dbUser?.id && !hasInitializedData) {
        console.log("📊 Loading data for NextAuth user:", session.dbUser.id);
        setCurrentUserId(session.dbUser.id);
        fetchPosts(session.dbUser.id);
        fetchNotifications(session.dbUser.id);
        fetchActivities(session.dbUser.id);
        setHasInitializedData(true);
        return;
      }

      // Handle Privy authentication
      if (privyAuthenticated && privyUser && privyReady && !hasInitializedData) {
        console.log("📊 Loading data for Privy user:", privyUser.id);
        try {
          // Fetch user from backend using Privy ID
          const response = await fetch(
            `/api/users/privy/${privyUser.id}`
          );
          const data = await response.json();

          if (data.exists && data.user?.id) {
            console.log("✅ Found user in backend:", data.user.id);
            setCurrentUserId(data.user.id);
            // Save to localStorage for AuraProvider
            localStorage.setItem('userId', data.user.id);
            fetchPosts(data.user.id);
            fetchNotifications(data.user.id);
            fetchActivities(data.user.id);
            setHasInitializedData(true);
          } else {
            console.log("❌ User not found in backend, redirecting to signup");
            window.location.href = '/SignIn';
          }
        } catch (error) {
          console.error("❌ Error fetching Privy user:", error);
        }
        return;
      }

      if (status === "unauthenticated" && !privyAuthenticated) {
        setHasInitializedData(false);
      }
    };

    initializeData();
  }, [session, status, privyAuthenticated, privyUser, privyReady, hasInitializedData]);

  // Removed auto-refresh to prevent NEW posts from disappearing
  // Users can manually refresh when they want to see the latest posts

  const loadFollowingFeed = async () => {
    // Support both NextAuth and Privy users
    const userId = session?.dbUser?.id || currentUserId;
    console.log("🔍 loadFollowingFeed called with userId:", userId, {
      sessionUserId: session?.dbUser?.id,
      currentUserId,
      isLoadingFollowing
    });

    if (!userId || isLoadingFollowing) {
      console.log("❌ Cannot load following feed - no userId or already loading");
      return;
    }

    setIsLoadingFollowing(true);
    try {
      console.log("📡 Fetching following feed for user:", userId);
      const response = await getFollowingFeed(userId, 50, 0);
      console.log("✅ Following feed response:", response);
      setFollowingPosts(response.posts || []);
    } catch (error) {
      console.error("❌ Failed to load following feed:", error);
    } finally {
      setIsLoadingFollowing(false);
    }
  };

  const loadCommunityFeed = async () => {
    const userId = session?.dbUser?.id || currentUserId;
    console.log("🔍 loadCommunityFeed called with userId:", userId);

    if (!userId || isLoadingCommunity) {
      console.log("❌ Cannot load community feed - no userId or already loading");
      return;
    }

    setIsLoadingCommunity(true);
    try {
      console.log("📡 Fetching community feed...");

      // Get all unique user IDs from posts
      const userIds = [...new Set(state.posts.posts.map((post: any) => post.user_id).filter(Boolean))];
      console.log("👥 Found unique user IDs:", userIds.length);

      // Fetch account types for all users (with caching)
      const accountTypes: Record<string, string> = {};
      await Promise.all(
        userIds.map(async (uid: string) => {
          const cacheKey = `account_type_${uid}`;
          const cached = sessionStorage.getItem(cacheKey);

          if (cached) {
            console.log(`📦 Using cached account type for ${uid}:`, cached);
            accountTypes[uid] = cached;
          } else {
            try {
              const url = `${process.env.NEXT_PUBLIC_API_URL}/users/${uid}/profile/posts`;
              console.log(`🌐 Fetching account type from:`, url);
              const response = await fetch(url);
              const data = await response.json();
              console.log(`📥 Response for user ${uid}:`, data);

              if (data.profile?.account_type) {
                accountTypes[uid] = data.profile.account_type;
                sessionStorage.setItem(cacheKey, data.profile.account_type);
                console.log(`✅ Set account type for ${uid}:`, data.profile.account_type);
              } else {
                console.warn(`⚠️ No account_type found for user ${uid}. Profile data:`, data.profile);
              }
            } catch (error) {
              console.error(`❌ Failed to fetch account type for user ${uid}:`, error);
            }
          }
        })
      );

      console.log("✅ All fetched account types:", accountTypes);

      // Filter posts where user's account_type is 'community'
      const filteredPosts = state.posts.posts.filter((post: any) => {
        return accountTypes[post.user_id] === 'community';
      }).sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA; // Sort by newest first
      });

      console.log("🏢 Community posts found:", filteredPosts.length);
      setCommunityPosts(filteredPosts);
    } catch (error) {
      console.error("❌ Failed to load community feed:", error);
    } finally {
      setIsLoadingCommunity(false);
    }
  };

  // Fetch top 5 users by reputation (with fallback to recent users)
  useEffect(() => {
    const fetchTopUsers = async () => {
      setIsLoadingTopUsers(true);
      try {
        // Try to get users from reputation leaderboard first
        try {
          const response = await apiService.getReputationLeaderboard(5, 0);
          console.log('📊 Reputation leaderboard response:', response);

          if (response.users && Array.isArray(response.users) && response.users.length > 0) {
            // Show users immediately with loading state for follower counts (exclude current user)
            const usersWithPlaceholder = response.users
              .filter(user => user.user_id !== currentUserId)
              .map(user => ({
                user_id: user.user_id,
                username: user.username,
                avatar_url: user.avatar_url,
                score: user.score,
                tier: user.tier,
                followers_count: null, // null indicates loading
                isReputationBased: true
              }));
            setTopUsers(usersWithPlaceholder);
            setIsLoadingTopUsers(false);

            // Fetch follower counts in background without blocking
            response.users.forEach(async (user, index) => {
              try {
                const profileResponse = await apiService.getUserProfile(user.user_id);
                const profile = profileResponse.profile as any;
                const followers_count = profile?.followers_count || profile?.followerCount || 0;

                // Update only this user's follower count
                setTopUsers(prev => {
                  const updated = [...prev];
                  if (updated[index]?.user_id === user.user_id) {
                    updated[index] = { ...updated[index], followers_count };
                  }
                  return updated;
                });
              } catch (error) {
                console.warn(`Failed to fetch follower count for ${user.username}:`, error);
                // Set to 0 on error
                setTopUsers(prev => {
                  const updated = [...prev];
                  if (updated[index]?.user_id === user.user_id) {
                    updated[index] = { ...updated[index], followers_count: 0 };
                  }
                  return updated;
                });
              }
            });
            return;
          }
        } catch (reputationError) {
          console.warn('⚠️ Reputation leaderboard not available, using fallback:', reputationError);
        }

        // Fallback: Get recent/active users from search or other endpoint
        console.log('📊 Using fallback: fetching suggested users...');

        // Try to get some users - we'll search for common usernames or get from posts
        const fallbackUsers: any[] = [];

        // If we have posts, extract unique users from them
        if (state.posts.posts.length > 0) {
          const uniqueUsers = new Map();
          state.posts.posts.forEach(post => {
            // Exclude current user from suggestions
            if (post.user_id && post.username && !uniqueUsers.has(post.user_id) && post.user_id !== currentUserId) {
              uniqueUsers.set(post.user_id, {
                user_id: post.user_id,
                username: post.username,
                avatar_url: post.avatar_url,
                followers_count: null,
                isReputationBased: false
              });
            }
          });

          // Take first 5 unique users
          const usersArray = Array.from(uniqueUsers.values()).slice(0, 5);
          setTopUsers(usersArray);
          setIsLoadingTopUsers(false);

          // Fetch follower counts in background
          usersArray.forEach(async (user, index) => {
            try {
              const profileResponse = await apiService.getUserProfile(user.user_id);
              const profile = profileResponse.profile as any;
              const followers_count = profile?.followers_count || profile?.followerCount || 0;

              setTopUsers(prev => {
                const updated = [...prev];
                if (updated[index]?.user_id === user.user_id) {
                  updated[index] = { ...updated[index], followers_count };
                }
                return updated;
              });
            } catch (error) {
              console.warn(`Failed to fetch follower count for ${user.username}:`, error);
              setTopUsers(prev => {
                const updated = [...prev];
                if (updated[index]?.user_id === user.user_id) {
                  updated[index] = { ...updated[index], followers_count: 0 };
                }
                return updated;
              });
            }
          });
        } else {
          setIsLoadingTopUsers(false);
        }

      } catch (error) {
        console.error("❌ Failed to load users:", error);
        setTopUsers([]);
        setIsLoadingTopUsers(false);
      }
    };

    fetchTopUsers();
  }, [state.posts.posts]);

  const handleTabChange = (tab: "FOR YOU" | "FOLLOWING" | "COMMUNITY") => {
    setActiveTab(tab);
    if (tab === "FOLLOWING") {
      loadFollowingFeed();
    } else if (tab === "COMMUNITY") {
      loadCommunityFeed();
    }
  };

  const handleNavigateToOpinio = () => {
    window.location.href = '/opinio';
  };

  const handleNavigateToSnaps = () => {
    setCurrentPage('home');
  };

  const toggleSet = (set: Set<number>, id: number): Set<number> => {
    const newSet = new Set(set);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    return newSet;
  };

  const allPosts = [...state.posts.posts].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return dateB - dateA; // Sort by newest first
  });

  const renderContent = () => {
    switch (currentPage) {
      case "munch":
        return <div className="w-full mx-auto">
          <Munch />
        </div>
      case "explore":
        return <div className="w-full  mt-6">
          <ExplorePage/>
        </div>
      case "notifications":
        return <div className="w-full max-w-3xl mx-auto mt-6 "> <NotificationPage/></div>
      case "likes":
        return allPosts.length > 0 ? (
          <SnapCard
            post={allPosts[0]}
            liked={liked.has(parseInt(allPosts[0].id))}
            bookmarked={bookmarked.has(parseInt(allPosts[0].id))}
            retweeted={retweeted.has(parseInt(allPosts[0].id))}
            onLike={(id) =>
              setLiked(
                toggleSet(liked, typeof id === "string" ? parseInt(id) : id)
              )
            }
            onBookmark={(id) =>
              setBookmarked(
                toggleSet(
                  bookmarked,
                  typeof id === "string" ? parseInt(id) : id
                )
              )
            }
            onRetweet={(id) =>
              setRetweeted(
                toggleSet(retweeted, typeof id === "string" ? parseInt(id) : id)
              )
            }
          />
        ) : (
          <div className="text-center py-8 text-gray-500">
            No posts available
          </div>
        );
      case "bookmarks":
        return <div className="w-full max-w-3xl mx-auto mt-6 ">
          <BookmarkPage />
        </div>;
      case "activity":
        return <div className="w-full max-w-3xl mx-auto mt-6 ">
          <ActivityPage />
        </div>;
      case "profile":
        return <div className="w-full max-w-3xl mx-auto  mt-6">
          <ProfilePage user={mockUsers[0]} posts={[]} />{" "}
        </div>;
      case "search":
        return <div className="w-full max-w-3xl mx-auto  mt-6">
          <SearchPage />
        </div>;
      case "share":
        return <div className="w-full mt-6">
          <SharePage />
        </div>;
      case "messages":
        return (
          <div className="w-full">
            <MessagePage />
          </div>
        );
      case "invite":
        return (
          <div className="w-full max-w-3xl mx-auto  mt-6">
            <InvitePage />
          </div>
        );
      case "home":
      default:
        return (
          <div className="max-w-2xl mx-auto px-2 sm:px-0 mt-14 md:mt-0">
            <div className="relative">
              {/* Subtle background gradient */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/5 to-transparent pointer-events-none" />
              <div className="relative z-10">
                <Stories />
                {/* <SnapComposer /> */}
   <div className="bg-gray-700/50 rounded-full mb-4 p-0.5 ">
      <div>
        <div
        
          className="flex justify-around bg-black m-0.5 p-1 items-center rounded-full relative"
        >
          {["FOR YOU", "FOLLOWING","COMMUNITY"].map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`p-2 my-1 font-semibold w-full relative z-10 text-xs sm:text-sm ${
                activeTab === tab ? "text-white" : "text-gray-400"
              }`}
            >
              {tab}
            </button>
          ))}

    <motion.div
  className="absolute rounded-full"
  style={{
    height: "40px",
    boxShadow:
      "0px 1px 0.5px 0px rgba(255, 255, 255, 0.50) inset, 0px 1px 2px 0px rgba(110, 84, 255, 0.50), 0px 0px 0px 1px #6E54FF",
    backgroundColor: "#6E54FF",
    margin: "6px",
  }}
  initial={false}
  animate={{
    left:
      activeTab === "FOR YOU"
        ? "0%"
        : activeTab === "FOLLOWING"
        ? "calc(33% + 0px)"
        : "calc(66% + 0px)",
    width: "calc(33% - 6px)",
  }}
  transition={{ type: "spring", stiffness: 400, damping: 30 }}
/>

        </div>
      </div>
    </div>
            <div className="mt-4 pt-4">
              <div className="mt-2">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: activeTab === "FOR YOU" ? 0 : 0 }}
                    animate={{ opacity: 1, x: 0, y: -30 }}
                    exit={{ opacity: 0, x: activeTab === "FOR YOU" ? 40 : -40 }}
                    transition={{ duration: 0.35, ease: "easeInOut" }}
                  >
                    {activeTab === "FOR YOU" ? (
                      state.posts.loading ? (
                        <div className="space-y-4">
                          {[...Array(3)].map((_, i) => (
                            <PostSkeleton key={i} />
                          ))}
                        </div>
                      ) : allPosts.length > 0 ? (
                        allPosts.map((post) => (
                          <SnapCard
                            key={post.id}
                            post={post}
                            liked={liked.has(parseInt(post.id))}
                            bookmarked={bookmarked.has(parseInt(post.id))}
                            retweeted={retweeted.has(parseInt(post.id))}
                            onLike={(id) =>
                              setLiked(
                                toggleSet(
                                  liked,
                                  typeof id === "string" ? parseInt(id) : id
                                )
                              )
                            }
                            onBookmark={(id) =>
                              setBookmarked(
                                toggleSet(
                                  bookmarked,
                                  typeof id === "string" ? parseInt(id) : id
                                )
                              )
                            }
                            onRetweet={(id) =>
                              setRetweeted(
                                toggleSet(
                                  retweeted,
                                  typeof id === "string" ? parseInt(id) : id
                                )
                              )
                            }
                          />
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          {status === "authenticated" ? (
                            <div>
                              {[...Array(3)].map((_, i) => (
                                <PostSkeleton key={i} />
                              ))}
                            </div>
                          ) : (
                            "Sign in to see posts"
                          )}
                        </div>
                      )
                    ) : activeTab === "FOLLOWING" ? (
                      isLoadingFollowing ? (
                        <div className="space-y-4">
                          {[...Array(3)].map((_, i) => (
                            <PostSkeleton key={i} />
                          ))}
                        </div>
                      ) : followingPosts.length > 0 ? (
                        followingPosts.map((post) => (
                          <SnapCard
                            key={post.id}
                            post={post}
                            liked={liked.has(parseInt(post.id))}
                            bookmarked={bookmarked.has(parseInt(post.id))}
                            retweeted={retweeted.has(parseInt(post.id))}
                            onLike={(id) =>
                              setLiked(
                                toggleSet(
                                  liked,
                                  typeof id === "string" ? parseInt(id) : id
                                )
                              )
                            }
                            onBookmark={(id) =>
                              setBookmarked(
                                toggleSet(
                                  bookmarked,
                                  typeof id === "string" ? parseInt(id) : id
                                )
                              )
                            }
                            onRetweet={(id) =>
                              setRetweeted(
                                toggleSet(
                                  retweeted,
                                  typeof id === "string" ? parseInt(id) : id
                                )
                              )
                            }
                          />
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          {(status === "authenticated" || privyAuthenticated)
                            ? "No posts from people you follow yet. Try following some users!"
                            : "Sign in to see posts"}
                        </div>
                      )
                    ) : activeTab === "COMMUNITY" ? (
                      isLoadingCommunity ? (
                        <div className="space-y-4">
                          {[...Array(3)].map((_, i) => (
                            <PostSkeleton key={i} />
                          ))}
                        </div>
                      ) : communityPosts.length > 0 ? (
                        communityPosts.map((post) => (
                          <SnapCard
                            key={post.id}
                            post={post}
                            liked={liked.has(parseInt(post.id))}
                            bookmarked={bookmarked.has(parseInt(post.id))}
                            retweeted={retweeted.has(parseInt(post.id))}
                            onLike={(id) =>
                              setLiked(
                                toggleSet(
                                  liked,
                                  typeof id === "string" ? parseInt(id) : id
                                )
                              )
                            }
                            onBookmark={(id) =>
                              setBookmarked(
                                toggleSet(
                                  bookmarked,
                                  typeof id === "string" ? parseInt(id) : id
                                )
                              )
                            }
                            onRetweet={(id) =>
                              setRetweeted(
                                toggleSet(
                                  retweeted,
                                  typeof id === "string" ? parseInt(id) : id
                                )
                              )
                            }
                          />
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          {(status === "authenticated" || privyAuthenticated)
                            ? "No community posts yet. Community accounts will appear here!"
                            : "Sign in to see posts"}
                        </div>
                      )
                    ) : null}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
              </div>
            </div>
          </div>
        );
    }
  };

  if (status === "loading" || !privyReady) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="w-12 h-12" />
      </div>
    );
  }

  // Check authentication: Either NextAuth OR Privy
  const isAuthenticated = (status === "authenticated" && session?.dbUser) || privyAuthenticated;

  // Don't render main content if user is not authenticated
  if (!isAuthenticated) {
    console.log("🔍 Auth state:", {
      nextAuthStatus: status,
      hasNextAuthSession: !!session,
      hasDbUser: !!session?.dbUser,
      privyAuthenticated,
      privyReady,
      hasPrivyUser: !!privyUser
    });

    // Redirect to SignIn page for Privy authentication
    console.log("🚀 Redirecting unauthenticated user to /SignIn");
    if (typeof window !== 'undefined') {
      window.location.href = '/SignIn';
    }

    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="w-12 h-12" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="flex text-white mx-auto relative">
        {/* Ambient background effects */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-20 left-20 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-600/5 rounded-full blur-2xl" />
        </div>
        {/* Left Sidebar - Fixed width on desktop, hidden on mobile */}
        <div className="hidden lg:block">
          <Sidebar 
            currentPage={currentPage} 
            setCurrentPage={setCurrentPage}
            onNavigateToOpinio={handleNavigateToOpinio}
            onNavigateToSnaps={handleNavigateToSnaps}
          />
        </div>

        {/* Mobile Sidebar - Only visible on mobile */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
          <Sidebar 
            currentPage={currentPage} 
            setCurrentPage={setCurrentPage}
            onNavigateToOpinio={handleNavigateToOpinio}
            onNavigateToSnaps={handleNavigateToSnaps}
          />
        </div>

        {/* Main Content - Flexible center with mobile padding */}
        <div className="flex-1 pt-20 md:pt-0 px-2 sm:px-4 pb-20 lg:pb-4">
          <div className="">{renderContent()}</div>
        </div>

        {/* Right Sidebar - Only visible at 2xl breakpoint */}
        {currentPage !== "messages" && currentPage !== "share" && currentPage !=="explore" && currentPage !== "munch" && (session?.dbUser || currentUserId) && (
          <div
            className="hidden md:block lg:block xl:block 2xl:block w-[340px] h-screen sticky top-0"

          >
            <div className="p-6">
              {/* Recent Activity */}
              <div className="h-80 overflow-hidden flex flex-col justify-center items-start
                           bg-black border-2 border-gray-700/70 rounded-2xl mb-6
                           shadow-xl shadow-black/20 backdrop-blur-sm
                           hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300">
                <span className="bg-gray-700/30 border-2 border-[#6e54ff] rounded-2xl px-3 py-1 mt-3 mx-3
                              text-xs font-medium text-gray-200">
                  Recent Activity
                </span>
                <UserActivityFeed userId={session?.dbUser?.id || currentUserId} />
              </div>

              {/* Invite Button */}
              <button
  onClick={() => setCurrentPage('invite')}
  className="w-full rounded-3xl bg-[#1A1A1A] border-2 border-[#6E54FF] hover:bg-[#2A2A2A] transition-all duration-200 overflow-hidden mb-6 p-4 h-28"
>
  <Image
    src="/invite_clean.svg"
    alt="Invite"
    width={450}
    height={160}
    className="w-full h-full object-contain scale-110"
  />
</button>


              {/* Followers Suggestions */}
              <div className="h-80 flex flex-col justify-start items-start
                           bg-black border-2 border-gray-700/70 rounded-2xl mb-6
                           shadow-xl shadow-black/20 backdrop-blur-sm
                           hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300">
                <span className="bg-gray-700/30 border-2 border-[#6e54ff] rounded-2xl px-3 py-1 mt-3 mx-3
                              text-xs font-medium text-gray-200">
                  Followers Suggestions
                </span>

                {/* Top Users by Reputation */}
                <div className="flex-1 w-full p-3 overflow-y-auto">
                  {isLoadingTopUsers ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-2 animate-pulse">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gray-700"></div>
                            <div className="flex flex-col space-y-2">
                              <div className="h-3 w-20 bg-gray-700 rounded"></div>
                              <div className="h-2 w-16 bg-gray-700 rounded"></div>
                            </div>
                          </div>
                          <div className="h-8 w-16 bg-gray-700 rounded-lg"></div>
                        </div>
                      ))}
                    </div>
                  ) : topUsers.length > 0 ? (
                    <div className="space-y-3">
                      {topUsers.map((user, index) => (
                        <div key={user.user_id} className="flex items-center justify-between p-2 hover:bg-gray-700/20 rounded-lg transition-colors">
                          <div className="flex items-center space-x-3">
                            <div className="relative">
                              <img
                                src={user.avatar_url || `https://robohash.org/${user.username}.png?size=100x100`}
                                alt={user.username}
                                className="w-10 h-10 rounded-full object-cover border border-gray-600/30"
                              />
                              {user.isReputationBased && index < 3 && (
                                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                                  {index + 1}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-white">{user.username}</span>
                              <span className="text-xs text-gray-400">
                                {user.followers_count === null ? (
                                  <span className="animate-pulse">Loading...</span>
                                ) : (
                                  `${user.followers_count || 0} ${user.followers_count === 1 ? 'follower' : 'followers'}`
                                )}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              // Navigate to user profile
                              window.location.href = `/snaps/profile/${user.user_id}`;
                            }}
                            className="bg-[#6e54ff] hover:bg-[#5940cc] text-white text-xs px-3 py-1 rounded-lg transition-colors"
                          >
                            View
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      <p className="mb-2">Unable to load top users</p>
                      <p className="text-xs">Check console for details</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function SocialFeedPage() {
  return (
    <Suspense fallback={<LoadingSpinner size="w-12 h-12" />}>
      <SocialFeedPageContent />
    </Suspense>
  );
}