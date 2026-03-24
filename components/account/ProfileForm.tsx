"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

interface ProfileFormProps {
  displayName: string;
  email: string;
  initials: string;
  avatarUrl?: string;
  memberSince: string;
}

export default function ProfileForm({
  displayName,
  email,
  initials,
  avatarUrl,
  memberSince,
}: ProfileFormProps) {
  const [name, setName] = useState(displayName);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = name.trim() !== displayName;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name cannot be empty.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      data: { full_name: trimmed },
    });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          <div className="relative h-20 w-20 overflow-hidden rounded-full shadow">
            <Image
              src={avatarUrl}
              alt={displayName}
              fill
              className="object-cover"
              sizes="80px"
            />
          </div>
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-walnut text-2xl font-semibold text-cream shadow">
            {initials}
          </div>
        )}
        <div>
          <p className="font-sans font-medium text-charcoal">{displayName}</p>
          <p className="text-sm text-warm-gray">Member since {memberSince}</p>
        </div>
      </div>

      <div className="border-t border-light-sand pt-6 space-y-4">
        {/* Full name */}
        <div>
          <label
            htmlFor="full-name"
            className="block text-sm font-medium text-charcoal"
          >
            Full Name
          </label>
          <input
            id="full-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSuccess(false);
              setError(null);
            }}
            className="mt-1 w-full max-w-sm rounded-md border border-gray-200 px-3 py-2 text-sm text-charcoal focus:border-walnut focus:outline-none focus:ring-1 focus:ring-walnut"
          />
        </div>

        {/* Email — read-only */}
        <div>
          <label className="block text-sm font-medium text-charcoal">
            Email Address
          </label>
          <p className="mt-1 text-sm text-warm-gray">{email}</p>
          <p className="mt-0.5 text-xs text-warm-gray">
            Email cannot be changed here.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={loading || !isDirty}
          className="rounded-md px-5 py-2 text-sm font-medium text-white disabled:opacity-50 transition-opacity"
          style={{ backgroundColor: "#2D4A3E" }}
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
        {success && (
          <span className="text-sm font-medium text-green-600">
            Profile updated.
          </span>
        )}
        {error && (
          <span className="text-sm font-medium text-red-600">{error}</span>
        )}
      </div>
    </form>
  );
}
