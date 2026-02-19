import { NextRequest, NextResponse } from "next/server";
import { getTiktokRedirectUri } from "@/lib/tiktok-redirect-uri";
import { handleTiktokCallback } from "@/lib/tiktok-callback-handler";

export const dynamic = "force-dynamic";

/**
 * TikTok OAuth callback at /auth/tiktok/callback.
 * Use when TikTok Login Kit Redirect URI is e.g. https://entro.ly/auth/tiktok/callback.
 * Set TIKTOK_REDIRECT_URI=https://entro.ly/auth/tiktok/callback in env.
 */
export async function GET(request: NextRequest) {
    const redirectUri = getTiktokRedirectUri();
    return handleTiktokCallback(request, redirectUri);
}
