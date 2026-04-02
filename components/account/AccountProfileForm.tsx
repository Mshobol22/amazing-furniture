"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { US_STATE_OPTIONS } from "@/lib/account/us-states";

export type AccountProfileInitial = {
  userId: string;
  email: string;
  authProvider: string | null;
  appProvider: string | undefined;
  avatarUrl?: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

function isGoogleUser(initial: AccountProfileInitial): boolean {
  return (
    initial.authProvider === "google" ||
    initial.appProvider === "google"
  );
}

export default function AccountProfileForm({ initial }: { initial: AccountProfileInitial }) {
  const { toast } = useToast();
  const google = isGoogleUser(initial);

  const [fullName, setFullName] = useState(initial.fullName);
  const [emailInput, setEmailInput] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phone);
  const [line1, setLine1] = useState(initial.addressLine1);
  const [line2, setLine2] = useState(initial.addressLine2);
  const [city, setCity] = useState(initial.city);
  const [stateVal, setStateVal] = useState(initial.state || "");
  const [zip, setZip] = useState(initial.zip);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(initial.fullName);
    setEmailInput(initial.email);
    setPhone(initial.phone);
    setLine1(initial.addressLine1);
    setLine2(initial.addressLine2);
    setCity(initial.city);
    setStateVal(initial.state || "");
    setZip(initial.zip);
  }, [initial]);

  const initials = fullName
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  const onSave = async () => {
    setSaving(true);
    const supabase = createClient();
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      if (!google && emailInput.trim() && emailInput.trim() !== user.email) {
        const { error: emailErr } = await supabase.auth.updateUser({
          email: emailInput.trim(),
        });
        if (emailErr) {
          toast({
            variant: "destructive",
            title: "Email update failed",
            description: emailErr.message,
          });
          setSaving(false);
          return;
        }
        toast({
          title: "Confirm your email",
          description: "Check your inbox to confirm the new address.",
        });
      }

      const metaPayload: Record<string, string> = { full_name: fullName.trim() };
      if (phone.trim()) metaPayload.phone = phone.trim();
      const { error: metaErr } = await supabase.auth.updateUser({
        data: metaPayload,
      });
      if (metaErr) {
        toast({
          variant: "destructive",
          title: "Could not update profile",
          description: metaErr.message,
        });
        setSaving(false);
        return;
      }

      const { error: profErr } = await supabase.from("profiles").upsert(
        {
          user_id: user.id,
          full_name: fullName.trim() || null,
          email: (google ? user.email : emailInput.trim()) || user.email,
          phone: phone.trim() || null,
          address_line1: line1.trim() || null,
          address_line2: line2.trim() || null,
          city: city.trim() || null,
          state: stateVal.trim() || null,
          zip: zip.trim() || null,
          country: "US",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      if (profErr) {
        toast({
          variant: "destructive",
          title: "Save failed",
          description: profErr.message,
        });
        setSaving(false);
        return;
      }

      toast({ title: "Saved", description: "Your profile has been updated." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-10 rounded-xl border border-[#1C1C1C]/10 bg-white p-6 shadow-sm sm:p-8">
      <div>
        <h1 className="font-sans text-xl font-semibold text-charcoal sm:text-2xl">Profile</h1>
        <p className="mt-1 text-sm text-warm-gray">Manage your personal information and default shipping address.</p>
      </div>

      <div className="flex flex-col items-center gap-4 border-b border-light-sand pb-8 sm:flex-row sm:items-start">
        {google && initial.avatarUrl ? (
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full ring-2 ring-[#2D4A3E]/20">
            <Image src={initial.avatarUrl} alt="" fill className="object-cover" sizes="96px" />
          </div>
        ) : (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-[#2D4A3E] text-2xl font-semibold text-white">
            {initials}
          </div>
        )}
        <div className="text-center sm:text-left">
          <p className="font-medium text-charcoal">{fullName || "Your name"}</p>
          <p className="text-sm text-warm-gray">{initial.email}</p>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-charcoal">Personal info</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="pf-name">Full name</Label>
            <Input
              id="pf-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1"
              autoComplete="name"
            />
          </div>
          <div>
            <Label htmlFor="pf-email">Email</Label>
            {google ? (
              <>
                <Input
                  id="pf-email"
                  value={initial.email}
                  readOnly
                  className="mt-1 bg-[#FAF8F5]"
                />
                <p className="mt-1 text-xs text-warm-gray">Managed by Google</p>
              </>
            ) : (
              <>
                <Input
                  id="pf-email"
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="mt-1"
                  autoComplete="email"
                />
                <p className="mt-1 text-xs text-warm-gray">
                  Changing your email sends a confirmation link from Supabase.
                </p>
              </>
            )}
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="pf-phone">Phone number (optional — used for delivery updates)</Label>
            <Input
              id="pf-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 max-w-md"
              autoComplete="tel"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-charcoal">Default shipping address</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="pf-line1">Address line 1</Label>
            <Input
              id="pf-line1"
              value={line1}
              onChange={(e) => setLine1(e.target.value)}
              className="mt-1"
              autoComplete="address-line1"
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="pf-line2">Address line 2 (optional)</Label>
            <Input
              id="pf-line2"
              value={line2}
              onChange={(e) => setLine2(e.target.value)}
              className="mt-1"
              autoComplete="address-line2"
            />
          </div>
          <div>
            <Label htmlFor="pf-city">City</Label>
            <Input
              id="pf-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1"
              autoComplete="address-level2"
            />
          </div>
          <div>
            <Label>State</Label>
            <Select value={stateVal} onValueChange={setStateVal}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {US_STATE_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="pf-zip">ZIP</Label>
            <Input
              id="pf-zip"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              className="mt-1"
              autoComplete="postal-code"
            />
          </div>
          <div>
            <Label htmlFor="pf-country">Country</Label>
            <Input
              id="pf-country"
              value="United States"
              readOnly
              className="mt-1 bg-[#FAF8F5]"
            />
          </div>
        </div>
      </section>

      <Button
        type="button"
        className="bg-[#2D4A3E] text-cream hover:bg-[#1E3329]"
        disabled={saving}
        onClick={() => void onSave()}
      >
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}
