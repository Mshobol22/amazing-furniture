"use client";

import { usePathname } from "next/navigation";
import ConditionalStoreNav from "@/components/layout/ConditionalStoreNav";
import Footer from "@/components/layout/Footer";
import CartDrawer from "@/components/cart/CartDrawer";
import ChatWidget from "@/components/ai-assistant/ChatWidget";
import SplashScreen from "@/components/SplashScreen";
import AnnouncementBanner from "@/components/layout/AnnouncementBanner";
import BackToTop from "@/components/layout/BackToTop";
import IdleDiscountPopup from "@/components/IdleDiscountPopup";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isDiscover = pathname === "/discover";

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-[#FAF8F5]">
      {isDiscover ? null : <SplashScreen />}
      {isDiscover ? null : <AnnouncementBanner />}
      {isDiscover ? null : <ConditionalStoreNav />}
      <main className={isDiscover ? "flex-1" : "flex-1 pt-14 lg:pt-24"}>{children}</main>
      {isDiscover ? null : <Footer />}
      <CartDrawer />
      {isDiscover ? null : <BackToTop />}
      {isDiscover ? null : <ChatWidget />}
      {isDiscover ? null : <IdleDiscountPopup />}
    </div>
  );
}
