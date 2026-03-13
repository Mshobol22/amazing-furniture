"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  X,
  PanelLeft,
  PanelLeftClose,
  Store,
  User,
  LogOut,
  LayoutDashboard,
  Package,
  Tag,
  ShoppingBag,
  MessageSquare,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/promotions", label: "Promotions", icon: Tag },
  { href: "/admin/banners", label: "Banners", icon: MessageSquare },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
];

interface AdminShellProps {
  children: React.ReactNode;
  adminEmail: string;
}

export default function AdminShell({ children, adminEmail }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-[#1C1C1C] text-white transition-all duration-300 lg:relative lg:inset-auto lg:z-auto
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${sidebarCollapsed ? "lg:w-16" : "lg:w-60"}
          w-60`}
      >
        <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
          {!sidebarCollapsed && (
            <span className="text-sm font-semibold tracking-wide text-white">
              AMAZING HOME
            </span>
          )}
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="text-white/60 hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-2 py-4">
          {navItems.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                title={sidebarCollapsed ? item.label : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 ${
                  isActive
                    ? "bg-[#8B6914] text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                } ${sidebarCollapsed ? "justify-center" : ""}`}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!sidebarCollapsed && (
                  <span className="font-medium">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {!sidebarCollapsed && (
          <div className="space-y-2 border-t border-white/10 p-4">
            <div className="truncate text-xs text-white/50">{adminEmail}</div>
            <div className="text-xs text-[#8B6914]">Store Admin</div>
            <div className="flex flex-col gap-1 pt-1">
              <Link
                href="/"
                className="flex items-center gap-2 py-1 text-xs text-white/60 transition-colors hover:text-white"
              >
                <Store className="h-3.5 w-3.5" />
                Back to Store
              </Link>
              <Link
                href="/account"
                className="flex items-center gap-2 py-1 text-xs text-white/60 transition-colors hover:text-white"
              >
                <User className="h-3.5 w-3.5" />
                My Profile
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-2 py-1 text-left text-xs text-red-400 transition-colors hover:text-red-300"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-md p-2 transition-colors hover:bg-gray-100 lg:hidden"
              aria-label="Toggle sidebar"
            >
              <Menu className="h-5 w-5 text-gray-600" />
            </button>
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden rounded-md p-2 transition-colors hover:bg-gray-100 lg:flex"
              aria-label="Collapse sidebar"
            >
              {sidebarCollapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
            <span className="text-sm font-medium text-gray-500">
              Admin Panel
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="hidden items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-[#1C1C1C] sm:flex"
            >
              <Store className="h-4 w-4" />
              <span>Back to Store</span>
            </Link>
            <Link
              href="/account"
              className="hidden items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-[#1C1C1C] sm:flex"
            >
              <User className="h-4 w-4" />
              <span>My Profile</span>
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#8B6914] text-xs font-semibold text-white">
                {adminEmail?.charAt(0).toUpperCase() ?? "A"}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
