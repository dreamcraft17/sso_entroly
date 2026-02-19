/**
 * TikTok OAuth redirect_uri – must match exactly what is registered in TikTok Developer Portal (Login Kit).
 * Set TIKTOK_REDIRECT_URI to use e.g. https://entro.ly/auth/tiktok/callback;
 * otherwise uses NEXT_PUBLIC_SSO_URL + /api/auth/tiktok/callback.
 */
export function getTiktokRedirectUri(): string {
    const custom = process.env.TIKTOK_REDIRECT_URI?.trim();
    if (custom) return custom.replace(/\/$/, "");
    const baseUrl = (process.env.NEXT_PUBLIC_SSO_URL || "https://sso.entro.ly").trim().replace(/\/$/, "");
    return `${baseUrl}/api/auth/tiktok/callback`;
}
