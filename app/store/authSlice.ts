import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AuthState {
  // Privy auth data
  privyUser: any | null;
  privyAuthenticated: boolean;
  privyReady: boolean;

  // Backend user data
  backendUser: {
    id: string;
    username: string;
    email: string;
    avatar_url?: string;
  } | null;

  // Loading states
  isInitializing: boolean;
  isInitialized: boolean;
}

const initialState: AuthState = {
  privyUser: null,
  privyAuthenticated: false,
  privyReady: false,
  backendUser: null,
  isInitializing: false,
  isInitialized: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setPrivyAuth: (state, action: PayloadAction<{ user: any; authenticated: boolean; ready: boolean }>) => {
      state.privyUser = action.payload.user;
      state.privyAuthenticated = action.payload.authenticated;
      state.privyReady = action.payload.ready;
    },

    setBackendUser: (state, action: PayloadAction<any>) => {
      state.backendUser = action.payload;
    },

    setInitializing: (state, action: PayloadAction<boolean>) => {
      state.isInitializing = action.payload;
    },

    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.isInitialized = action.payload;
    },

    clearAuth: (state) => {
      state.privyUser = null;
      state.privyAuthenticated = false;
      state.backendUser = null;
      state.isInitialized = false;
    },
  },
});

export const {
  setPrivyAuth,
  setBackendUser,
  setInitializing,
  setInitialized,
  clearAuth,
} = authSlice.actions;

export default authSlice.reducer;
