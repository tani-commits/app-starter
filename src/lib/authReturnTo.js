// Same-origin return path only. Login and register use this so a crafted
// returnTo (or from_url) cannot send the browser off-site after auth.
export function safeReturnTo() {
  if (typeof window === "undefined") return "/";
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("returnTo") || "/";
  if (typeof raw !== "string") return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  if (raw.includes("://") || raw.includes("\\")) return "/";
  return raw;
}
