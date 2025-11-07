"use client";

import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, ArrowRight, Check, Mail, AtSign, User, Hash, Users, Sparkles, Wallet, Camera, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';

type FlowState =
  | "initial"
  | "choice"
  | "displayname-username"
  | "topics"
  | "follow"
  | "avatar"
  | "bio"
  | "success";

const topics = [
  "Technology", "Design", "Business", "Art", "Music", 
  "Gaming", "Sports", "Fashion", "Food", "Travel",
  "Science", "Education", "Health", "Finance", "Web3"
];

const suggestedUsers = [
  { username: "alex_dev", name: "Alex Chen", avatar: "👨‍💻", followers: "12.5K" },
  { username: "sarah_design", name: "Sarah Miller", avatar: "🎨", followers: "8.3K" },
  { username: "tech_guru", name: "Mike Johnson", avatar: "🚀", followers: "25.1K" },
  { username: "crypto_queen", name: "Emma Davis", avatar: "💎", followers: "15.7K" }
];

const communityTypes = [
  { id: "open", name: "Open", description: "Anyone can join and post" },
  { id: "closed", name: "Closed", description: "Anyone can join, admin approval for posts" },
  { id: "private", name: "Private", description: "Invite-only community" }
];

function SignInPage() {
  const [flowState, setFlowState] = useState<FlowState>("initial");
  const [accountType, setAccountType] = useState<'individual' | 'community'>('individual');
  const [formData, setFormData] = useState({
    username: "",
    displayName: "",
    topics: [] as string[],
    following: [] as string[],
    avatarFile: null as File | null,
    avatarPreview: "" as string,
    bio: ""
  });
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [checkingExistingUser, setCheckingExistingUser] = useState(false);

  const { login, logout, authenticated, user, ready } = usePrivy();

  // Generate random username from display name
  const generateUsername = (displayName: string) => {
    if (!displayName) return "";
    const baseName = displayName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const randomNum = Math.floor(Math.random() * 10000);
    return `${baseName}${randomNum}`;
  };

  // Update username when display name changes
  useEffect(() => {
    if (flowState === "displayname-username" && formData.displayName) {
      const generatedUsername = generateUsername(formData.displayName);
      setFormData(prev => ({ ...prev, username: generatedUsername }));
    }
  }, [formData.displayName, flowState]);

  // Check username availability with debouncing
  useEffect(() => {
    if (!formData.username || formData.username.length < 3) {
      setUsernameAvailable(null);
      setCheckingUsername(false);
      return;
    }

    setCheckingUsername(true);
    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/users/check-username/${formData.username}`
        );
        const data = await response.json();
        setUsernameAvailable(data.available);
      } catch (error) {
        console.error('Error checking username:', error);
        // If endpoint doesn't exist yet, assume available
        setUsernameAvailable(true);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      setCheckingUsername(false);
    };
  }, [formData.username]);

  // Check if user is new and needs profile completion
  useEffect(() => {
    if (authenticated && user && ready) {
      console.log("🔍 User authenticated:", {
        privyId: user.id,
        email: user.email?.address,
        flowState: flowState,
        ready: ready
      });

      // Only check when on initial screen or success screen
      if (flowState === "initial" || flowState === "success") {
        // Check if user exists in backend
        const checkExistingUser = async () => {
          setCheckingExistingUser(true);
          try {
            console.log("🌐 Checking user in backend:", user.id);
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/users/privy/${user.id}`
            );
            const data = await response.json();
            console.log("📦 Backend response:", data);

            if (data.exists && data.user?.hasCompletedOnboarding) {
              // Existing user - redirect immediately
              console.log("✅ Returning user detected, redirecting immediately...");
              setIsRedirecting(true);
              console.log("🚀 Redirecting now to /snaps");
              window.location.href = '/';
            } else if (flowState === "initial") {
              // New user - show onboarding
              console.log("🆕 New user detected, showing onboarding");
              setCheckingExistingUser(false);
              setFlowState("choice");
            }
          } catch (error) {
            console.error('❌ Error checking user:', error);
            // Fallback to localStorage check if API fails
            const profileKey = `profile_completed_${user.id}`;
            const hasCompletedProfile = localStorage.getItem(profileKey);

            if (hasCompletedProfile) {
              console.log("✅ Returning user detected (localStorage), redirecting...");
              setIsRedirecting(true);
              window.location.href = '/snaps';
            } else if (flowState === "initial") {
              console.log("🆕 New user detected (localStorage), showing onboarding");
              setCheckingExistingUser(false);
              setFlowState("choice");
            }
          }
        };

        checkExistingUser();
      }
    }
  }, [authenticated, user, ready, flowState]);

  const handleBack = () => {
    const backMap: Record<string, FlowState> = {
      "choice": "initial",
      "displayname-username": "choice",
      "topics": "displayname-username",
      "follow": "topics",
      "avatar": "follow",
      "bio": "avatar"
    };
    setFlowState(backMap[flowState] || "initial");
  };

  const handlePrivyLogin = async () => {
    try {
      await login();
    } catch (error) {
      console.error("Privy login error:", error);
    }
  };

  const handlePrivyLogout = async () => {
    try {
      await logout();
      setFlowState("initial");
      setAccountType('individual');
      // Clear all form data
      setFormData({
        username: "",
        displayName: "",
        topics: [],
        following: [],
        avatarFile: null,
        avatarPreview: "",
        bio: ""
      });
    } catch (error) {
      console.error("Privy logout error:", error);
    }
  };

  const toggleTopic = (topic: string) => {
    setFormData(prev => ({
      ...prev,
      topics: prev.topics.includes(topic)
        ? prev.topics.filter(t => t !== topic)
        : [...prev.topics, topic]
    }));
  };

  const toggleFollow = (username: string) => {
    setFormData(prev => ({
      ...prev,
      following: prev.following.includes(username)
        ? prev.following.filter(u => u !== username)
        : [...prev.following, username]
    }));
  };

  // Handle avatar file selection
  const handleAvatarSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be less than 5MB');
        return;
      }

      setFormData(prev => ({ ...prev, avatarFile: file }));

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({ ...prev, avatarPreview: e.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleComplete = async () => {
    if (!user) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Step 1: Upload avatar if provided
      let avatarUrl: string | null = null;
      if (formData.avatarFile) {
        try {
          const formDataUpload = new FormData();
          formDataUpload.append('file', formData.avatarFile);

          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formDataUpload,
          });

          if (uploadResponse.ok) {
            const uploadResult = await uploadResponse.json();
            avatarUrl = uploadResult.url;
            console.log('✅ Avatar uploaded:', avatarUrl);
          }
        } catch (uploadError) {
          console.error('⚠️ Avatar upload failed, continuing without it:', uploadError);
        }
      }

      // Step 2: Prepare complete profile data
      const profileData: any = {
        // Privy Authentication Data
        privyId: user.id,
        email: user.email?.address || null,
        wallet: user.wallet?.address || null,
        phone: user.phone?.number || null,

        // Social Connections
        twitter: user.twitter?.username || null,
        discord: user.discord?.username || null,
        github: user.github?.username || null,
        google: user.google?.email || null,

        // Metadata
        accountType: accountType,

        // User profile fields
        displayName: formData.displayName,
        username: formData.username,
        bio: formData.bio || null,
        topics: formData.topics || [],
        following: formData.following || [],
        ...(avatarUrl && { avatarUrl: avatarUrl })
      };

      console.log("📦 Submitting profile data to API:", profileData);

      // Step 3: Create profile
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/signup/privy`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(profileData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.message?.message || data.message || 'Failed to create account';
        throw new Error(errorMessage);
      }

      // Save minimal data to localStorage for session
      localStorage.setItem(`profile_completed_${user.id}`, 'true');
      localStorage.setItem('latest_user_profile', JSON.stringify(data.user || profileData));

      // Save userId for AuraProvider
      if (data.user?.id) {
        localStorage.setItem('userId', data.user.id);
        console.log('💾 Saved userId to localStorage:', data.user.id);
      }

      console.log("✅ Profile created successfully:", data);
      setFlowState("success");

    } catch (error) {
      console.error("❌ Error creating account:", error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create account. Please try again.';
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Navigate to landing page
    window.location.href = '/';
    // Or if using Next.js router:
    // import { useRouter } from 'next/navigation';
    // const router = useRouter();
    // router.push('/');
  };

  const getStepInfo = () => {
    const stepMap: Record<string, string> = {
      "displayname-username": "Step 1 of 5",
      "topics": "Step 2 of 5",
      "follow": "Step 3 of 5",
      "avatar": "Step 4 of 5",
      "bio": "Final Step"
    };
    return stepMap[flowState] || "";
  };

  const getAuthProviderText = () => {
    if (!user) return "";
    
    if (user.email?.address) return "Email";
    if (user.wallet?.address) return "Wallet";
    if (user.twitter?.username) return "Twitter";
    if (user.discord?.username) return "Discord";
    if (user.github?.username) return "GitHub";
    if (user.phone?.number) return "Phone";
    
    return "Privy";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-black border-2 border-gray-700/70 rounded-xl w-full max-w-5xl shadow-2xl flex overflow-hidden">
          
          {/* Left Side - Illustration/Branding */}
          <div 
            style={{
              backgroundColor: "#6E54FF",
              boxShadow: "0px 1px 0.5px 0px rgba(255, 255, 255, 0.50) inset, 0px 1px 2px 0px rgba(110, 84, 255, 0.50), 0px 0px 0px 1px #6E54FF"
            }} 
            className="hidden lg:flex lg:w-1/2 relative p-12 items-center justify-center bg-gradient-to-br from-[#4F47EB]/20 to-[#3B32C7]/20 border-r-2 border-gray-700/70"
          >
            <div className="relative z-10 text-center">
              <div className="mb-8 text-8xl">🎯</div>
              <h2 className="text-3xl font-bold text-white mb-4">Join, Create & Connect</h2>
              <h1 className="text-4xl font-bold text-white mb-4">Welcome to Clapo</h1>
              <p className="text-gray-300 text-lg leading-relaxed max-w-md">
                {flowState === "choice"
                  ? "Choose your account type and get started"
                  : flowState !== "initial" && flowState !== "success"
                  ? accountType === 'community'
                    ? "Create your community profile"
                    : "Create your personal profile"
                  : "Connect your wallet and social accounts to unlock the full Web3 experience"}
              </p>

              <div className="absolute top-10 left-10 w-20 h-20 bg-[#6E54FF]/20 rounded-full blur-2xl"></div>
              <div className="absolute bottom-10 right-10 w-32 h-32 bg-purple-600/20 rounded-full blur-3xl"></div>
            </div>
          </div>

          {/* Right Side - Dynamic Content */}
          <div className="flex-1 lg:w-1/2 p-8 lg:p-12 relative overflow-y-auto max-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                {flowState !== "initial" && flowState !== "choice" && (
                  <button 
                    onClick={handleBack}
                    className="w-8 h-8 rounded-full bg-gray-700/50 hover:bg-gray-600/50 flex items-center justify-center transition-colors mr-2"
                  >
                    <ArrowLeft className="w-4 h-4 text-gray-400" />
                  </button>
                )}
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center" 
                  style={{
                    backgroundColor: "#6E54FF",
                    boxShadow: "0px 1px 0.5px 0px rgba(255, 255, 255, 0.50) inset, 0px 1px 2px 0px rgba(110, 84, 255, 0.50), 0px 0px 0px 1px #6E54FF"
                  }}
                >
                  {flowState === "success" ? (
                    <Check className="w-5 h-5 text-white" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">
                    {flowState === "initial" ? "Get Started" : 
                     flowState === "choice" ? "Choose Your Path" :
                     flowState === "success" ? "Welcome!" : "Sign Up"}
                  </h3>
                  {getStepInfo() && (
                    <p className="text-sm text-gray-400">{getStepInfo()}</p>
                  )}
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-gray-700/50 hover:bg-gray-600/50 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Dynamic Content Based on Flow State */}
            <div className="flex justify-center items-start min-h-[400px]">
              {/* Initial Screen */}
              {flowState === "initial" && (
                <div className="text-center space-y-6 w-full">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-3">Join Clapo Today</h2>
                    <p className="text-gray-400">Create your account with Privy</p>
                  </div>
                  
                  {/* Privy Auth */}
                  <div className="space-y-3">
                    {authenticated && user ? (
                      <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                              {user.email?.address?.[0]?.toUpperCase() || 
                               user.twitter?.username?.[0]?.toUpperCase() ||
                               user.wallet?.address?.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="text-left">
                              <p className="text-white font-semibold text-sm">
                                {user.email?.address || 
                                 user.twitter?.username ||
                                 `${user.wallet?.address?.slice(0, 6)}...${user.wallet?.address?.slice(-4)}`}
                              </p>
                              <p className="text-gray-400 text-xs">
                                {getAuthProviderText()} Connected
                              </p>
                            </div>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                            <Check className="w-4 h-4 text-green-400" />
                          </div>
                        </div>
                        <button
                          onClick={handlePrivyLogout}
                          className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-full transition-all duration-200 flex items-center justify-center"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Disconnect
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handlePrivyLogin}
                        disabled={!ready}
                        className="w-full px-6 py-4 text-white text-sm font-medium rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: "#6E54FF",
                          boxShadow: "0px 1px 0.5px 0px rgba(255, 255, 255, 0.50) inset, 0px 1px 2px 0px rgba(110, 84, 255, 0.50), 0px 0px 0px 1px #6E54FF"
                        }}
                      >
                        {!ready ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 inline-block"></div>
                            Loading...
                          </>
                        ) : (
                          <>
                            <Wallet className="w-5 h-5 mr-2 inline-block" />
                            Connect with Privy
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {authenticated && user && !checkingExistingUser && (
                    <div className="space-y-4">
                      <button
                        onClick={() => setFlowState("choice")}
                        className="w-full px-6 py-4 text-white text-sm font-medium rounded-full transition-all duration-200"
                        style={{
                          backgroundColor: "#6E54FF",
                          boxShadow: "0px 1px 0.5px 0px rgba(255, 255, 255, 0.50) inset, 0px 1px 2px 0px rgba(110, 84, 255, 0.50), 0px 0px 0px 1px #6E54FF"
                        }}
                      >
                        Continue Setup <ArrowRight className="w-4 h-4 ml-2 inline-block" />
                      </button>

                      <div className="p-4 bg-blue-600/20 border border-blue-600/30 rounded-xl">
                        <p className="text-sm text-blue-300">
                          ✅ Successfully connected! Complete your profile to continue.
                        </p>
                      </div>
                    </div>
                  )}

                  {checkingExistingUser && (
                    <div className="p-4 bg-purple-600/20 border border-purple-600/30 rounded-xl">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                        <p className="text-sm text-purple-300">
                          Checking your account...
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-4 border-t border-gray-700">
                    <p className="text-xs text-gray-400 mb-2">
                      Powered by Privy • Secure & Decentralized
                    </p>
                    <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                      <span>📧 Email</span>
                      <span>•</span>
                      <span>🔗 Wallet</span>
                      <span>•</span>
                      <span>🔐 Social</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Choice Screen */}
              {flowState === "choice" && (
                <div className="space-y-4 w-full">
                  <p className="text-gray-400 text-center mb-6">How would you like to join Clapo?</p>

                  <button
                    onClick={() => {
                      setAccountType('individual');
                      setFlowState("displayname-username");
                    }}
                    className="w-full p-6 bg-gray-700/30 hover:bg-gray-600/30 rounded-xl border border-gray-600/30 transition-all duration-200 text-left"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: "#6E54FF",
                          boxShadow: "0px 1px 0.5px 0px rgba(255, 255, 255, 0.50) inset, 0px 1px 2px 0px rgba(110, 84, 255, 0.50), 0px 0px 0px 1px #6E54FF"
                        }}
                      >
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white mb-2">Join as Individual</h3>
                        <p className="text-gray-400 text-sm">Create a personal account to connect with others</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setAccountType('community');
                      setFlowState("displayname-username");
                    }}
                    className="w-full p-6 bg-gray-700/30 hover:bg-gray-600/30 rounded-xl border border-gray-600/30 transition-all duration-200 text-left"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: "#6E54FF",
                          boxShadow: "0px 1px 0.5px 0px rgba(255, 255, 255, 0.50) inset, 0px 1px 2px 0px rgba(110, 84, 255, 0.50), 0px 0px 0px 1px #6E54FF"
                        }}
                      >
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white mb-2">Create Community</h3>
                        <p className="text-gray-400 text-sm">Build and manage your own community space</p>
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {/* Display Name & Username Flow */}
              {flowState === "displayname-username" && (
                <div className="space-y-6 w-full">
                  <div className="text-center mb-6">
                    <div
                      className="w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center"
                      style={{
                        backgroundColor: "#6E54FF",
                        boxShadow: "0px 1px 0.5px 0px rgba(255, 255, 255, 0.50) inset, 0px 1px 2px 0px rgba(110, 84, 255, 0.50), 0px 0px 0px 1px #6E54FF"
                      }}
                    >
                      <User className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Tell us about yourself</h2>
                    <p className="text-gray-400 text-sm">We'll generate a username based on your display name</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Display Name</label>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      className="w-full px-4 py-3 bg-black border-2 border-gray-700/70 text-white rounded-xl focus:border-[#6E54FF]/50 focus:outline-none transition-all duration-200 placeholder:text-gray-500"
                      placeholder="Enter your display name"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Username</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">@</span>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className={`w-full pl-10 pr-12 py-3 bg-black border-2 text-white rounded-xl focus:outline-none transition-all duration-200 placeholder:text-gray-500 ${
                          formData.username.length >= 3
                            ? usernameAvailable === true
                              ? 'border-green-500/50 focus:border-green-500/70'
                              : usernameAvailable === false
                              ? 'border-red-500/50 focus:border-red-500/70'
                              : 'border-gray-700/70 focus:border-[#6E54FF]/50'
                            : 'border-gray-700/70 focus:border-[#6E54FF]/50'
                        }`}
                        placeholder="username"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        {checkingUsername && (
                          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                        )}
                        {!checkingUsername && usernameAvailable === true && formData.username.length >= 3 && (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        )}
                        {!checkingUsername && usernameAvailable === false && formData.username.length >= 3 && (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </div>
                    {formData.displayName && !checkingUsername && (
                      <p className="text-xs text-gray-500">
                        Auto-generated username. Feel free to edit it.
                      </p>
                    )}
                    {!checkingUsername && usernameAvailable === false && formData.username.length >= 3 && (
                      <p className="text-xs text-red-400">
                        Username is already taken. Please try another.
                      </p>
                    )}
                    {!checkingUsername && usernameAvailable === true && formData.username.length >= 3 && (
                      <p className="text-xs text-green-400">
                        Username is available!
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => setFlowState("topics")}
                    disabled={!formData.displayName || !formData.username || usernameAvailable === false || checkingUsername}
                    className="w-full px-6 py-3 text-white text-sm font-medium rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    style={{
                      backgroundColor: (formData.displayName && formData.username && usernameAvailable !== false && !checkingUsername) ? "#6E54FF" : "#6B7280",
                      boxShadow: (formData.displayName && formData.username && usernameAvailable !== false && !checkingUsername) ? "0px 1px 0.5px 0px rgba(255, 255, 255, 0.50) inset, 0px 1px 2px 0px rgba(110, 84, 255, 0.50), 0px 0px 0px 1px #6E54FF" : "none"
                    }}
                  >
                    {checkingUsername ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        Continue <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Topics Flow */}
              {flowState === "topics" && (
                <div className="space-y-6 w-full">
                  <div className="text-center mb-6">
                    <div 
                      className="w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center" 
                      style={{
                        backgroundColor: "#6E54FF",
                        boxShadow: "0px 1px 0.5px 0px rgba(255, 255, 255, 0.50) inset, 0px 1px 2px 0px rgba(110, 84, 255, 0.50), 0px 0px 0px 1px #6E54FF"
                      }}
                    >
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">What interests you?</h2>
                    <p className="text-gray-400 text-sm">Select at least 3 topics</p>
                  </div>
                  <div className="flex flex-wrap gap-3 max-h-64 overflow-y-auto p-1">
                    {topics.map((topic) => (
                      <button
                        key={topic}
                        onClick={() => toggleTopic(topic)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          formData.topics.includes(topic)
                            ? "text-white"
                            : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 border border-gray-600"
                        }`}
                        style={formData.topics.includes(topic) ? {
                          backgroundColor: "#6E54FF",
                          boxShadow: "0px 1px 0.5px 0px rgba(255, 255, 255, 0.50) inset, 0px 1px 2px 0px rgba(110, 84, 255, 0.50), 0px 0px 0px 1px #6E54FF"
                        } : {}}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                  <div className="text-center text-sm text-gray-400">
                    {formData.topics.length} of 3 selected
                  </div>
                  <button
                    onClick={() => setFlowState("follow")}
                    disabled={formData.topics.length < 3}
                    className="w-full px-6 py-3 text-white text-sm font-medium rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    style={{
                      backgroundColor: formData.topics.length >= 3 ? "#6E54FF" : "#6B7280",
                      boxShadow: formData.topics.length >= 3 ? "0px 1px 0.5px 0px rgba(255, 255, 255, 0.50) inset, 0px 1px 2px 0px rgba(110, 84, 255, 0.50), 0px 0px 0px 1px #6E54FF" : "none"
                    }}
                  >
                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                </div>
              )}

              {/* Follow Flow */}
              {flowState === "follow" && (
                <div className="space-y-6 w-full">
                  <div className="text-center mb-6">
                    <div 
                      className="w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center" 
                      style={{
                        backgroundColor: "#6E54FF",
                        boxShadow: "0px 1px 0.5px 0px rgba(255, 255, 255, 0.50) inset, 0px 1px 2px 0px rgba(110, 84, 255, 0.50), 0px 0px 0px 1px #6E54FF"
                      }}
                    >
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Follow suggested users</h2>
                    <p className="text-gray-400 text-sm">Optional • You can skip this step</p>
                  </div>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {suggestedUsers.map((user) => (
                      <div
                        key={user.username}
                        className="flex items-center justify-between p-4 bg-gray-700/30 border border-gray-600/30 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center text-2xl" 
                            style={{
                              backgroundColor: "#6E54FF",
                              boxShadow: "0px 1px 0.5px 0px rgba(255, 255, 255, 0.50) inset, 0px 1px 2px 0px rgba(110, 84, 255, 0.50), 0px 0px 0px 1px #6E54FF"
                            }}
                          >
                            {user.avatar}
                          </div>
                          <div>
                            <p className="font-semibold text-white text-sm">{user.name}</p>
                            <p className="text-xs text-gray-400">@{user.username} • {user.followers}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleFollow(user.username)}
                          className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                            formData.following.includes(user.username)
                              ? "bg-gray-700 text-white border border-gray-600"
                              : "text-white"
                          }`}
                          style={!formData.following.includes(user.username) ? {
                            backgroundColor: "#6E54FF",
                            boxShadow: "0px 1px 0.5px 0px rgba(255, 255, 255, 0.50) inset, 0px 1px 2px 0px rgba(110, 84, 255, 0.50), 0px 0px 0px 1px #6E54FF"
                          } : {}}
                        >
                          {formData.following.includes(user.username) ? "Following" : "Follow"}
                        </button>
                      </div>
                    ))}
                  </div>
                  {submitError && (
                    <div className="p-4 bg-red-600/20 border border-red-600/50 rounded-xl">
                      <p className="text-sm text-red-300">{submitError}</p>
                    </div>
                  )}
                  <button
                    onClick={() => setFlowState("avatar")}
                    className="w-full px-6 py-3 text-white text-sm font-medium rounded-full transition-all duration-200 flex items-center justify-center"
                    style={{
                      backgroundColor: "#6E54FF",
                      boxShadow: "0px 1px 0.5px 0px rgba(255, 255, 255, 0.50) inset, 0px 1px 2px 0px rgba(110, 84, 255, 0.50), 0px 0px 0px 1px #6E54FF"
                    }}
                  >
                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                </div>
              )}

              {/* Avatar Upload Step */}
              {flowState === "avatar" && (
                <div className="space-y-6 w-full">
                  <div className="text-center mb-6">
                    <div
                      className="w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center"
                      style={{
                        backgroundColor: "#6E54FF",
                        boxShadow: "0px 1px 0.5px 0px rgba(255, 255, 255, 0.50) inset, 0px 1px 2px 0px rgba(110, 84, 255, 0.50), 0px 0px 0px 1px #6E54FF"
                      }}
                    >
                      <Camera className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Add a profile picture</h2>
                    <p className="text-gray-400 text-sm">Optional • You can skip this step</p>
                  </div>

                  <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                      <div
                        className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-700/70 bg-gray-800"
                        style={{
                          boxShadow: "0px 0px 0px 4px rgba(110, 84, 255, 0.2)"
                        }}
                      >
                        {formData.avatarPreview ? (
                          <img
                            src={formData.avatarPreview}
                            alt="Avatar preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                            <User className="w-16 h-16 text-gray-500" />
                          </div>
                        )}
                      </div>
                      <label
                        htmlFor="avatar-upload"
                        className="absolute bottom-0 right-0 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-110"
                        style={{
                          backgroundColor: "#6E54FF",
                          boxShadow: "0px 1px 0.5px 0px rgba(255, 255, 255, 0.50) inset, 0px 1px 2px 0px rgba(110, 84, 255, 0.50), 0px 0px 0px 1px #6E54FF"
                        }}
                      >
                        <Camera className="w-5 h-5 text-white" />
                      </label>
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarSelect}
                        className="hidden"
                      />
                    </div>
                    <p className="text-xs text-gray-400 text-center max-w-xs">
                      Choose an image that represents you (Max 5MB, JPG/PNG)
                    </p>
                  </div>

                  <button
                    onClick={() => setFlowState("bio")}
                    className="w-full px-6 py-3 text-white text-sm font-medium rounded-full transition-all duration-200 flex items-center justify-center"
                    style={{
                      backgroundColor: "#6E54FF",
                      boxShadow: "0px 1px 0.5px 0px rgba(255, 255, 255, 0.50) inset, 0px 1px 2px 0px rgba(110, 84, 255, 0.50), 0px 0px 0px 1px #6E54FF"
                    }}
                  >
                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                  <button
                    onClick={() => setFlowState("bio")}
                    className="w-full px-6 py-3 text-gray-400 text-sm font-medium rounded-full transition-all duration-200 hover:text-white hover:bg-gray-700/30"
                  >
                    Skip for now
                  </button>
                </div>
              )}

              {/* Bio Step */}
              {flowState === "bio" && (
                <div className="space-y-6 w-full">
                  <div className="text-center mb-6">
                    <div
                      className="w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center"
                      style={{
                        backgroundColor: "#6E54FF",
                        boxShadow: "0px 1px 0.5px 0px rgba(255, 255, 255, 0.50) inset, 0px 1px 2px 0px rgba(110, 84, 255, 0.50), 0px 0px 0px 1px #6E54FF"
                      }}
                    >
                      <AtSign className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Write a bio</h2>
                    <p className="text-gray-400 text-sm">Tell people about yourself</p>
                  </div>

                  <div className="space-y-2">
                    <textarea
                      value={formData.bio}
                      onChange={(e) => {
                        if (e.target.value.length <= 160) {
                          setFormData({ ...formData, bio: e.target.value });
                        }
                      }}
                      className="w-full px-4 py-3 bg-black border-2 border-gray-700/70 text-white rounded-xl focus:border-[#6E54FF]/50 focus:outline-none transition-all duration-200 placeholder:text-gray-500 resize-none h-32"
                      placeholder="Share something interesting about yourself..."
                    />
                    <div className="flex justify-between items-center px-2">
                      <p className="text-xs text-gray-500">Optional</p>
                      <p className={`text-xs ${formData.bio.length >= 160 ? 'text-yellow-400' : 'text-gray-500'}`}>
                        {formData.bio.length}/160
                      </p>
                    </div>
                  </div>

                  {submitError && (
                    <div className="p-4 bg-red-600/20 border border-red-600/50 rounded-xl">
                      <p className="text-sm text-red-300">{submitError}</p>
                    </div>
                  )}

                  <button
                    onClick={handleComplete}
                    disabled={isSubmitting}
                    className="w-full px-6 py-3 text-white text-sm font-medium rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    style={{
                      backgroundColor: "#6E54FF",
                      boxShadow: "0px 1px 0.5px 0px rgba(255, 255, 255, 0.50) inset, 0px 1px 2px 0px rgba(110, 84, 255, 0.50), 0px 0px 0px 1px #6E54FF"
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        Complete Setup <Check className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Success Screen */}
              {flowState === "success" && (
                <div className="text-center space-y-6 w-full">
                  {isRedirecting && (
                    <div className="p-4 bg-blue-600/20 border border-blue-600/50 rounded-xl mb-4">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                        <p className="text-sm text-blue-300">Redirecting to home page...</p>
                      </div>
                    </div>
                  )}
                  <div
                    className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: "#10B981",
                      boxShadow: "0px 1px 0.5px 0px rgba(255, 255, 255, 0.50) inset, 0px 1px 2px 0px rgba(16, 185, 129, 0.50), 0px 0px 0px 1px #10B981"
                    }}
                  >
                    <Check className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-3">Welcome to Clapo!</h2>
                    <p className="text-gray-400 text-lg mb-2">
                      @{formData.username}
                    </p>
                    <p className="text-gray-400">
                      You're all set to explore the ecosystem
                    </p>
                  </div>
                  {/* Profile Preview Card */}
                  {formData.avatarPreview && (
                    <div className="flex justify-center mb-4">
                      <img
                        src={formData.avatarPreview}
                        alt="Profile"
                        className="w-24 h-24 rounded-full border-4 border-[#6E54FF]"
                      />
                    </div>
                  )}

                  <div className="p-6 bg-green-600/20 border-2 border-green-600/50 rounded-xl">
                    <p className="text-sm text-green-300 mb-4">
                      🎉 Your {accountType === 'community' ? 'community' : 'account'} has been created successfully!
                    </p>
                    <div className="text-left space-y-2 text-sm text-gray-300">
                      <p>• Account Type: {accountType === 'community' ? 'Community' : 'Individual'}</p>
                      <p>• Display Name: {formData.displayName}</p>
                      {formData.bio && <p>• Bio: {formData.bio}</p>}
                      <p>• Following {formData.following.length} users</p>
                      <p>• Interested in {formData.topics.length} topics</p>
                      {user && (
                        <p>• Connected: {user.email?.address || `${user.wallet?.address?.slice(0, 6)}...${user.wallet?.address?.slice(-4)}`}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      console.log("Profile completed successfully - redirecting to snaps");
                      // Small delay to ensure everything is saved
                      setTimeout(() => {
                        window.location.href = '/snaps';
                      }, 300);
                    }}
                    className="w-full px-6 py-4 text-white text-sm font-medium rounded-full transition-all duration-200 hover:bg-green-600 hover:scale-105 transform transition-transform"
                    style={{
                      backgroundColor: "#10B981",
                      boxShadow: "0px 1px 0.5px 0px rgba(255, 255, 255, 0.50) inset, 0px 1px 2px 0px rgba(16, 185, 129, 0.50), 0px 0px 0px 1px #10B981"
                    }}
                  >
                    Start Exploring →
                  </button>
                  
                  <div className="pt-4 border-t border-gray-700">
                    <p className="text-xs text-gray-400">
                      Profile saved successfully. You can now access all features.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignInPage;