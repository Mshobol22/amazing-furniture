import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const hex = process.env.SETTINGS_ENCRYPTION_KEY ?? "";
  if (!hex || hex.length !== 64) {
    throw new Error("SETTINGS_ENCRYPTION_KEY must be 64 hex chars");
  }
  return Buffer.from(hex, "hex");
}

export function encrypt(plaintext: string): string {
  if (!plaintext) return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return iv.toString("hex") + tag.toString("hex") + encrypted.toString("hex");
}

export function decrypt(ciphertext: string): string {
  if (!ciphertext) return "";
  try {
    const iv = Buffer.from(ciphertext.slice(0, 24), "hex");
    const tag = Buffer.from(ciphertext.slice(24, 56), "hex");
    const encrypted = Buffer.from(ciphertext.slice(56), "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted).toString("utf8") + decipher.final("utf8");
  } catch {
    return "";
  }
}

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function getSetting(key: string): Promise<string | null> {
  const { data } = await serviceClient()
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .single();

  if (!data?.value) return null;
  return decrypt(data.value);
}

export async function setSetting(key: string, value: string, updatedBy: string): Promise<void> {
  await serviceClient()
    .from("app_settings")
    .update({
      value: encrypt(value),
      updated_at: new Date().toISOString(),
      updated_by: updatedBy,
    })
    .eq("key", key);
}

export async function getAllSettingsMasked() {
  const { data } = await serviceClient()
    .from("app_settings")
    .select("key, label, value, updated_at, updated_by")
    .order("key");

  return (data ?? []).map((row) => ({
    key: row.key,
    label: row.label as string,
    hasValue: !!row.value,
    updated_at: row.updated_at as string | null,
    updated_by: row.updated_by as string | null,
  }));
}
