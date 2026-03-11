import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, isAdmin } from "@/lib/supabase/server";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Tag,
} from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user)) {
    redirect("/");
  }

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/products", label: "Products", icon: Package },
    { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
    { href: "/admin/products/promotions", label: "Promotions", icon: Tag },
  ];

  return (
    <div className="flex min-h-screen bg-[#FAF8F5]">
      <aside className="w-64 shrink-0 border-r border-gray-200 bg-white">
        <div className="flex h-16 items-center border-b border-gray-200 px-4">
          <Link href="/admin" className="font-display text-lg font-semibold text-charcoal">
            Admin
          </Link>
        </div>
        <div className="border-b border-gray-200 px-4 py-4">
          <p className="text-sm font-medium text-charcoal truncate">
            {user.email}
          </p>
          <p className="text-xs text-warm-gray">Store Admin</p>
        </div>
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-charcoal hover:bg-gray-100"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
