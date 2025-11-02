"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { Menu } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useWalletContext } from "@/context/WalletContext";
import { AuraBalance } from "./Aura/AuraBalance";

// Dynamic import for SignIn page (1,117 lines) - improves initial load
const SignInPage = dynamic(() => import("../SignIn/page"), {
  loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div></div>,
  ssr: false
});

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

export default function Navbar() {
  const pathname = usePathname();
  const { connect, disconnect, address } = useWalletContext();
  const [activeDialog, setActiveDialog] = useState<null | "x" | "wallet">(null);
  const { data: session } = useSession() as { data: ExtendedSession | null };

  const navItems = [
    // { label: "CLAPS", href: "/" },
    // { label: "SNAPS", href: "/snaps" },
    // { label: "OPINIO", href: "/opinio" },
    // { label: "SMART CONTRACT", href: "/smart-contract-demo" },
  ];

  const openDialog = (type: "x" | "wallet") => setActiveDialog(type);
  const closeDialog = () => setActiveDialog(null);

  const isLoggedIn = !!session;
  const isWalletConnected = !!address;

  return (
    <>
      <nav className="w-full top-0 p-4 md:p-6 flex items-center justify-between font-mono">
        {/* Mobile + iPad Menu Drawer (visible until lg) */}
        <div className="lg:hidden z-50">
          <Drawer>
            <DrawerTrigger className="p-2 text-white">
              <Menu size={24} />
            </DrawerTrigger>
            <DrawerContent className="bg-black text-white border-none mb-20 rounded-t-[40px]">
              <DrawerHeader>
                <DrawerTitle className="text-primary"></DrawerTitle>
              </DrawerHeader>
              <div className="flex flex-col space-y-6 px-6 pb-6">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`tracking-[0.3em] text-sm font-bold ${
                      item.href === "/"
                        ? pathname === "/"
                          ? "text-[#E4761B]"
                          : "text-[#A0A0A0] hover:text-white"
                        : pathname.startsWith(item.href)
                        ? "text-[#E4761B]"
                        : "text-[#A0A0A0] hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </DrawerContent>
          </Drawer>
        </div>

        {/* Logo (always visible) */}
        <div className="flex items-center z-50">
          <Image
            src="/navlogo.png"
            alt="Clapo Logo"
            width={120}
            height={40}
            className="object-contain h-6 md:h-8 w-auto"
          />
        </div>

        {/* Desktop Nav Links (only lg and up) */}
        <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 gap-8 items-center">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`tracking-widest text-sm font-bold transition-colors ${
                item.href === "/"
                  ? pathname === "/" // Home must match exactly
                    ? "text-[#4F47EB]"
                    : "text-[#A0A0A0] hover:text-white"
                  : pathname.startsWith(item.href) // Sub-routes use startsWith
                  ? "text-[#4F47EB]"
                  : "text-[#A0A0A0] hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Desktop Buttons (only lg and up) */}
        <div className="hidden lg:flex gap-2 items-center">
          {isLoggedIn && <AuraBalance compact showDetails />}
          <button
            onClick={() => openDialog("x")}
            className="inline-flex items-center justify-center ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 gap-[6px] min-w-[105px] transition-all duration-350 ease-[cubic-bezier(0.34,1.56,0.64,1)] bg-[hsla(220,10%,12%,1)] text-white shadow-[0px_1px_1px_0px_rgba(255,255,255,0.12)_inset,0px_1px_2px_0px_rgba(0,0,0,0.08),0px_0px_0px_1px_#000] hover:bg-[hsla(220,10%,18%,1)] px-3 py-1.5 text-xs rounded-full leading-[24px] font-bold w-full sm:w-auto whitespace-nowrap"
          >
            {isLoggedIn ? session.dbUser?.username || "CONNECTED" : "CONNECT X"}
          </button>
          <button
            style={{
              boxShadow:
                "0px 1px 0.5px 0px rgba(255, 255, 255, 0.50) inset, 0px 1px 2px 0px rgba(26, 19, 161, 0.50), 0px 0px 0px 1px #4F47EB",
              backgroundColor: "#6E54FF",
              color: "white",
              padding: "8px 16px",
            }}
            onClick={() => {
              openDialog("wallet");
            }}
            className="bg-[#23272B] text-white rounded-full px-3 py-1 text-xs font-bold shadow"
          >
            {isWalletConnected
              ? `${address?.slice(0, 6)}...${address?.slice(-4)}`
              : "CONNECT WALLET"}
          </button>
        </div>

        {/* Mobile + iPad Connect Button */}
        <div className="flex lg:hidden justify-center gap-2 items-center">
          {isLoggedIn && <AuraBalance compact />}
          <button
            style={{
              boxShadow:
                "0px 1px 0.5px 0px rgba(255, 255, 255, 0.50) inset, 0px 1px 2px 0px rgba(161, 87, 19, 0.50), 0px 0px 0px 1px #F97316",
              backgroundColor: "#6C54F8",
              color: "white",
              padding: "8px 16px",
            }}
            onClick={() => openDialog("x")}
            className="text-[#E4761B] bg-white rounded-full px-3 py-1 text-xs font-bold shadow hover:text-white hover:bg-[#E4761B] transition"
          >
            {isLoggedIn ? session.dbUser?.username || "Connected" : "Connect"}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {activeDialog && (
          <motion.div
            key="dialog"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[10000]"
            onClick={closeDialog}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <SignInPage />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
