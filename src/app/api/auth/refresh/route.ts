import { NextRequest, NextResponse } from "next/server";
import { getRefreshToken, setAuthCookies } from "@/lib/cookies";
import {
    verifyRefreshToken,
    generateAccessToken,
    generateRefreshToken,
    revokeRefreshToken,
} from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

// Prevent static generation - this route uses Prisma
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        const refreshToken = await getRefreshToken();

        if (!refreshToken) {
            return NextResponse.json(
                { error: "No refresh token" },
                { status: 401 }
            );
        }

        // Verify refresh token
        const payload = await verifyRefreshToken(refreshToken);

        if (!payload || !payload.jti) {
            return NextResponse.json(
                { error: "Invalid refresh token" },
                { status: 401 }
            );
        }

        // Get user
        const user = await prisma.user.findUnique({
            where: { id: payload.sub },
        });

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 401 }
            );
        }

        // Revoke old refresh token
        await revokeRefreshToken(payload.jti);

        // Generate new tokens (token rotation)
        const newAccessToken = await generateAccessToken({
            sub: user.id,
            email: user.email ?? undefined,
            username: user.username ?? undefined,
            name: user.name ?? undefined,
        });

        const newRefreshToken = await generateRefreshToken(user.id);

        // Set new cookies
        await setAuthCookies(newAccessToken, newRefreshToken);

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                name: user.name,
            },
        });

    } catch (error) {
        console.error("Token refresh error:", error);
        return NextResponse.json(
            { error: "Failed to refresh token" },
            { status: 500 }
        );
    }
}
