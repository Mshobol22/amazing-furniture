"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, Heart, User, Shield } from "lucide-react";
import AccountSignOutButton from "@/components/account/AccountSignOutButton";

const FOREST = "#2D4A3E";

const links = [
  { href: "/account", label: "Dashboard", icon: Home, match: (p: string) => p === "/account" },
  {
    href: "/account/orders",
    label: "Orders",
    icon: Package,
    match: (p: string) => p.startsWith("/account/orders"),
  },
  { href: "/account/wishlist", label: "Wishlist", icon: Heart, match: (p: string) => p === "/account/wishlist" },
  { href: "/account/profile", label: "Profile", icon: User, match: (p: string) => p === "/account/profile" },
  {
    href: "/account/security",
    label: "Security",
    icon: Shield,
    match: (p: string) => p === "/account/security",
  },
] as const;

export interface AccountNavSessionUser {
  displayName: string;
  email: string;
}

export default function AccountNav({ user }: { user: AccountNavSessionUser }) {
  const pathname = usePathname() ?? "";

  const linkClass = (active: boolean, compact?: boolean) =>
    `flex items-center gap-2 rounded-lg font-medium transition-colors ${
      compact ? "flex-col gap-1 py-2 px-1 text-[10px]" : "py-2.5 pl-3 pr-3 text-sm"
    } ${
      active
        ? "bg-[#2D4A3E]/10 text-[#2D4A3E]"
        : "text-warm-gray hover:bg-[#FAF8F5] hover:text-charcoal"
    }`;

  return (
    <>
      {/* Mobile bottom tab bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#1C1C1C]/10 bg-white px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] lg:hidden"
        aria-label="Account sections"
      >
        <div className="mx-auto flex max-w-lg justify-around">
          {links.map(({ href, label, icon: Icon, match }) => {
            const active = match(pathname);
            return (
              <Link
                key={href}
                href={href}
                className={linkClass(active, true)}
                style={
                  active
                    ? { color: FOREST, boxShadow: `inset 0 -2px 0 0 ${FOREST}` }
                    : undefined
                }
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.25 : 2} />
                <span className="max-w-[4.5rem] truncate text-center leading-tight">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop sidebar */}
      <aside className="hidden w-full shrink-0 lg:block lg:w-64">
        <div className="sticky top-28 flex flex-col rounded-xl border border-[#1C1C1C]/10 bg-white p-6 shadow-sm">
          <div className="border-b border-light-sand pb-5">
            <p className="font-sans text-base font-semibold text-charcoal">{user.displayName}</p>
            <p className="mt-1 break-all text-sm text-warm-gray">{user.email}</p>
          </div>

          <nav className="mt-5 flex flex-1 flex-col space-y-1" aria-label="Account">
            {links.map(({ href, label, icon: Icon, match }) => {
              const active = match(pathname);
              return (
                <Link
                  key={href}
                  href={href}
                  className={linkClass(active)}
                  style={
                    active ? { borderLeft: `3px solid ${FOREST}`, paddingLeft: "9px" } : undefined
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.25 : 2} />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 border-t border-light-sand pt-5">
            <AccountSignOutButton />
          </div>
        </div>
      </aside>
    </>
  );
}
