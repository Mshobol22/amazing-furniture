import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/AdminNav";

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

  return (
    <div className="flex min-h-screen bg-[#FAF8F5]">
      <aside
        className="w-[240px] shrink-0 flex flex-col"
        style={{ backgroundColor: "#1C1C1C" }}
      >
        <div className="flex h-16 items-center px-4 border-b border-white/10">
          <Link
            href="/admin"
            className="font-display text-lg font-semibold text-white"
          >
            Admin
          </Link>
        </div>
        <AdminNav />
        <div className="border-t border-white/10 p-4">
          <p className="text-sm font-medium text-white/90 truncate">
            {user.email}
          </p>
          <p className="text-xs text-white/60 mt-0.5">Store Admin</p>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
