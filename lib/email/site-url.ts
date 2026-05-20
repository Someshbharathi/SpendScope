/**
 * Canonical public origin (emails, server routes without a Request).
 * Prefer NEXT_PUBLIC_APP_URL in production.
 */
export function getPublicAppOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "").trim();
  if (configured) return configured;
  return "http://localhost:3000";
}

/**
 * Public site origin for links in transactional emails.
 * Prefer NEXT_PUBLIC_APP_URL in production so links match your canonical domain.
 */
export function getPublicOriginFromRequest(req: Request): string {
  const configured = getPublicAppOrigin();
  if (process.env.NEXT_PUBLIC_APP_URL?.trim()) return configured;

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const proto =
    req.headers.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  if (host) return `${proto}://${host}`;

  return "http://localhost:3000";
}
