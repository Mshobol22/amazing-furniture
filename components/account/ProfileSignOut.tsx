"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import type { Product } from "@/types";
import { productLeadImageSrc } from "@/lib/nfd-image-proxy";
import { formatPrice } from "@/lib/format-price";
import { getStorefrontListPrice, getVariantCardFromPrice } from "@/lib/zinatex-product-display";

export default function ProfileSignOut({
  displayName,
  email,
  avatarUrl,
  initials,
  initialAddress,
  jumpBackProducts,
}: {
  displayName: string;
  email: string;
  avatarUrl?: string;
  initials: string;
  initialAddress: {
    line1: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  jumpBackProducts: Product[];
}) {
  const router = useRouter();
  const [address, setAddress] = useState({
    line1: initialAddress.line1,
    city: initialAddress.city,
    state: initialAddress.state,
    zip: initialAddress.zip,
    country: initialAddress.country,
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAddress({
      line1: initialAddress.line1,
      city: initialAddress.city,
      state: initialAddress.state,
      zip: initialAddress.zip,
      country: initialAddress.country,
    });
  }, [initialAddress]);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const onSaveAddress = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: displayName,
          email,
          addressLine1: address.line1,
          city: address.city,
          state: address.state,
          zip: address.zip,
          country: address.country || "US",
        }),
      });
      if (!res.ok) return;
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#1C1C1C]/10 bg-white p-8 shadow-sm">
      <h1 className="font-sans text-xl font-semibold text-charcoal sm:text-2xl">Profile</h1>
      <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        {avatarUrl ? (
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full ring-2 ring-[#2D4A3E]/20">
            <Image
              src={avatarUrl}
              alt=""
              fill
              className="object-cover"
              sizes="96px"
            />
          </div>
        ) : (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-[#2D4A3E] text-2xl font-semibold text-white">
            {initials}
          </div>
        )}
        <div className="w-full text-center sm:text-left">
          <p className="font-sans text-lg font-semibold text-charcoal">{displayName}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-warm-gray">Full name</p>
              <input
                type="text"
                value={displayName}
                readOnly
                className="w-full rounded-md border border-[#1C1C1C]/15 bg-[#FAF8F5] px-3 py-2 text-sm text-charcoal"
              />
            </div>
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-warm-gray">Email</p>
              <input
                type="email"
                value={email}
                readOnly
                className="w-full rounded-md border border-[#1C1C1C]/15 bg-[#FAF8F5] px-3 py-2 text-sm text-charcoal"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-10 border-t border-light-sand pt-8">
        <h2 className="text-lg font-semibold text-charcoal">Saved Address</h2>
        <p className="mt-1 text-sm text-warm-gray">Use this for faster checkout next time.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            value={address.line1}
            onChange={(e) => setAddress((prev) => ({ ...prev, line1: e.target.value }))}
            placeholder="Street address"
            className="rounded-md border border-[#1C1C1C]/15 bg-white px-3 py-2 text-sm text-charcoal"
          />
          <input
            value={address.city}
            onChange={(e) => setAddress((prev) => ({ ...prev, city: e.target.value }))}
            placeholder="City"
            className="rounded-md border border-[#1C1C1C]/15 bg-white px-3 py-2 text-sm text-charcoal"
          />
          <input
            value={address.state}
            onChange={(e) => setAddress((prev) => ({ ...prev, state: e.target.value }))}
            placeholder="State"
            className="rounded-md border border-[#1C1C1C]/15 bg-white px-3 py-2 text-sm text-charcoal"
          />
          <input
            value={address.zip}
            onChange={(e) => setAddress((prev) => ({ ...prev, zip: e.target.value }))}
            placeholder="ZIP code"
            className="rounded-md border border-[#1C1C1C]/15 bg-white px-3 py-2 text-sm text-charcoal"
          />
          <input
            value={address.country}
            onChange={(e) => setAddress((prev) => ({ ...prev, country: e.target.value }))}
            placeholder="Country"
            className="rounded-md border border-[#1C1C1C]/15 bg-white px-3 py-2 text-sm text-charcoal"
          />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Button
            type="button"
            className="bg-[#2D4A3E] text-[#FAF8F5] hover:bg-[#1E3329]"
            onClick={onSaveAddress}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Address"}
          </Button>
          {saved ? <span className="text-sm text-green-700">Saved</span> : null}
        </div>
      </div>
      <div className="mt-10 border-t border-light-sand pt-8">
        <Button
          type="button"
          variant="outline"
          className="border-charcoal text-charcoal hover:bg-[#FAF8F5]"
          onClick={() => void signOut()}
        >
          Sign out
        </Button>
      </div>
      <div className="mt-10 border-t border-light-sand pt-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-sans text-lg font-semibold text-charcoal">Jump back into shopping</h2>
            <p className="mt-1 text-sm text-warm-gray">
              Picks based on your likes and recent product activity.
            </p>
          </div>
          <Button asChild variant="outline" className="border-charcoal text-charcoal hover:bg-[#FAF8F5]">
            <Link href="/collections/all">Browse all</Link>
          </Button>
        </div>
        {jumpBackProducts.length === 0 ? (
          <div className="rounded-lg border border-[#1C1C1C]/10 bg-[#FAF8F5] p-5 text-sm text-warm-gray">
            Start liking products to get personalized picks here.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {jumpBackProducts.map((product) => {
              const safeImage = productLeadImageSrc(product.manufacturer, product.images?.[0]);
              return (
                <article
                  key={product.id}
                  className="overflow-hidden rounded-xl border border-[#1C1C1C]/10 bg-white shadow-sm"
                >
                  <Link href={`/products/${product.slug}`} className="block">
                    <div className="relative aspect-square bg-[#FAF8F5]">
                      {safeImage ? (
                        <Image
                          src={safeImage}
                          alt={product.name}
                          fill
                          className="object-contain p-2"
                          sizes="(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="h-full w-full" />
                      )}
                    </div>
                  </Link>
                  <div className="space-y-1 p-3">
                    <p className="line-clamp-2 text-sm font-medium text-charcoal">{product.name}</p>
                    <p className="text-xs uppercase tracking-wide text-warm-gray">
                      {product.manufacturer ?? product.category}
                    </p>
                    <p className="font-sans text-base font-semibold text-charcoal tabular-nums">
                      {getVariantCardFromPrice(product) != null ? (
                        <>
                          <span className="text-sm font-medium text-warm-gray">From </span>
                          {formatPrice(getVariantCardFromPrice(product)!)}
                        </>
                      ) : (
                        formatPrice(getStorefrontListPrice(product))
                      )}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
