import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, isAdmin } from "@/lib/supabase/server";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

type CollectionRow = {
  id: string;
  name: string;
  sku: string | null;
  manufacturer: string | null;
  collection_group: string | null;
  piece_type: string | null;
  is_collection_hero: boolean | null;
  bundle_skus: string[] | null;
  images_validated: boolean | null;
};

type StatusKind = "complete" | "no-hero" | "no-pieces" | "single";

function getCollectionStatus(rows: CollectionRow[]): StatusKind {
  const pieceCount = rows.length;
  const heroes = rows.filter((row) => row.is_collection_hero === true);
  const hero = heroes[0];
  const heroBundleSkus = hero?.bundle_skus ?? [];

  if (pieceCount === 1) return "single";
  if (heroes.length === 1 && pieceCount >= 2) return "complete";
  if (heroes.length === 0) return "no-hero";
  if (heroBundleSkus.length === 0 || pieceCount <= 1) return "no-pieces";
  return "no-hero";
}

function statusLabel(status: StatusKind): string {
  if (status === "complete") return "Complete";
  if (status === "no-hero") return "No Hero";
  if (status === "no-pieces") return "No Pieces";
  return "Single";
}

function statusClasses(status: StatusKind): string {
  if (status === "complete") return "border-transparent bg-[#2D4A3E] text-white";
  if (status === "no-hero") return "border-transparent bg-yellow-100 text-yellow-900";
  if (status === "no-pieces") return "border-transparent bg-red-100 text-red-900";
  return "border-transparent bg-gray-200 text-gray-800";
}

function imageValidatedLabel(value: boolean | null): string {
  if (value === true) return "Validated";
  if (value === false) return "Invalid";
  return "Pending";
}

export default async function AdminCollectionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user)) {
    redirect("/sign-in");
  }

  const admin = createAdminClient();
  const [{ data: collectionRows }, { count: orphanCount }] = await Promise.all([
    admin
      .from("products")
      .select("id, name, sku, manufacturer, collection_group, piece_type, is_collection_hero, bundle_skus, images_validated")
      .not("collection_group", "is", null)
      .order("collection_group", { ascending: true })
      .order("is_collection_hero", { ascending: false }),
    admin
      .from("products")
      .select("id", { count: "exact", head: true })
      .or("collection_group.is.null,collection_group.eq."),
  ]);

  const grouped = new Map<string, CollectionRow[]>();
  for (const row of (collectionRows ?? []) as CollectionRow[]) {
    const key = (row.collection_group ?? "").trim();
    if (!key) continue;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(row);
  }

  const groups = Array.from(grouped.entries()).map(([groupCode, rows]) => {
    const status = getCollectionStatus(rows);
    return {
      groupCode,
      rows,
      status,
      manufacturer: rows[0]?.manufacturer ?? "Unknown",
    };
  });

  const totalGroups = groups.length;
  const completeCount = groups.filter((group) => group.status === "complete").length;
  const noHeroCount = groups.filter((group) => group.status === "no-hero").length;
  const noPiecesCount = groups.filter((group) => group.status === "no-pieces").length;
  const needsAttention = noHeroCount + noPiecesCount;

  return (
    <div className="space-y-6 rounded-xl border border-gray-200 bg-[#FAF8F5] p-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">Collection Groups</h1>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-warm-gray">Total collection groups</p>
          <p className="mt-1 text-2xl font-semibold text-charcoal">{totalGroups}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-warm-gray">Complete collections</p>
          <p className="mt-1 text-2xl font-semibold text-[#2D4A3E]">{completeCount}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-warm-gray">Collections needing attention</p>
          <p className="mt-1 text-2xl font-semibold text-red-700">{needsAttention}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-warm-gray">Products with no collection group</p>
          <p className="mt-1 text-2xl font-semibold text-charcoal">{orphanCount ?? 0}</p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <Accordion type="multiple" className="w-full">
          {groups.map((group) => (
            <AccordionItem key={group.groupCode} value={group.groupCode}>
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex w-full items-center gap-3 text-left">
                  <span className="font-semibold text-[#1C1C1C]">{group.groupCode}</span>
                  <span className="text-sm text-warm-gray">{group.manufacturer}</span>
                  <span className="text-sm text-warm-gray">{group.rows.length} pieces</span>
                  <Badge className={statusClasses(group.status)}>{statusLabel(group.status)}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="overflow-x-auto rounded border border-gray-200">
                  <table className="w-full min-w-[680px] text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-warm-gray">
                        <th className="px-3 py-2">Piece type</th>
                        <th className="px-3 py-2">SKU</th>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">images_validated</th>
                        <th className="px-3 py-2">Edit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.map((piece) => (
                        <tr key={piece.id} className="border-t border-gray-100">
                          <td className="px-3 py-2 text-charcoal">{piece.piece_type ?? "—"}</td>
                          <td className="px-3 py-2 text-warm-gray">{piece.sku ?? "—"}</td>
                          <td className="px-3 py-2 text-charcoal">{piece.name}</td>
                          <td className="px-3 py-2">
                            <Badge
                              className={
                                piece.images_validated === true
                                  ? "border-transparent bg-green-100 text-green-800"
                                  : piece.images_validated === false
                                    ? "border-transparent bg-red-100 text-red-800"
                                    : "border-transparent bg-gray-100 text-gray-800"
                              }
                            >
                              {imageValidatedLabel(piece.images_validated)}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">
                            <Link href="/admin/products" className="text-[#2D4A3E] hover:underline">
                              Edit
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
