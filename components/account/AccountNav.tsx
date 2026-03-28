"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Package, User, Heart } from "lucide-react";

const FOREST = "#2D4A3E";

const links = [
  { href: "/account/profile", label: "Profile", icon: User },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/wishlist", label: "Wishlist", icon: Heart },
] as const;

export interface AccountNavUser {
  displayName: string;
  avatarUrl?: string;
  initials: string;
}

export default function AccountNav({ user }: { user: AccountNavUser }) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile tab bar */}
      <nav
        className="flex gap-1 rounded-xl border border-[#1C1C1C]/10 bg-white p-1 shadow-sm lg:hidden"
        aria-label="Account sections"
      >
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg py-2 text-xs font-medium transition-colors"
              style={
                active
                  ? {
                      color: FOREST,
                      boxShadow: `inset 0 -2px 0 0 ${FOREST}`,
                      backgroundColor: "rgba(45, 74, 62, 0.06)",
                    }
                  : { color: "#6b7280" }
              }
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.25 : 2} />
              <span className="truncate px-0.5">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Desktop sidebar */}
      <aside className="hidden w-full shrink-0 lg:block lg:w-64">
        <div className="sticky top-28 rounded-xl border border-[#1C1C1C]/10 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-center gap-3 border-b border-light-sand pb-6 text-center">
            {user.avatarUrl ? (
              <div className="relative h-16 w-16 overflow-hidden rounded-full ring-2 ring-[#2D4A3E]/20">
                <Image
                  src={user.avatarUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#2D4A3E] text-xl font-semibold text-white">
                {user.initials}
              </div>
            )}
            <p className="font-sans text-base font-semibold text-charcoal">
              {user.displayName}
            </p>
          </div>

          <nav className="mt-6 space-y-1" aria-label="Account">
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 rounded-lg py-2.5 pl-3 pr-3 text-sm font-medium transition-colors ${
                    active
                      ? "bg-[#2D4A3E]/10 text-[#2D4A3E]"
                      : "text-warm-gray hover:bg-[#FAF8F5] hover:text-charcoal"
                  }`}
                  style={
                    active
                      ? { borderLeft: `3px solid ${FOREST}`, paddingLeft: "9px" }
                      : undefined
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.25 : 2} />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
