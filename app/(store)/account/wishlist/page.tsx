import type { Metadata } from "next";
import AccountWishlistView from "@/components/account/AccountWishlistView";

export const metadata: Metadata = {
  title: "Wishlist",
};

export default function AccountWishlistPage() {
  return <AccountWishlistView />;
}
