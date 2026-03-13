import { redirect } from "next/navigation";
import { createClient, isAdmin } from "@/lib/supabase/server";
import AdminShell from "@/components/admin/AdminShell";

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
    <AdminShell adminEmail={user.email ?? ""}>
      {children}
    </AdminShell>
  );
}
