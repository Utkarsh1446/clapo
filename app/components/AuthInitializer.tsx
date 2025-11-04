"use client";

import { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setPrivyAuth, setBackendUser, setInitializing, setInitialized, clearAuth } from "../store/authSlice";

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const { authenticated, user, ready } = usePrivy();
  const { isInitialized, isInitializing } = useAppSelector((state) => state.auth);

  useEffect(() => {
    // Update Privy auth state immediately when it changes
    dispatch(setPrivyAuth({ user, authenticated, ready }));
  }, [user, authenticated, ready, dispatch]);

  useEffect(() => {
    const initializeBackendUser = async () => {
      // Don't initialize if already done or in progress
      if (isInitialized || isInitializing) {
        return;
      }

      // Wait for Privy to be ready
      if (!ready) {
        return;
      }

      // If not authenticated, clear and mark as initialized
      if (!authenticated || !user) {
        console.log("🔐 Not authenticated, clearing auth state");
        dispatch(clearAuth());
        dispatch(setInitialized(true));
        return;
      }

      // Initialize backend user
      console.log("🔐 Initializing backend user for Privy ID:", user.id);
      dispatch(setInitializing(true));

      try {
        const response = await fetch(`/api/users/privy/${user.id}`);
        const data = await response.json();

        if (data.exists && data.user?.id) {
          console.log("✅ Backend user initialized:", data.user.id);
          dispatch(setBackendUser(data.user));
        } else {
          console.log("⚠️ Backend user not found for Privy ID:", user.id);
          dispatch(setBackendUser(null));
        }
      } catch (error) {
        console.error("❌ Failed to initialize backend user:", error);
        dispatch(setBackendUser(null));
      } finally {
        dispatch(setInitializing(false));
        dispatch(setInitialized(true));
      }
    };

    initializeBackendUser();
  }, [authenticated, user, ready, isInitialized, isInitializing, dispatch]);

  return <>{children}</>;
}
