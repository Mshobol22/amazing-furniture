import dynamic from "next/dynamic";
import ConditionalStoreNav from "@/components/layout/ConditionalStoreNav";
import Footer from "@/components/layout/Footer";
import CartDrawer from "@/components/cart/CartDrawer";
import ChatWidget from "@/components/ai-assistant/ChatWidget";
import SplashScreen from "@/components/SplashScreen";
import AnnouncementBanner from "@/components/layout/AnnouncementBanner";
import BackToTop from "@/components/layout/BackToTop";

const ExitIntentPopup = dynamic(
  () => import("@/components/ExitIntentPopup"),
  { ssr: false }
);

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-[#FAF8F5]">
      <SplashScreen />
      <AnnouncementBanner />
      <ExitIntentPopup />
      <ConditionalStoreNav />
      <main className="flex-1 pt-14 lg:pt-24">{children}</main>
      <Footer />
      <CartDrawer />
      <BackToTop />
      <ChatWidget />
    </div>
  );
}
