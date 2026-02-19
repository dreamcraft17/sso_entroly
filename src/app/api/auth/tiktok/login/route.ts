import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getTiktokRedirectUri } from "@/lib/tiktok-redirect-uri";

export const dynamic = "force-dynamic";

const STATE_COOKIE = "tiktok_oauth_state";
const REDIRECT_COOKIE = "tiktok_oauth_redirect";
// TikTok doc: "session token" – 60s is enough; match state on callback
const STATE_COOKIE_MAX_AGE_MS = 60_000;

const AUTHORIZE_URL = "https://www.tiktok.com/v2/auth/authorize/";

export async function GET(request: NextRequest) {
    const rawKey = process.env.TIKTOK_CLIENT_KEY;
    const clientKey = typeof rawKey === "string" ? rawKey.trim() : "";
    const redirectUri = getTiktokRedirectUri();

    if (!clientKey || clientKey.length < 10) {
        console.error("TikTok: TIKTOK_CLIENT_KEY missing or invalid (check .env)");
        return NextResponse.redirect(new URL("/login?error=TikTok+not+configured", request.url));
    }
    // TikTok rejects keys with spaces/newlines – catch env copy-paste issues
    if (/\s/.test(clientKey)) {
        console.error("TikTok: TIKTOK_CLIENT_KEY must not contain spaces or newlines");
        return NextResponse.redirect(new URL("/login?error=TikTok+bad+client+key", request.url));
    }

    // Redirect URI must be registered in TikTok Developer Portal (Login Kit).
    // Doc: absolute URI, https (or http for localhost/127.0.0.1 in dev).
    if (process.env.NODE_ENV === "production" && !redirectUri.startsWith("https://")) {
        console.error("TikTok: redirect_uri must be HTTPS in production");
        return NextResponse.redirect(new URL("/login?error=TikTok+config+error", request.url));
    }

    // Redirect after OAuth (from login page ?redirect=)
    const redirectAfter = request.nextUrl.searchParams.get("redirect") || "/";

    // Anti-forgery state token (TikTok: "unique session token", match on callback)
    const state = randomBytes(32).toString("base64url");

    // Scopes: comma-separated; user.info.basic for display name, avatar
    const scope = "user.info.basic";
    // disable_auto_auth: 0 = skip consent if valid session, 1 = always show
    const disable_auto_auth = "0";

    const params = new URLSearchParams({
        client_key: clientKey,
        response_type: "code",
        scope,
        redirect_uri: redirectUri,
        state,
        disable_auto_auth,
    });
    const url = `${AUTHORIZE_URL}?${params.toString()}`;

    const res = NextResponse.redirect(url);
    res.cookies.set(STATE_COOKIE, state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: Math.floor(STATE_COOKIE_MAX_AGE_MS / 1000),
    });
    res.cookies.set(REDIRECT_COOKIE, redirectAfter, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: Math.floor(STATE_COOKIE_MAX_AGE_MS / 1000),
    });
    return res;
}
