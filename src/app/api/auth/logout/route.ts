import { NextRequest, NextResponse } from "next/server";
import { getRefreshToken, clearAuthCookies } from "@/lib/cookies";
import { verifyRefreshToken, revokeRefreshToken } from "@/lib/jwt";

// Prevent static generation - this route uses JWT with Prisma
export const dynamic = "force-dynamic";

// GET handler for logout with redirect (used by other apps)
export async function GET(request: NextRequest) {
    const callbackUrl = request.nextUrl.searchParams.get("callbackUrl") || "https://entro.ly";

    try {
        const refreshToken = await getRefreshToken();
        if (refreshToken) {
            const payload = await verifyRefreshToken(refreshToken);
            if (payload?.jti) {
                await revokeRefreshToken(payload.jti);
            }
        }
    } catch (error) {
        console.error("Logout revocation error:", error);
    }

    // Clear cookies
    await clearAuthCookies();

    // Redirect to callback URL
    return NextResponse.redirect(callbackUrl);
}

export async function POST(request: NextRequest) {
    try {
        const refreshToken = await getRefreshToken();

        if (refreshToken) {
            // Verify and revoke the refresh token
            const payload = await verifyRefreshToken(refreshToken);
            if (payload?.jti) {
                await revokeRefreshToken(payload.jti);
            }
        }

        // Clear cookies
        await clearAuthCookies();

        // Redirect to sso.entro.ly
        return NextResponse.redirect("https://sso.entro.ly");

    } catch (error) {
        console.error("Logout error:", error);
        // Still clear cookies even if revocation fails
        await clearAuthCookies();

        return NextResponse.redirect("https://sso.entro.ly");
    }
}

