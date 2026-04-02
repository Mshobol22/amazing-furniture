"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GoogleIcon } from "@/components/auth/GoogleIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

function roughSessionLabel(): string {
  if (typeof navigator === "undefined") return "This browser";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iPhone / iPad";
  if (/Android/i.test(ua)) return "Android device";
  if (/Mac OS X/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows PC";
  if (/Chrome/i.test(ua)) return "Chrome browser";
  if (/Firefox/i.test(ua)) return "Firefox browser";
  if (/Safari/i.test(ua)) return "Safari browser";
  return ua.length > 60 ? `${ua.slice(0, 60)}…` : ua || "This browser";
}

function isGoogle(
  authProvider: string | null | undefined,
  appProvider: string | undefined
): boolean {
  return authProvider === "google" || appProvider === "google";
}

export default function AccountSecurityView() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [google, setGoogle] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwFieldErrors, setPwFieldErrors] = useState<{
    new?: string;
    confirm?: string;
  }>({});

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const appP = user.app_metadata?.provider as string | undefined;
      const { data: prof } = await supabase
        .from("profiles")
        .select("auth_provider")
        .eq("user_id", user.id)
        .maybeSingle();
      const authP = (prof as { auth_provider?: string } | null)?.auth_provider;
      setGoogle(isGoogle(authP ?? null, appP));
      setLoading(false);
    })();
  }, []);

  const validateNewPassword = (pw: string): string | null => {
    if (pw.length < 8) return "Password must be at least 8 characters";
    if (!/\d/.test(pw)) return "Password must contain at least one number";
    return null;
  };

  const onChangePassword = async () => {
    setPwFieldErrors({});
    const errNew = validateNewPassword(newPw);
    if (errNew) {
      setPwFieldErrors({ new: errNew });
      return;
    }
    if (newPw !== confirmPw) {
      setPwFieldErrors({ confirm: "Passwords must match" });
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return;

    setPwSaving(true);
    try {
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPw,
      });
      if (signErr) {
        toast({
          variant: "destructive",
          title: "Current password incorrect",
          description: "Check your password and try again.",
        });
        setPwSaving(false);
        return;
      }

      const { error: updErr } = await supabase.auth.updateUser({ password: newPw });
      if (updErr) {
        toast({
          variant: "destructive",
          title: "Update failed",
          description: updErr.message,
        });
        setPwSaving(false);
        return;
      }

      toast({ title: "Password updated successfully" });
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } finally {
      setPwSaving(false);
    }
  };

  const onDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return;
    setDeleting(true);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Could not delete account",
          description: body.error ?? "Try again later.",
        });
        setDeleting(false);
        return;
      }
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch {
      toast({
        variant: "destructive",
        title: "Something went wrong",
      });
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2D4A3E] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-sans text-xl font-semibold text-charcoal sm:text-2xl">Security</h1>
        <p className="mt-1 text-sm text-warm-gray">Password, sessions, and account deletion.</p>
      </div>

      {google ? (
        <section className="rounded-xl border border-[#1C1C1C]/10 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <GoogleIcon className="h-8 w-8" />
            <div>
              <h2 className="font-semibold text-charcoal">Google sign-in</h2>
              <p className="text-sm text-warm-gray">
                Your account is secured by Google. Sign-in and recovery are managed in your Google
                account.
              </p>
            </div>
          </div>
          <div className="mt-6 border-t border-light-sand pt-6">
            <h3 className="font-medium text-charcoal">Password</h3>
            <p className="mt-2 text-sm text-warm-gray">
              Your account uses Google sign-in. You don&apos;t have a separate password for this
              site.
            </p>
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-[#1C1C1C]/10 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-charcoal">Change password</h2>
          <div className="mt-4 max-w-md space-y-4">
            <div>
              <Label htmlFor="cur-pw">Current password</Label>
              <div className="relative mt-1">
                <Input
                  id="cur-pw"
                  type={showCur ? "text" : "password"}
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className="pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-warm-gray"
                  onClick={() => setShowCur((s) => !s)}
                  aria-label={showCur ? "Hide password" : "Show password"}
                >
                  {showCur ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="new-pw">New password</Label>
              <div className="relative mt-1">
                <Input
                  id="new-pw"
                  type={showNew ? "text" : "password"}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className="pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-warm-gray"
                  onClick={() => setShowNew((s) => !s)}
                  aria-label={showNew ? "Hide password" : "Show password"}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {pwFieldErrors.new && (
                <p className="mt-1 text-sm text-red-600">{pwFieldErrors.new}</p>
              )}
            </div>
            <div>
              <Label htmlFor="cf-pw">Confirm new password</Label>
              <div className="relative mt-1">
                <Input
                  id="cf-pw"
                  type={showCf ? "text" : "password"}
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  className="pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-warm-gray"
                  onClick={() => setShowCf((s) => !s)}
                  aria-label={showCf ? "Hide password" : "Show password"}
                >
                  {showCf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {pwFieldErrors.confirm && (
                <p className="mt-1 text-sm text-red-600">{pwFieldErrors.confirm}</p>
              )}
            </div>
            <Button
              type="button"
              className="bg-[#2D4A3E] text-cream hover:bg-[#1E3329]"
              disabled={pwSaving}
              onClick={() => void onChangePassword()}
            >
              {pwSaving ? "Updating…" : "Update password"}
            </Button>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-[#1C1C1C]/10 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-charcoal">Active sessions</h2>
        <ul className="mt-4 space-y-2 text-sm text-warm-gray">
          <li className="rounded-lg bg-[#FAF8F5] px-4 py-3 text-charcoal">
            <span className="font-medium text-[#2D4A3E]">Current session</span> —{" "}
            {roughSessionLabel()} — Active now
          </li>
        </ul>
        <p className="mt-4 text-sm text-warm-gray">
          To sign out of all devices, sign out and sign back in on each device you&apos;ve used.
        </p>
      </section>

      <section className="rounded-xl border-2 border-red-200 bg-red-50/40 p-6">
        <h2 className="font-semibold text-red-900">Delete account</h2>
        <p className="mt-2 text-sm text-red-900/80">
          Permanently delete your account and personal data from our systems. Your order history
          will be retained for our records.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4 border-red-300 text-red-800 hover:bg-red-100"
          onClick={() => {
            setDeleteConfirm("");
            setDeleteOpen(true);
          }}
        >
          Delete my account
        </Button>
      </section>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete account?</DialogTitle>
            <DialogDescription>
              This cannot be undone. Type <strong>DELETE</strong> to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="DELETE"
            className="font-mono"
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={deleteConfirm !== "DELETE" || deleting}
              onClick={() => void onDeleteAccount()}
            >
              {deleting ? "Deleting…" : "Confirm delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
