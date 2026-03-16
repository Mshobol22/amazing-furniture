import { createClient, isAdmin } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import NewsletterTable from "@/components/admin/NewsletterTable";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Newsletter Subscribers | Admin",
};

export default async function NewsletterPage() {
  // Admin auth — server-side
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user)) redirect("/");

  const admin = createAdminClient();

  const { data, count } = await admin
    .from("newsletter_subscribers")
    .select("id, email, subscribed_at, source, is_active", { count: "exact" })
    .order("subscribed_at", { ascending: false });

  const subscribers = data ?? [];
  const totalCount = count ?? 0;

  return (
    <div>
      <h1 className="mb-8 font-display text-2xl font-semibold text-charcoal">
        Newsletter Subscribers
      </h1>
      <NewsletterTable subscribers={subscribers} totalCount={totalCount} />
    </div>
  );
}
