/**
 * Cookie utilities for SSO
 * Sets cookies on .entro.ly domain for cross-subdomain access
 */

import { cookies } from "next/headers";

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    domain: process.env.NODE_ENV === "production" ? ".entro.ly" : undefined,
};

export const ACCESS_TOKEN_COOKIE = "sso_access_token";
export const REFRESH_TOKEN_COOKIE = "sso_refresh_token";

/**
 * Set auth cookies after successful login
 */
export async function setAuthCookies(
    accessToken: string,
    refreshToken: string
): Promise<void> {
    const cookieStore = await cookies();

    // Access token - 3 days
    cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: 3 * 24 * 60 * 60, // 3 days
    });

    // Refresh token - 7 days
    cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: 7 * 24 * 60 * 60, // 7 days
    });
}

/**
 * Clear auth cookies on logout
 * Must set the same domain/path as when created to properly delete
 */
export async function clearAuthCookies(): Promise<void> {
    const cookieStore = await cookies();

    // Must use set with maxAge=0 and same options to properly clear domain cookies
    cookieStore.set(ACCESS_TOKEN_COOKIE, "", {
        ...COOKIE_OPTIONS,
        maxAge: 0,
    });

    cookieStore.set(REFRESH_TOKEN_COOKIE, "", {
        ...COOKIE_OPTIONS,
        maxAge: 0,
    });
}

/**
 * Get access token from cookie
 */
export async function getAccessToken(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
}

/**
 * Get refresh token from cookie
 */
export async function getRefreshToken(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get(REFRESH_TOKEN_COOKIE)?.value ?? null;
}
