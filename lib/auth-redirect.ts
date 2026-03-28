/**
 * OAuth callback must only redirect to same-origin paths (open-redirect safe).
 */
export function safeAuthRedirectPath(next: string | null | undefined): string {
  if (!next || typeof next !== "string") return "/account";
  const trimmed = next.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/account";
  return trimmed;
}
