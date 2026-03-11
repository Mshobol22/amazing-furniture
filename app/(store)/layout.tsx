import ConditionalStoreNav from "@/components/layout/ConditionalStoreNav";
import Footer from "@/components/layout/Footer";
import CartDrawer from "@/components/cart/CartDrawer";
import ChatWidget from "@/components/ai-assistant/ChatWidget";
import SplashScreen from "@/components/SplashScreen";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SplashScreen />
      <ConditionalStoreNav />
      <main className="flex-1">{children}</main>
      <Footer />
      <CartDrawer />
      <ChatWidget />
    </div>
  );
}
