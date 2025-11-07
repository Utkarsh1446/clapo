"use client";
import { motion } from "framer-motion";
import Hero from "./Sections/Hero";
import Sidebar from "./Sections/Sidebar";
import { useState } from "react";
import ExploreMarketPage from "./SidebarSections/ExploreMarketPage";
import MyPortfolioPage from "./SidebarSections/MyPortfolioPage";
import WalletPage from "./SidebarSections/WalletPage";
import SettingsPage from "./SidebarSections/SettingsPage";
import CreateMarketPage from "./SidebarSections/CreateMarketPage";
import Footer from "../components/Footer";

export default function OpinioPage() {
  const [currentPage, setCurrentPage] = useState<
    "exploremarket" | "myportfolio" | "wallet" | "settings" | "createmarket"
  >("exploremarket");

  const renderContent = () => {
    switch (currentPage) {
      case "exploremarket":
        return <ExploreMarketPage />;
      case "myportfolio":
        return <MyPortfolioPage />;
      case "wallet":
        return <WalletPage />;
      case "settings":
        return <SettingsPage />;
      case "createmarket":
        return <CreateMarketPage />;
      default:
        return (
          <>
            <Hero />
          </>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-[#0A0A0A]"
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="flex flex-col lg:flex-row sticky min-h-screen lg:h-[600px]">
        <div className="w-full lg:w-60 border-r border-gray-800">
          <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
        </div>
        <div className="flex-1 w-full bg-[#0A0A0A] overflow-y-auto">
          {renderContent()}
        </div>
      </div>
      <Footer />
    </motion.div>
  );
}
