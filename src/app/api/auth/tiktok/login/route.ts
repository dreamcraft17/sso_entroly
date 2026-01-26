import { redirect } from "next/navigation";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    const redirectUri = `${process.env.NEXT_PUBLIC_SSO_URL || "https://sso.entro.ly"}/api/auth/tiktok/callback`;

    // Generate random state for security
    const state = Math.random().toString(36).substring(7);

    // Scopes needed for basic profile info
    const scope = "user.info.basic";

    const url = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&scope=${scope}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

    redirect(url);
}
