"use client";
import { Home, Bell, User, MessageCircle, Activity, Blocks, TrendingUp, Telescope, Wallet, Lock, Settings, LogOut, PersonStandingIcon, AtSign, Film, Search } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useWalletContext } from "@/context/WalletContext";
import { usePrivy } from "@privy-io/react-auth";
import { SnapComposer } from "./SnapComposer";
import AccountInfo from "@/app/components/AccountInfo";
import { AuraBalance } from "@/app/components/Aura/AuraBalance";

// Dynamic import for SignIn page (1,117 lines) - improves initial load
const SignInPage = dynamic(() => import("@/app/SignIn/page"), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div></div>,
  ssr: false
});

type PageKey = "home" | "wallet" | "explore" | "notifications" | "activity" | "messages" | "profile" | "share" |"explore" | "search" | "likes" | "bookmarks" | "munch" | "mention";

type SidebarProps = {
  setCurrentPage: (page: PageKey) => void;
  currentPage?: PageKey;
  collapsibleItems?: PageKey[];
  alwaysExpanded?: boolean;
  onNavigateToOpinio?: () => void;
  onNavigateToSnaps?: () => void;
};

interface ExtendedSession {
  user?: {
    name?: string;
    email?: string;
    image?: string;
  };
  dbUser?: {
    id: string;
    username: string;
    email: string;
    bio: string;
    avatar_url: string;
    createdAt: string;
  };
  dbUserId?: string;
  access_token?: string;
}

export default function Sidebar({ 
  setCurrentPage, 
  currentPage = "home",
  collapsibleItems = ["messages"], 
  alwaysExpanded = false,
  onNavigateToOpinio,
  onNavigateToSnaps
}: SidebarProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [activeDialog, setActiveDialog] = useState<null | "x" | "wallet" | "createPost">(null);
  const router = useRouter();
  const { connect, disconnect, address } = useWalletContext();
  const { authenticated, user: privyUser, ready } = usePrivy();
  console.log("PROFILE PHOTO FROM SIDEBAR (Privy):", privyUser)

  // Create a custom profile icon component that uses avatar if available
  const ProfileIcon = ({ isActive, className }: { isActive?: boolean; className?: string }) => {
    // TODO: Add avatar URL support from backend profile
    return isActive ?
      <User className={`${className || "w-6 h-6"} text-white`} /> :
      <User className={className || "w-6 h-6"} />;
  };

  const navItems: {
    label: string;
    value: PageKey;
    icon: React.ReactNode;
    activeIcon: React.ReactNode;
    showOnMobile?: boolean;
    showOnDesktop?: boolean;
  }[] = [
    {
      label: "Home",
      value: "home",
      icon: <Home className="w-6 h-6" />,
      activeIcon: <Home className="w-6 h-6 text-white" />,
      showOnMobile: true,
      showOnDesktop: true
    },
      {
      label: "Explore",
      value: "explore",
      icon: <Telescope className="w-6 h-6" />,
      activeIcon: <Telescope className="w-6 h-6 text-white" />,
      showOnMobile: true,
      showOnDesktop: true
    },
    {
      label: "Munch",
      value: "munch",
      icon: <Film className="w-6 h-6" />,
      activeIcon: <Film className="w-6 h-6 text-white" />,
      showOnMobile: true,
      showOnDesktop: true
    },
      {
      label: "Creator Shares",
      value: "share",
      icon: <Blocks className="w-6 h-6" />,
      activeIcon: <Blocks className="w-6 h-6 text-white" />,
      showOnMobile: true,
      showOnDesktop: true
    },
    {
      label: "Messages",
      value: "messages",
      icon: <MessageCircle className="w-6 h-6" />,
      activeIcon: <MessageCircle className="w-6 h-6 text-white" />,
      showOnMobile: true,
      showOnDesktop: true
    },
    {
      label: "Notifications",
      value: "notifications",
      icon: <Bell className="w-6 h-6" />,
      activeIcon: <Bell className="w-6 h-6 text-white" />,
      showOnMobile: true,
      showOnDesktop: true
    },
    // {
    //   label: "Activity",
    //   value: "activity",
    //   icon: <Activity className="w-6 h-6" />,
    //   activeIcon: <Activity className="w-6 h-6 text-white" />,
    //   showOnMobile: true,
    //   showOnDesktop: true
    // },


      {
      label: "Wallet",
      value: "wallet",
      icon: <Wallet className="w-6 h-6" />,
      activeIcon: <Wallet className="w-6 h-6 text-white" />,
      showOnMobile: true,
      showOnDesktop: true
    },
      {
      label: "Profile",
      value: "profile",
      icon: <ProfileIcon isActive={false} />,
      activeIcon: <ProfileIcon isActive={true} />,
      showOnMobile: true,
      showOnDesktop: true
    },

  ];

  const bottomNavItems = [
  { name: "Opinio", path: "/opinio", img: "/opinio-nav.png" },
  { name: "Claps", path: "/", img: "/navlogo.png" },
];


const handleNavClick = (value: PageKey) => {
  // Navigate to wallet page route if wallet is clicked
  if (value === 'wallet') {
    router.push('/snaps/wallet');
    return;
  }

  // Navigate to user's profile page if profile is clicked
  if (value === 'profile') {
    const userId = localStorage.getItem('userId');
    if (userId) {
      router.push(`/snaps/profile/${userId}`);
    } else {
      // Fallback to profile page if no user ID
      setCurrentPage(value);
      if (window.location.pathname !== '/snaps') {
        router.push('/snaps');
      }
    }
    return;
  }

  // Always set the page first for immediate feedback
  setCurrentPage(value);

  // Navigate if not on home page
  if (window.location.pathname !== '/snaps') {
    router.push('/snaps');
  }
};

  const handleOpinioClick = () => {
    if (onNavigateToOpinio) {
      onNavigateToOpinio();
    } else {
      router.push('/opinio');
    }
  };

  const handleSnapsClick = () => {
    if (onNavigateToSnaps) {
      onNavigateToSnaps();
    } else {
      router.push('/snaps');
    }
  };

  const openDialog = (type: "x" | "wallet") => {
    setActiveDialog(type);
  };
  const closeDialog = () => setActiveDialog(null);

  const shouldCollapse = !alwaysExpanded && collapsibleItems.includes(currentPage);
  const sidebarWidth = shouldCollapse ? (isHovered ? 240 : 85) : 240;

  const isLoggedIn = authenticated && ready;
  const isWalletConnected = !!address;

  // Check if current page is home to show Create Post button
  const showCreatePost = currentPage === "home";
  
  return (
    <>
      {/* Mobile Top Bar - Facebook Style */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-black border-b-2 border-gray-700/70 z-[9999]">
        {/* Top Row: Logo + 3 Icons */}
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <div className="flex items-center">
            <Image
              src="/navlogo.png"
              alt="Clapo Logo"
              width={120}
              height={40}
              className="object-contain h-8 w-auto"
            />
          </div>

          {/* Right Icons */}
          <div className="flex items-center gap-2">
            {/* Aura Balance - Mobile */}
            {isLoggedIn && (
              <div className="mr-1">
                <AuraBalance compact />
              </div>
            )}

            {/* Create Post Icon */}
            <button
              onClick={() => setActiveDialog("createPost")}
              className="p-2 rounded-full bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              aria-label="Create Post"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>

            {/* Search/Explore Icon */}
            <button
              onClick={() => handleNavClick("explore")}
              className={`p-2 rounded-full transition-colors ${
                currentPage === "explore"
                  ? "bg-gray-700 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
              }`}
              aria-label="Explore"
            >
              <Search className="w-6 h-6" />
            </button>

            {/* Messages Icon */}
            <button
              onClick={() => handleNavClick("messages")}
              className={`p-2 rounded-full transition-colors ${
                currentPage === "messages"
                  ? "bg-gray-700 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
              }`}
              aria-label="Messages"
            >
              <MessageCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Bottom Row: Other Navigation Items - Fixed Grid */}
        <div className="grid grid-cols-7 gap-0.5 px-1 py-2">
          {navItems
            .filter((item) => item.showOnMobile !== false && item.value !== "explore" && item.value !== "messages")
            .map(({ label, value, icon, activeIcon }) => {
              const isActive = currentPage === value;

              return (
                <button
                  key={value}
                  onClick={() => handleNavClick(value)}
                  className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg transition-all ${
                    isActive
                      ? "bg-gray-700/50 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-700/30"
                  }`}
                >
                  <span className="flex-shrink-0 scale-90">
                    {isActive ? activeIcon : icon}
                  </span>
                  {/* <span className="text-[10px] font-medium truncate w-full text-center px-0.5">
                    {label}
                  </span> */}
                </button>
              );
            })}

          {/* Account/Profile Button */}
          <button
            onClick={() => openDialog("x")}
            className="flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg transition-all text-gray-400 hover:text-white hover:bg-gray-700/30"
          >
            <Image
              src={"/4.png"}
              alt={"Account"}
              width={24}
              height={24}
              className="rounded-full scale-90 bg-black border border-gray-700/70"
            />
            {/* <span className="text-[10px] font-medium truncate w-full text-center px-0.5">
              Account
            </span> */}
          </button>
        </div>
      </div>

      {/* Desktop Sidebar - Only visible on desktop, exactly as before */}
      <div className="hidden lg:block sticky left-0 top-0 max-h-screen bg-black border-r-2 border-gray-700/70">
        <motion.div
          onMouseEnter={() => shouldCollapse && setIsHovered(true)}
          onMouseLeave={() => shouldCollapse && setIsHovered(false)}
          animate={{ width: sidebarWidth }}
          transition={{ type: "spring", stiffness: 300, damping: 24, mass: 0.8 }}
          className="flex flex-col justify-between h-screen px-4 py-6 overflow-hidden"
        >
          {/* Logo Section */}
          <div>
            <div className="flex items-center justify-start mb-20">
              <Image
                src="/navlogo.png"
                alt="Clapo Logo"
                width={1000}
                height={1000}
                className="object-contain w-auto h-8"
              />
            </div>

            {/* Navigation */}
            <nav className="flex flex-col gap-1">
              {navItems
                .filter((item) => item.showOnDesktop !== false)
                .map(({ label, value, icon, activeIcon }, index) => {
                  const showLabel = !shouldCollapse || isHovered;
                  const isActive = currentPage === value;

                  return (
                    <motion.button
                      key={value}
                      onClick={() => handleNavClick(value)}
                      className={`flex items-center px-4 py-1.5 rounded-xl transition-all duration-200 group relative text-left
                        ${isActive 
                          ? "text-white font-semibold" 
                          : "text-gray-400 hover:text-white hover:bg-gray-700/40"
                        }
                      `}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <span className="flex-shrink-0">
                        {isActive ? activeIcon : icon}
                      </span>

                      <AnimatePresence mode="wait">
                        {showLabel && (
                          <motion.span
                            className="ml-4 whitespace-nowrap font-medium text-sm"
                            initial={shouldCollapse ? { opacity: 0, x: -10 } : { opacity: 1, x: 0 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={shouldCollapse ? { opacity: 0, x: -10 } : { opacity: 1, x: 0 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                          >
                            {label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  );
                })}
              
              {/* Desktop Create Post Button - Only show on home page */}
              {showCreatePost && (
                <div className="w-full flex flex-col gap-2 mt-6">
                  <button
                    onClick={() => setActiveDialog("createPost")}
                    className="inline-flex w-full items-center justify-center gap-[6px] min-w-[105px]
                               transition-all duration-350 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                               bg-[hsla(220,10%,12%,1)] text-white shadow px-3 py-1.5 text-xs 
                               rounded-full leading-[24px] font-bold w-full sm:w-auto whitespace-nowrap"
                  >
                    Create Post
                  </button>
                </div>
              )}
            </nav>
          </div>

          {/* Bottom Section */}
          <AnimatePresence>
            {(!shouldCollapse || isHovered) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-3"
              >

                <div className="space-y-3">
                  <h3 className="text-white text-sm font-semibold tracking-wide uppercase">
                    EXPLORE MORE
                  </h3>

                  {/* Aura Balance Display */}
                  {isLoggedIn && (
                    <div className="w-full">
                      <AuraBalance showDetails />
                    </div>
                  )}

                  <button
                    onClick={() => setActiveDialog("x")}
                  className="w-full px-4 py-3 rounded-3xl bg-[#1A1A1A] border-2 border-[#6E54FF] hover:bg-[#2A2A2A] transition-all duration-200 flex items-center justify-center">
                    <PersonStandingIcon/>
                  </button>

                  <div className="space-y-2">
                    {bottomNavItems.map((item) => (
                      <button
                        key={item.name}
                        onClick={() => {
                          if (item.name === "Opinio") {
                            handleOpinioClick();
                          } else if (item.name === "Claps") {
                            handleSnapsClick();
                          }
                        }}
                        className="w-full px-4 py-3 rounded-3xl bg-[#1A1A1A] border-2 border-[#6E54FF] hover:bg-[#2A2A2A] transition-all duration-200 flex items-center justify-center"
                      >
                        <Image
                          src={item.img}
                          alt={item.name}
                          width={120}
                          height={40}
                          className="object-contain h-8 w-auto"
                        />
                      </button>
                    ))}
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Dialog Rendering */}
   <AnimatePresence>
  {activeDialog && (
    <motion.div
      key="dialog"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[10000]"
      onClick={() => setActiveDialog(null)}
    >
      <div onClick={(e) => e.stopPropagation()}>
        {activeDialog === "x" && (isLoggedIn ? <AccountInfo onClose={() => setActiveDialog(null)} /> : <SignInPage/>)}
        {activeDialog === "wallet" && <SignInPage/>}
        {activeDialog === "createPost" && <SnapComposer close={() => setActiveDialog(null)} />}
      </div>
    </motion.div>
  )}
</AnimatePresence>

    </>
  );
}