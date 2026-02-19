import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateAccessToken, generateRefreshToken } from "@/lib/jwt";
import { setAuthCookies } from "@/lib/cookies";

const STATE_COOKIE = "tiktok_oauth_state";
const REDIRECT_COOKIE = "tiktok_oauth_redirect";

function clearOAuthCookies(res: NextResponse) {
    res.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
    res.cookies.set(REDIRECT_COOKIE, "", { path: "/", maxAge: 0 });
}

/**
 * Shared TikTok OAuth callback handler. redirectUri must match the value
 * sent to TikTok in the authorize request (same as in Login Kit config).
 */
export async function handleTiktokCallback(
    request: NextRequest,
    redirectUri: string
): Promise<NextResponse> {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    const stateFromTiktok = searchParams.get("state");

    const stateFromCookie = request.cookies.get(STATE_COOKIE)?.value;
    const redirectTo = request.cookies.get(REDIRECT_COOKIE)?.value || "/";

    if (error || !code) {
        // Log so we can see TikTok's reason (e.g. redirect_uri mismatch)
        console.error("TikTok callback error:", { error, error_description: errorDescription, hasCode: !!code, url: request.url });
        const msg = errorDescription ? encodeURIComponent(errorDescription) : "TikTok+login+failed";
        const res = NextResponse.redirect(new URL(`/login?error=${msg}`, request.url));
        clearOAuthCookies(res);
        return res;
    }

    if (!stateFromCookie || stateFromCookie !== stateFromTiktok) {
        const res = NextResponse.redirect(new URL("/login?error=Invalid+state", request.url));
        clearOAuthCookies(res);
        return res;
    }

    try {
        const rawKey = process.env.TIKTOK_CLIENT_KEY;
        const rawSecret = process.env.TIKTOK_CLIENT_SECRET;
        const clientKey = typeof rawKey === "string" ? rawKey.trim() : "";
        const clientSecret = typeof rawSecret === "string" ? rawSecret.trim() : "";

        if (!clientKey || !clientSecret || /\s/.test(clientKey) || /\s/.test(clientSecret)) {
            throw new Error("TikTok client key or secret not configured or invalid (no spaces)");
        }

        const tokenResponse = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Cache-Control": "no-cache",
            },
            body: new URLSearchParams({
                client_key: clientKey,
                client_secret: clientSecret,
                code,
                grant_type: "authorization_code",
                redirect_uri: redirectUri,
            }),
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            console.error("TikTok token error:", tokenData);
            throw new Error(tokenData.error_description || "Failed to get access token");
        }

        const accessToken = tokenData.access_token;
        const openId = tokenData.open_id;

        const userInfoResponse = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name", {
            headers: { "Authorization": `Bearer ${accessToken}` },
        });

        const userInfoData = await userInfoResponse.json();

        if (userInfoData.error?.code && userInfoData.error.code !== "ok") {
            console.error("TikTok user info error:", userInfoData);
            throw new Error(userInfoData.error.message || "Failed to get user info");
        }
        if (!userInfoData.data?.user) {
            console.error("TikTok user info missing data.user:", userInfoData);
            throw new Error("Failed to get user info");
        }

        const tiktokUser = userInfoData.data.user;

        const user = await prisma.$transaction(async (tx) => {
            const existingAccount = await tx.account.findUnique({
                where: {
                    provider_providerAccountId: {
                        provider: "tiktok",
                        providerAccountId: openId,
                    },
                },
                include: { user: true },
            });

            if (existingAccount) return existingAccount.user;

            const displayName = tiktokUser.display_name || `user_${openId.slice(0, 8)}`;
            let username = displayName.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 20) || "tiktokuser";
            const userExists = await tx.user.findUnique({ where: { username } });
            if (userExists) {
                username = `${username}${Math.floor(Math.random() * 1000)}`;
            }

            const newUser = await tx.user.create({
                data: {
                    username,
                    name: displayName,
                    image: tiktokUser.avatar_url ?? null,
                    accounts: {
                        create: {
                            type: "oauth",
                            provider: "tiktok",
                            providerAccountId: openId,
                            access_token: accessToken,
                            refresh_token: tokenData.refresh_token ?? null,
                            expires_at: Math.floor(Date.now() / 1000) + (tokenData.expires_in ?? 86400),
                            scope: tokenData.scope ?? "",
                            token_type: "Bearer",
                        },
                    },
                },
            });

            await tx.profile.create({
                data: {
                    username: newUser.username!,
                    displayName: newUser.name!,
                    avatarUrl: newUser.image,
                    userId: newUser.id,
                },
            });

            return newUser;
        });

        const ssoAccessToken = await generateAccessToken({
            sub: user.id,
            email: user.email ?? undefined,
            username: user.username ?? undefined,
            name: user.name ?? undefined,
        });

        const ssoRefreshToken = await generateRefreshToken(user.id);
        await setAuthCookies(ssoAccessToken, ssoRefreshToken);

        const origin = new URL(request.url).origin;
        const targetPath = redirectTo.startsWith("http") ? redirectTo : `${origin}${redirectTo.startsWith("/") ? redirectTo : "/" + redirectTo}`;
        const res = NextResponse.redirect(targetPath);
        clearOAuthCookies(res);
        return res;
    } catch (err) {
        console.error("TikTok Auth Error:", err);
        const res = NextResponse.redirect(new URL("/login?error=Authentication failed", request.url));
        clearOAuthCookies(res);
        return res;
    }
}
