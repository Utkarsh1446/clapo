"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, User, X } from "lucide-react";
import { apiService } from "@/app/lib/api";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

interface SearchUser {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  follower_count?: number;
  following_count?: number;
}

const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const router = useRouter();

  // Debounced search function
  const searchUsers = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        setHasSearched(false);
        return;
      }

      setIsSearching(true);
      setHasSearched(true);

      try {
        const response = await apiService.searchUsers(query, 20, 0);
        setSearchResults(response.users || []);
      } catch (error) {
        console.error("Error searching users:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    []
  );

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  const handleUserClick = (userId: string) => {
    router.push(`/snaps/profile/${userId}`);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setHasSearched(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6">
      {/* Search Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Search Users</h1>
        <p className="text-gray-400 text-sm">
          Find and connect with people on Clapo
        </p>
      </div>

      {/* Search Input */}
      <div className="relative mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by username..."
            className="w-full bg-gray-800/50 border-2 border-gray-700 rounded-full py-3 pl-12 pr-12 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Search Results */}
      <AnimatePresence mode="wait">
        {isSearching ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-center items-center py-12"
          >
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </motion.div>
        ) : hasSearched ? (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-2"
          >
            {searchResults.length > 0 ? (
              <>
                <p className="text-gray-400 text-sm mb-4">
                  Found {searchResults.length} {searchResults.length === 1 ? 'user' : 'users'}
                </p>
                {searchResults.map((user) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleUserClick(user.id)}
                    className="bg-gray-800/30 border border-gray-700 rounded-xl p-4 cursor-pointer hover:bg-gray-800/50 hover:border-purple-500/50 transition-all duration-200"
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="relative w-12 h-12 flex-shrink-0">
                        {user.avatar_url ? (
                          <Image
                            src={user.avatar_url}
                            alt={user.username}
                            fill
                            className="rounded-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                            <User className="w-6 h-6 text-white" />
                          </div>
                        )}
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold truncate">
                          @{user.username}
                        </p>
                        {user.bio && (
                          <p className="text-gray-400 text-sm truncate">
                            {user.bio}
                          </p>
                        )}
                        {(user.follower_count !== undefined || user.following_count !== undefined) && (
                          <div className="flex gap-3 mt-1 text-xs text-gray-500">
                            {user.follower_count !== undefined && (
                              <span>
                                <span className="font-semibold text-white">
                                  {user.follower_count}
                                </span>{" "}
                                followers
                              </span>
                            )}
                            {user.following_count !== undefined && (
                              <span>
                                <span className="font-semibold text-white">
                                  {user.following_count}
                                </span>{" "}
                                following
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Arrow indicator */}
                      <div className="text-gray-400">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                  <Search className="w-8 h-8 text-gray-500" />
                </div>
                <p className="text-gray-400">No users found</p>
                <p className="text-gray-500 text-sm mt-1">
                  Try searching with a different username
                </p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
              <Search className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-gray-400">Start typing to search for users</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchPage;
