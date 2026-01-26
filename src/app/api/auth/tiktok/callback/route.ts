import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateAccessToken, generateRefreshToken } from "@/lib/jwt";
import { setAuthCookies } from "@/lib/cookies";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error || !code) {
        return NextResponse.redirect(new URL("/login?error=TikTok login failed", request.url));
    }

    try {
        const clientKey = process.env.TIKTOK_CLIENT_KEY;
        const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
        const redirectUri = `${process.env.NEXT_PUBLIC_SSO_URL || "https://sso.entro.ly"}/api/auth/tiktok/callback`;

        // Exchange code for access token
        const tokenResponse = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Cache-Control": "no-cache",
            },
            body: new URLSearchParams({
                client_key: clientKey!,
                client_secret: clientSecret!,
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

        // Fetch user info
        const userInfoResponse = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name", {
            headers: {
                "Authorization": `Bearer ${accessToken}`,
            },
        });

        const userInfoData = await userInfoResponse.json();

        if (userInfoData.error) {
            console.error("TikTok user info error:", userInfoData);
            throw new Error(userInfoData.error.message || "Failed to get user info");
        }

        const tiktokUser = userInfoData.data.user;

        // DB Transaction: Find or create user
        const user = await prisma.$transaction(async (tx) => {
            // 1. Check if account already exists
            const existingAccount = await tx.account.findUnique({
                where: {
                    provider_providerAccountId: {
                        provider: "tiktok",
                        providerAccountId: openId,
                    },
                },
                include: { user: true },
            });

            if (existingAccount) {
                return existingAccount.user;
            }

            // 2. If not, create new user and account
            // First check if a user with this username already exists (fallback for safety)
            let username = tiktokUser.display_name.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 20);
            const userExists = await tx.user.findUnique({ where: { username } });

            if (userExists) {
                username = `${username}${Math.floor(Math.random() * 1000)}`;
            }

            const newUser = await tx.user.create({
                data: {
                    username,
                    name: tiktokUser.display_name,
                    image: tiktokUser.avatar_url,
                    accounts: {
                        create: {
                            type: "oauth",
                            provider: "tiktok",
                            providerAccountId: openId,
                            access_token: accessToken,
                            // refresh_token: tokenData.refresh_token, // TikTok refresh tokens might be different, store if needed
                            expires_at: Math.floor(Date.now() / 1000) + tokenData.expires_in,
                            scope: tokenData.scope,
                            token_type: "Bearer",
                        },
                    },
                },
            });

            // Create default profile for new user
            await tx.profile.create({
                data: {
                    username: newUser.username!,
                    displayName: newUser.name!,
                    avatarUrl: newUser.image,
                    userId: newUser.id,
                }
            });

            return newUser;
        });

        // Generate Session Tokens
        const ssoAccessToken = await generateAccessToken({
            sub: user.id,
            email: user.email ?? undefined,
            username: user.username ?? undefined,
            name: user.name ?? undefined,
        });

        const ssoRefreshToken = await generateRefreshToken(user.id);

        // Set cookies
        await setAuthCookies(ssoAccessToken, ssoRefreshToken);

        // Redirect to dashboard
        return NextResponse.redirect(new URL("/dashboard", request.url));

    } catch (err) {
        console.error("TikTok Auth Error:", err);
        return NextResponse.redirect(new URL("/login?error=Authentication failed", request.url));
    }
}
