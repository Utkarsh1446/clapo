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
import { AuraBalance } from "../components/Aura/AuraBalance";
import { useAuth } from "../hooks/useAuth";

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

// MUNCH COMMENTED OUT - Not in use
// const Munch = dynamic(() => import("../components/Munch"), {
//   loading: () => <LoadingSpinner />,
//   ssr: false
// });

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
    // | "munch"  // MUNCH COMMENTED OUT - Not in use
  >("home");
  const [followingPosts, setFollowingPosts] = useState<any[]>([]);
  const [isLoadingFollowing, setIsLoadingFollowing] = useState(false);
  const [communityPosts, setCommunityPosts] = useState<any[]>([]);
  const [isLoadingCommunity, setIsLoadingCommunity] = useState(false);

  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [retweeted, setRetweeted] = useState<Set<number>>(new Set());
  const [bookmarked, setBookmarked] = useState<Set<number>>(new Set());
  const [hasInitializedData, setHasInitializedData] = useState(false);

  // Infinite scroll state
  const [displayedPosts, setDisplayedPosts] = useState<any[]>([]);
  const [postsToShow, setPostsToShow] = useState(10); // Start with 10 posts
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const { data: session, status } = useSession();
  const { authenticated: privyAuthenticated, user: privyUser, ready: privyReady } = usePrivy();

  // Get auth from centralized Redux store
  const { currentUserId: reduxUserId, isInitialized, privyReady: reduxPrivyReady, privyAuthenticated: reduxPrivyAuthenticated } = useAuth();

  // Support both NextAuth (legacy) and Privy auth
  const currentUserId = status === "authenticated" && session?.dbUser?.id
    ? session.dbUser.id
    : reduxUserId;
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
        // "munch",  // MUNCH COMMENTED OUT - Not in use
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
        // "munch",  // MUNCH COMMENTED OUT - Not in use
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

      // Wait for Redux auth to initialize before making decisions
      if (!isInitialized) {
        console.log("⏳ Waiting for auth to initialize...");
        return;
      }

      // Handle Privy authentication - use Redux store
      if (privyAuthenticated && privyReady && reduxUserId && !hasInitializedData) {
        console.log("📊 Loading data from Redux for user:", reduxUserId);
        // Save to localStorage for AuraProvider
        localStorage.setItem('userId', reduxUserId);
        fetchPosts(reduxUserId);
        fetchNotifications(reduxUserId);
        fetchActivities(reduxUserId);
        setHasInitializedData(true);
        return;
      }

      // Only redirect if auth is fully initialized and user is truly not found
      if (isInitialized && privyAuthenticated && privyReady && !reduxUserId) {
        console.log("❌ User not found in backend, redirecting to signup");
        window.location.href = '/SignIn';
        return;
      }

      if (status === "unauthenticated" && !privyAuthenticated && isInitialized) {
        setHasInitializedData(false);
      }
    };

    initializeData();
  }, [session, status, privyAuthenticated, privyUser, privyReady, hasInitializedData, isInitialized, reduxUserId]);

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

  // Update displayed posts when all posts change or postsToShow changes
  useEffect(() => {
    if (allPosts.length > 0) {
      setDisplayedPosts(allPosts.slice(0, postsToShow));
    }
  }, [allPosts.length, postsToShow]);

  // Infinite scroll handler
  useEffect(() => {
    if (currentPage !== "home" || activeTab !== "FOR YOU") return;

    const handleScroll = () => {
      // Check if user is near bottom (within 300px)
      const scrollPosition = window.innerHeight + window.scrollY;
      const bottomPosition = document.documentElement.offsetHeight - 300;

      if (scrollPosition >= bottomPosition && !isLoadingMore && displayedPosts.length < allPosts.length) {
        setIsLoadingMore(true);
        // Load 5 more posts at a time
        setTimeout(() => {
          setPostsToShow(prev => Math.min(prev + 5, allPosts.length));
          setIsLoadingMore(false);
        }, 300); // Small delay for smooth UX
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentPage, activeTab, isLoadingMore, displayedPosts.length, allPosts.length]);

  const renderContent = () => {
    switch (currentPage) {
      // MUNCH COMMENTED OUT - Not in use
      // case "munch":
      //   return <div className="w-full mx-auto">
      //     <Munch />
      //   </div>
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
          <div className="max-w-2xl mx-auto px-2 sm:px-0 mt-0 md:mt-0">
            <div className="relative">
              {/* Subtle background gradient */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/5 to-transparent pointer-events-none" />
              <div className="relative z-10">
                <Stories />
                {/* <SnapComposer /> */}
   <div className="bg-gray-700/50 rounded-full mb-4 p-0.5 ">
      <div>
        <div

          className="flex justify-around gap-0.5 sm:gap-1 bg-black p-0.5 sm:p-1 items-center rounded-full relative overflow-x-auto"
        >
          {["FOR YOU", "FOLLOWING","COMMUNITY"].map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`px-2 sm:px-4 py-1 sm:py-2 my-1 font-semibold w-full relative z-10 text-xs sm:text-sm whitespace-nowrap flex-shrink-0 ${
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
                      ) : displayedPosts.length > 0 ? (
                        <>
                          {displayedPosts.map((post) => (
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
                          ))}
                          {/* Loading indicator for infinite scroll */}
                          {isLoadingMore && (
                            <div className="py-4 text-center">
                              <LoadingSpinner size="w-6 h-6" />
                            </div>
                          )}
                          {/* End of feed indicator */}
                          {displayedPosts.length >= allPosts.length && allPosts.length > 0 && (
                            <div className="py-8 text-center text-gray-500 text-sm">
                              You've reached the end
                            </div>
                          )}
                        </>
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

  // Show loading while auth is initializing
  if (status === "loading" || !privyReady || !isInitialized) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="w-12 h-12" />
      </div>
    );
  }

  // Check authentication: Either NextAuth OR Privy with backend user
  const isAuthenticated = (status === "authenticated" && session?.dbUser) || (privyAuthenticated && reduxUserId);

  // Don't render main content if user is not authenticated
  if (!isAuthenticated) {
    console.log("🔍 Auth state:", {
      nextAuthStatus: status,
      hasNextAuthSession: !!session,
      hasDbUser: !!session?.dbUser,
      privyAuthenticated,
      privyReady,
      hasPrivyUser: !!privyUser,
      reduxUserId,
      isInitialized
    });

    // Only redirect if truly not authenticated (auth is initialized and no user found)
    if (isInitialized) {
      console.log("🚀 Redirecting unauthenticated user to /SignIn");
      if (typeof window !== 'undefined') {
        window.location.href = '/SignIn';
      }
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
        <div className="flex-1 pt-4 md:pt-0 px-2 sm:px-4 pb-20 sm:pb-16 lg:pb-4">
          <div className="">{renderContent()}</div>
        </div>

        {/* Right Sidebar - Only visible on desktop (lg+) */}
        {currentPage !== "messages" && currentPage !== "share" && currentPage !=="explore" /* && currentPage !== "munch" */ && (session?.dbUser || currentUserId) && (
          <div
            className="hidden lg:block w-[340px] h-screen sticky top-0"

          >
            <div className="p-6">
              {/* Aura Balance */}
              <div className="h-80 overflow-hidden flex flex-col justify-start items-start
                           bg-black border-2 border-gray-700/70 rounded-2xl mb-6
                           shadow-xl shadow-black/20 backdrop-blur-sm
                           hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300">
                <span className="bg-gray-700/30 border-2 border-[#6e54ff] rounded-2xl px-3 py-1 mt-3 mx-3
                              text-xs font-medium text-gray-200">
                  Your Aura
                </span>
                <div className="w-full p-4">
                  <AuraBalance showDetails />
                </div>
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