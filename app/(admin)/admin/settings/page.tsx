"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";

type AllowedKey =
  | "united_email"
  | "united_password"
  | "united_csv_url"
  | "nfd_email"
  | "nfd_password"
  | "nfd_csv_url";

type SettingRow = {
  key: AllowedKey;
  label: string;
  hasValue: boolean;
  updated_at: string | null;
  updated_by: string | null;
};

type FieldConfig = {
  key: AllowedKey;
  label: string;
  inputType: "email" | "password" | "url";
};

const UNITED_FIELDS: FieldConfig[] = [
  { key: "united_email", label: "Email", inputType: "email" },
  { key: "united_password", label: "Password", inputType: "password" },
  { key: "united_csv_url", label: "CSV Download URL", inputType: "url" },
];

const NFD_FIELDS: FieldConfig[] = [
  { key: "nfd_email", label: "Email", inputType: "email" },
  { key: "nfd_password", label: "Password", inputType: "password" },
  { key: "nfd_csv_url", label: "CSV Download URL", inputType: "url" },
];

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<AllowedKey, SettingRow | null>>({
    united_email: null,
    united_password: null,
    united_csv_url: null,
    nfd_email: null,
    nfd_password: null,
    nfd_csv_url: null,
  });
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<AllowedKey | null>(null);
  const [formValue, setFormValue] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const activeFieldType = useMemo(() => {
    if (!editingKey) return null;
    const all = [...UNITED_FIELDS, ...NFD_FIELDS];
    return all.find((f) => f.key === editingKey)?.inputType ?? null;
  }, [editingKey]);

  async function fetchSettings() {
    const res = await fetch("/api/admin/settings", { cache: "no-store" });
    if (!res.ok) {
      throw new Error("Failed to load settings");
    }

    const data = (await res.json()) as SettingRow[];
    const next: Record<AllowedKey, SettingRow | null> = {
      united_email: null,
      united_password: null,
      united_csv_url: null,
      nfd_email: null,
      nfd_password: null,
      nfd_csv_url: null,
    };

    for (const row of data) {
      if (row.key in next) {
        next[row.key] = row;
      }
    }
    setSettings(next);
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await fetchSettings();
      } catch {
        if (mounted) {
          toast({
            variant: "destructive",
            title: "Could not load settings",
            description: "Please refresh and try again.",
          });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [toast]);

  function formatUpdated(updatedAt: string | null, updatedBy: string | null) {
    if (!updatedBy) return null;
    const formatted = updatedAt
      ? new Date(updatedAt).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "unknown date";
    return `Last updated ${formatted} by ${updatedBy}`;
  }

  function startEditing(key: AllowedKey) {
    setEditingKey(key);
    setFormValue("");
    setShowPassword(false);
  }

  function cancelEditing() {
    setEditingKey(null);
    setFormValue("");
    setShowPassword(false);
  }

  async function saveSetting() {
    if (!editingKey) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: editingKey, value: formValue }),
      });

      if (!res.ok) {
        throw new Error("Save failed");
      }

      toast({
        title: "Setting updated",
        description: "Supplier credential saved successfully.",
      });
      await fetchSettings();
      cancelEditing();
    } catch {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "Please check the value and try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  function renderField(field: FieldConfig) {
    const row = settings[field.key];
    const configured = !!row?.hasValue;
    const isEditing = editingKey === field.key;
    const helperText = formatUpdated(row?.updated_at ?? null, row?.updated_by ?? null);
    const inputType =
      field.inputType === "password" ? (showPassword ? "text" : "password") : field.inputType;

    return (
      <div key={field.key} className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Label className="text-sm font-medium text-charcoal">{field.label}</Label>
              <Badge
                className={
                  configured
                    ? "border-transparent bg-[#2D4A3E] text-[#FAF8F5]"
                    : "border-transparent bg-[#D97706] text-white"
                }
              >
                {configured ? "✓ Configured" : "Not set"}
              </Badge>
            </div>
            {helperText && <p className="text-xs text-gray-500">{helperText}</p>}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => startEditing(field.key)}
            disabled={saving}
          >
            Edit
          </Button>
        </div>

        {isEditing && (
          <div className="mt-4 rounded-md border border-gray-200 bg-[#FAF8F5] p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Input
                  type={inputType}
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  placeholder={`Enter new ${field.label.toLowerCase()}`}
                  className={field.inputType === "password" ? "pr-10" : ""}
                />
                {field.inputType === "password" && (
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 hover:text-charcoal"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  className="bg-[#2D4A3E] text-[#FAF8F5] hover:bg-[#1E3329]"
                  onClick={saveSetting}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save
                </Button>
                <Button type="button" variant="outline" onClick={cancelEditing} disabled={saving}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-charcoal">Supplier Credentials</h1>
        <p className="mt-2 text-sm text-gray-600">
          Credentials are encrypted at rest. Values are write-only — enter a new value to update.
        </p>
      </div>

      <div className="space-y-6 rounded-xl border border-gray-200 bg-[#FAF8F5] p-6">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-[#1C1C1C]">United Furniture</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">{UNITED_FIELDS.map(renderField)}</CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-[#1C1C1C]">Nationwide FD</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">{NFD_FIELDS.map(renderField)}</CardContent>
        </Card>

        {loading && <p className="text-sm text-gray-500">Loading current status...</p>}
      </div>
    </div>
  );
}
