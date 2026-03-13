"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";

interface Banner {
  id: string;
  message: string;
  bg_color: string;
  text_color: string;
  link_url: string | null;
  link_text: string | null;
  is_active: boolean;
}

export default function AnnouncementBanner() {
  const [banner, setBanner] = useState<Banner | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/admin/banners")
      .then((res) => res.json())
      .then((data: Banner[]) => {
        const active = Array.isArray(data)
          ? data.find((b) => b.is_active)
          : null;
        if (active) {
          const key = `dismissed_banner_${active.id}`;
          if (typeof window !== "undefined" && localStorage.getItem(key)) {
            setDismissed(true);
          } else {
            setBanner(active);
          }
        }
      })
      .catch(() => setBanner(null));
  }, []);

  const handleDismiss = () => {
    if (banner) {
      localStorage.setItem(`dismissed_banner_${banner.id}`, "true");
      setDismissed(true);
    }
  };

  if (!banner || dismissed) return null;

  return (
    <div
      className="relative flex w-full items-center overflow-hidden px-10 py-2.5 text-sm"
      style={{
        backgroundColor: banner.bg_color,
        color: banner.text_color,
      }}
    >
      <span className="min-w-0 flex-1 truncate text-center">
        {banner.message}
        {banner.link_url && banner.link_text && (
          <>
            {" "}
            <Link
              href={banner.link_url}
              className="font-medium underline"
              style={{ color: banner.text_color }}
            >
              {banner.link_text}
            </Link>
          </>
        )}
      </span>
      <button
        onClick={handleDismiss}
        className="absolute right-3 top-1/2 -translate-y-1/2 shrink-0 p-1 opacity-80 hover:opacity-100"
        aria-label="Dismiss banner"
        style={{ color: banner.text_color }}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
