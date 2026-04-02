import type { Metadata } from "next";
import AccountSecurityView from "@/components/account/AccountSecurityView";

export const metadata: Metadata = {
  title: "Security",
};

export default function AccountSecurityPage() {
  return <AccountSecurityView />;
}
