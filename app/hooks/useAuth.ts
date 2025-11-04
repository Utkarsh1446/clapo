import { useAppSelector } from '../store/hooks';

/**
 * Simple hook to get authentication state from Redux store
 * Use this instead of making repeated API calls to /api/users/privy
 */
export function useAuth() {
  const { privyUser, privyAuthenticated, privyReady, backendUser, isInitialized } = useAppSelector(
    (state) => state.auth
  );

  return {
    // Privy auth state
    privyUser,
    privyAuthenticated,
    privyReady,

    // Backend user data
    backendUser,
    currentUserId: backendUser?.id || null,

    // Loading state
    isInitialized,

    // Helper flags
    isAuthenticated: privyAuthenticated && !!backendUser,
  };
}
